import PubNub from 'pubnub'

import {
  connectionStepLog,
  rtcDebugLog,
  rtcFailureLog,
  signalPayloadSummary,
} from '@/lib/debug/rtcDebugLog'

import type { PartySignalingTransport } from './PartySignalingTransport'
import type { PeerInfo, SignalPayload, SignalingRole } from './protocol'
import { isServerToClientMessage } from './protocol'

type PubNubPublishMessage = Parameters<InstanceType<typeof PubNub>['publish']>[0]['message']

export type PubNubSignalingClientOptions = {
  publishKey: string
  subscribeKey: string
}

/** PubNub userId must be alphanumeric, up to 64 chars (SDK constraint). */
function toPubNubUserId(clientId: string): string {
  return clientId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 64)
}

/** PubNub `Payload` typing is stricter than our JSON envelope; round-trip for publish. */
function toPubNubMessage(message: unknown): PubNubPublishMessage {
  return JSON.parse(JSON.stringify(message)) as PubNubPublishMessage
}

const PUBNUB_403_HINT =
  'PubNub returned 403 (forbidden). Use Publish + Subscribe keys from the same keyset in the PubNub Admin Portal. For local dev, disable Access Manager on that keyset, or grant subscribe/publish to your channels.'

const PUBNUB_400_HINT =
  'PubNub returned 400 (bad request) on subscribe or publish. Usually wrong/mismatched Subscribe vs Publish keys, a restricted keyset, or Access Manager blocking the channel. Use keys from the same PubNub app keyset.'

const PUBNUB_JOIN_TIMEOUT_HINT =
  'PubNub never confirmed the subscription. Check browser network tab for subscribe errors, verify keys match one keyset, and try disabling Access Manager for dev.'

const PUBNUB_PUBLISH_PEER_HINT =
  'PubNub publish failed (often 403/400). Peers cannot discover each other until publish works. Fix keys / Access Manager / channel permissions.'

/** PubNub may attach `errorData.status` at runtime; typings omit it on `StatusEvent`. */
function httpStatusFromPubNubStatus(statusEvent: PubNub.StatusEvent): number | undefined {
  const o = statusEvent as unknown as Record<string, unknown>
  const top = o.statusCode
  if (typeof top === 'number') {
    return top
  }
  const ed = o.errorData
  if (ed && typeof ed === 'object' && ed !== null && 'status' in ed) {
    const s = (ed as { status: unknown }).status
    if (typeof s === 'number') {
      return s
    }
  }
  return undefined
}

function pubnubJoinFatalMessage(category: string, httpStatus: number | undefined): string | null {
  const cat = PubNub.CATEGORIES
  if (category === cat.PNAccessDeniedCategory || httpStatus === 403) {
    return PUBNUB_403_HINT
  }
  if (
    category === cat.PNBadRequestCategory ||
    category === cat.PNValidationErrorCategory ||
    httpStatus === 400
  ) {
    return PUBNUB_400_HINT
  }
  if (category === cat.PNServerErrorCategory || (typeof httpStatus === 'number' && httpStatus >= 500)) {
    return 'PubNub server error during subscribe. Retry later or check PubNub status.'
  }
  return null
}

type YoochogPeerMessage = {
  type: 'yoochog-peer'
  room: string
  clientId: string
  role: SignalingRole
}

type YoochogRequestHostMessage = {
  type: 'yoochog-request-host'
  room: string
  clientId: string
}

/**
 * Pub/Sub signaling on one channel per party (`room` = ADR `yoochog:party:<sessionId>`).
 * Uses directed `signal` messages (`to` = recipient clientId) and `yoochog-peer` for discovery.
 */
export class PubNubSignalingClient implements PartySignalingTransport {
  private pubnub: PubNub | null = null
  private room: string | null = null
  private clientId: string | null = null
  private role: SignalingRole | null = null

  joinedPeers: PeerInfo[] = []
  private readonly seenPeerIds = new Set<string>()
  private readonly peerJoinedListeners = new Set<(peer: PeerInfo) => void>()

  onSignal: ((msg: { from: string; payload: SignalPayload }) => void) | null = null
  onPeerLeft: ((clientId: string) => void) | null = null

  private pendingJoin: { resolve: () => void; reject: (e: Error) => void } | null = null
  /** Rejects join if PubNub never reports a healthy subscription + publish. */
  private joinTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  private requestHostInterval: ReturnType<typeof setInterval> | null = null

  constructor(private readonly options: PubNubSignalingClientOptions) {}

  private clearJoinTimeoutTimer(): void {
    if (this.joinTimeoutTimer !== null) {
      globalThis.clearTimeout(this.joinTimeoutTimer)
      this.joinTimeoutTimer = null
    }
  }

  private cleanupPubNubAfterFailedJoin(): void {
    this.stopRequestHostLoop()
    this.clearJoinTimeoutTimer()
    try {
      this.pubnub?.unsubscribeAll()
      this.pubnub?.destroy()
    } catch {
      // ignore
    }
    this.pubnub = null
  }

