import PubNub from 'pubnub'

import type { PartySignalingTransport } from './PartySignalingTransport'

type PubNubPublishMessage = Parameters<InstanceType<typeof PubNub>['publish']>[0]['message']
import type { PeerInfo, SignalPayload, SignalingRole } from './protocol'
import { isServerToClientMessage } from './protocol'

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
  private joinFallbackTimer: ReturnType<typeof setTimeout> | null = null
  private requestHostInterval: ReturnType<typeof setInterval> | null = null

  constructor(private readonly options: PubNubSignalingClientOptions) {}

  subscribePeerJoined(handler: (peer: PeerInfo) => void): () => void {
    this.peerJoinedListeners.add(handler)
    return () => {
      this.peerJoinedListeners.delete(handler)
    }
  }

  async connect(): Promise<void> {
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
      return Promise.reject(new Error('Invalid client id for PubNub userId.'))
    }

    this.pubnub = new PubNub({
      publishKey: this.options.publishKey,
      subscribeKey: this.options.subscribeKey,
      userId,
    })

    return new Promise((resolve, reject) => {
      this.pendingJoin = { resolve, reject }

      this.pubnub!.addListener({
        status: (statusEvent) => {
          if (statusEvent.category === PubNub.CATEGORIES.PNSubscriptionChangedCategory) {
            this.finishJoinHandshake()
          }
          if (statusEvent.category === PubNub.CATEGORIES.PNConnectionErrorCategory) {
            if (this.pendingJoin) {
              this.pendingJoin.reject(new Error('PubNub connection failed.'))
              this.pendingJoin = null
            }
          }
        },
        message: (evt) => {
          this.handleIncoming(evt.message as unknown)
        },
      })

      this.pubnub!.subscribe({ channels: [room] })

      this.joinFallbackTimer = globalThis.setTimeout(() => {
        this.joinFallbackTimer = null
        if (this.pendingJoin) {
          this.finishJoinHandshake()
        }
      }, 2000)
    })
  }

  private finishJoinHandshake(): void {
    if (this.joinFallbackTimer !== null) {
      globalThis.clearTimeout(this.joinFallbackTimer)
      this.joinFallbackTimer = null
    }
    if (!this.pendingJoin) {
      return
    }
    this.pendingJoin.resolve()
    this.pendingJoin = null
    this.publishPeerAnnouncement()
    if (this.role === 'guest') {
      this.startRequestHostLoop()
    }
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
    void this.pubnub.publish({ channel: this.room, message: toPubNubMessage(msg) })
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
      void this.pubnub.publish({ channel: this.room, message: toPubNubMessage(msg) })
    }
    publish()
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
      this.onSignal?.({
        from: data.from,
        payload: envelope.payload as SignalPayload,
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
    void this.pubnub.publish({ channel: this.room, message: toPubNubMessage(msg) })
  }

  close(): void {
    if (this.joinFallbackTimer !== null) {
      globalThis.clearTimeout(this.joinFallbackTimer)
      this.joinFallbackTimer = null
    }
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