  /**
   * After subscribe succeeds, prove we can publish (peer discovery depends on it).
   * Avoids the old 2s "fake OK" when subscribe long-poll returns 400/403 afterward.
   */
  private async completeJoinAfterSubscribe(): Promise<void> {
    if (!this.pendingJoin) {
      return
    }
    this.clearJoinTimeoutTimer()

    const handlers = this.pendingJoin
    this.pendingJoin = null

    if (!this.pubnub || !this.room || !this.clientId || !this.role) {
      handlers.reject(new Error('PubNub join state lost.'))
      return
    }

    const msg: YoochogPeerMessage = {
      type: 'yoochog-peer',
      room: this.room,
      clientId: this.clientId,
      role: this.role,
    }
    try {
      await this.pubnub.publish({ channel: this.room, message: toPubNubMessage(msg) })
    } catch (e) {
      connectionStepLog('signaling', 'PubNub:join:announcePublish:failed', e)
      rtcFailureLog('signaling', 'PubNub join: peer announcement publish failed', e)
      handlers.reject(new Error(PUBNUB_PUBLISH_PEER_HINT))
      this.cleanupPubNubAfterFailedJoin()
      return
    }

    connectionStepLog('signaling', 'PubNub:join:ok', {
      room: this.room,
      role: this.role,
      peersSnapshot: this.joinedPeers.length,
    })
    rtcDebugLog('signaling', 'PubNub join OK', {
      room: this.room,
      role: this.role,
      peersSnapshot: this.joinedPeers.length,
    })
    handlers.resolve()

    if (this.role === 'guest') {
      this.startRequestHostLoop()
    }
  }

  subscribePeerJoined(handler: (peer: PeerInfo) => void): () => void {
    this.peerJoinedListeners.add(handler)
    return () => {
      this.peerJoinedListeners.delete(handler)
    }
  }

  async connect(): Promise<void> {
    connectionStepLog('signaling', 'PubNub:connect', '(no-op; join initializes SDK)')
    rtcDebugLog('signaling', 'PubNub connect() (no-op; join initializes SDK)')
    return Promise.resolve()
  }

  async join(room: string, clientId: string, role: SignalingRole): Promise<void> {
    this.room = room
    this.clientId = clientId
    this.role = role
    this.joinedPeers = []
    this.seenPeerIds.clear()

    const userId = toPubNubUserId(clientId)
    if (userId.length < 1) {
      rtcFailureLog('signaling', 'PubNub join rejected: empty userId from clientId', clientId)
      rtcDebugLog('signaling', 'PubNub join rejected: empty userId from clientId')
      return Promise.reject(new Error('Invalid client id for PubNub userId.'))
    }

    connectionStepLog('signaling', 'PubNub:join:start', { room, role, clientId, userId })
    rtcDebugLog('signaling', 'PubNub join start', { room, role, clientId, userId })

    this.pubnub = new PubNub({
      publishKey: this.options.publishKey,
      subscribeKey: this.options.subscribeKey,
      userId,
    })

    return new Promise((resolve, reject) => {
      this.pendingJoin = { resolve, reject }

      this.pubnub!.addListener({
        status: (statusEvent) => {
          const httpStatus = httpStatusFromPubNubStatus(statusEvent)
          const fatalMsg = pubnubJoinFatalMessage(statusEvent.category, httpStatus)
          if (fatalMsg && this.pendingJoin) {
            this.clearJoinTimeoutTimer()
            connectionStepLog('signaling', 'PubNub:join:fatal', {
              category: statusEvent.category,
              httpStatus,
            })
            rtcFailureLog('signaling', 'PubNub join failed (fatal status)', {
              category: statusEvent.category,
              httpStatus,
            })
            const { reject: rej } = this.pendingJoin
            this.pendingJoin = null
            rej(new Error(fatalMsg))
            this.cleanupPubNubAfterFailedJoin()
            return
          }

          const cat = PubNub.CATEGORIES
          const subscriptionReady =
            statusEvent.category === cat.PNSubscriptionChangedCategory ||
            statusEvent.category === cat.PNConnectedCategory

          if (subscriptionReady && this.pendingJoin) {
            rtcDebugLog(
              'signaling',
              'PubNub subscription status → completing join',
              statusEvent.category,
            )
            void this.completeJoinAfterSubscribe()
          }
        },
        message: (evt) => {
          this.handleIncoming(evt.message as unknown)
        },
      })

      this.pubnub!.subscribe({ channels: [room] })
      connectionStepLog('signaling', 'PubNub:subscribe', { channels: [room] })
      rtcDebugLog('signaling', 'PubNub subscribe', { channels: [room] })

      this.joinTimeoutTimer = globalThis.setTimeout(() => {
        this.joinTimeoutTimer = null
        if (!this.pendingJoin) {
          return
        }
        connectionStepLog('signaling', 'PubNub:join:timeout', 'no subscription confirmation + publish')
        rtcFailureLog('signaling', 'PubNub join timed out waiting for subscription')
        const { reject: rej } = this.pendingJoin
        this.pendingJoin = null
        rej(new Error(PUBNUB_JOIN_TIMEOUT_HINT))
        this.cleanupPubNubAfterFailedJoin()
      }, 20_000)
    })
  }

  private publishPeerAnnouncement(): void {
    if (!this.pubnub || !this.room || !this.clientId || !this.role) {
      return
    }
    const msg: YoochogPeerMessage = {
      type: 'yoochog-peer',
      room: this.room,
      clientId: this.clientId,
      role: this.role,
    }
    void this.pubnub
      .publish({ channel: this.room, message: toPubNubMessage(msg) })
      .catch(() => {
        rtcFailureLog('signaling', 'PubNub publish yoochog-peer failed (403 / network)')
        rtcDebugLog('signaling', 'PubNub publish yoochog-peer failed (403 / network)')
        /* 403 etc. — user should fix keyset / Access Manager; avoid unhandled rejection noise */
      })
  }

  /** Guest may subscribe after the host announced; periodically ask the host to re-announce. */
  private startRequestHostLoop(): void {
    this.stopRequestHostLoop()
    const publish = () => {
      if (!this.pubnub || !this.room || !this.clientId) {
        return
      }
      const msg: YoochogRequestHostMessage = {
        type: 'yoochog-request-host',
        room: this.room,
        clientId: this.clientId,
      }
      void this.pubnub.publish({ channel: this.room, message: toPubNubMessage(msg) }).catch(() => {
        rtcFailureLog('signaling', 'PubNub publish yoochog-request-host failed')
        rtcDebugLog('signaling', 'PubNub publish yoochog-request-host failed')
      })
    }
    publish()
    rtcDebugLog('signaling', 'PubNub guest: request-host interval started (1.5s)')
    this.requestHostInterval = globalThis.setInterval(publish, 1500)
  }

  private stopRequestHostLoop(): void {
    if (this.requestHostInterval !== null) {
      globalThis.clearInterval(this.requestHostInterval)
      this.requestHostInterval = null
    }
  }

  private emitPeerJoined(peer: PeerInfo): void {
    for (const h of this.peerJoinedListeners) {
      h(peer)
    }
  }

  private rememberPeer(peer: PeerInfo): void {
    if (this.seenPeerIds.has(peer.clientId)) {
      return
    }
    this.seenPeerIds.add(peer.clientId)
    this.joinedPeers.push(peer)
    rtcDebugLog('signaling', 'PubNub peer discovered', peer)
    this.emitPeerJoined(peer)
    if (peer.role === 'host' && this.role === 'guest') {
      this.stopRequestHostLoop()
    }
  }

  private handleIncoming(raw: unknown): void {
    if (typeof raw !== 'object' || raw === null) {
      return
    }
    const data = raw as Record<string, unknown>

    if (data.type === 'signal' && typeof data.from === 'string' && data.payload) {
      if (data.to !== this.clientId) {
        return
      }
      const envelope = {
        type: 'signal' as const,
        room: typeof data.room === 'string' ? data.room : (this.room ?? ''),
        from: data.from,
        to: String(data.to),
        payload: data.payload,
      }
      if (!isServerToClientMessage(envelope)) {
        return
      }
      const pl = envelope.payload as SignalPayload
      rtcDebugLog('signaling', 'PubNub signal in', { from: data.from, payload: signalPayloadSummary(pl) })
      this.onSignal?.({
        from: data.from,
        payload: pl,
      })
      return
    }

    if (data.type === 'yoochog-peer' && data.room === this.room && typeof data.clientId === 'string') {
      if (data.clientId === this.clientId) {
        return
      }
      const role = data.role
      if (role !== 'host' && role !== 'guest') {
        return
      }
      this.rememberPeer({ clientId: data.clientId, role })
      return
    }

    if (
      data.type === 'yoochog-request-host' &&
      data.room === this.room &&
      this.role === 'host'
    ) {
      rtcDebugLog('signaling', 'PubNub yoochog-request-host (host will re-announce)')
      this.publishPeerAnnouncement()
    }
  }

  sendSignal(to: string, payload: SignalPayload): void {
    if (!this.pubnub || !this.room || !this.clientId) {
      throw new Error('PubNub is not joined.')
    }
    const msg = {
      type: 'signal' as const,
      room: this.room,
      from: this.clientId,
      to,
      payload,
    }
    rtcDebugLog('signaling', 'PubNub signal out', { to, payload: signalPayloadSummary(payload) })
    void this.pubnub
      .publish({ channel: this.room, message: toPubNubMessage(msg) })
      .catch(() => {
        rtcFailureLog('signaling', 'PubNub signal publish failed', { to, payload: signalPayloadSummary(payload) })
        rtcDebugLog('signaling', 'PubNub signal publish failed', { to })
      })
  }

  close(): void {
    rtcDebugLog('signaling', 'PubNub close()')
    this.clearJoinTimeoutTimer()
    this.stopRequestHostLoop()
    try {
      this.pubnub?.unsubscribeAll()
      this.pubnub?.destroy()
    } catch {
      // ignore
    }
    this.pubnub = null
    this.pendingJoin = null
    this.room = null
    this.clientId = null
    this.role = null
  }
}
