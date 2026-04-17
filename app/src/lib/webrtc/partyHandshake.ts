import { rtcDebugLog, rtcFailureLog, signalPayloadSummary } from '@/lib/debug/rtcDebugLog'
import type { PartySignalingTransport } from '@/lib/signaling/PartySignalingTransport'
import type { SignalPayload } from '@/lib/signaling/protocol'
import { createSignalingTransport } from '@/lib/signaling/signalingFactory'
import { signalingRoomId } from '@/lib/signaling/roomId'
import { broadcastToPartyDataChannels, PARTY_CHANNEL_LABEL } from '@/lib/party/broadcastPartyDataChannels'
import { removeGuestPeer } from '@/lib/party/partyPeerCleanup'
import {
  isImmediateConnectionLoss,
  isImmediateIceFailure,
  isTransientConnectionDisconnected,
  isTransientIceDisconnected,
} from '@/lib/webrtc/connectionFailure'
import type { HandshakeUiState } from '@/lib/webrtc/handshakeStatus'
import { getPartyIceServers } from '@/lib/webrtc/iceServersFromEnv'
import { waitForIceGatheringComplete } from '@/lib/webrtc/iceGathering'
import { waitForPeerConnectionConnected } from '@/lib/webrtc/waitForConnected'
import { PEER_DISCONNECTED_GRACE_MS } from '@/lib/webrtc/reconnectPolicy'

export type PartyHandshakeCallbacks = {
  onStatus: (s: HandshakeUiState) => void
  onError: (message: string) => void
}

export type HostPartyHandshakeOptions = {
  sessionId: string
  signal: AbortSignal
  /** Reliable, ordered SCTP; used for small JSON control messages (queue snapshots, enqueue). */
  onPartyChannelOpen?: (guestId: string) => void
  /** Raw UTF-8 payload from the guest's party channel (parse in the app layer). */
  onPartyMessage?: (guestId: string, raw: string) => void
  /** One guest's WebRTC/signaling step failed; other guests are unaffected. */
  onGuestPeerFailed?: (guestId: string, message: string) => void
  /** Runtime loss (ICE/DC) after a guest was attached; host still removes the peer — guest should rejoin with a new client id. */
  onGuestConnectionLost?: (guestId: string, detail: string) => void
} & PartyHandshakeCallbacks

export type HostPartyHandshakeHandle = {
  dispose: () => void
  sendPartyToGuest: (guestId: string, raw: string) => void
  broadcastParty: (raw: string) => void
}

export type GuestPartyHandshakeOptions = {
  sessionId: string
  signal: AbortSignal
  onPartyChannelOpen?: () => void
  onPartyMessage?: (raw: string) => void
  /** After the party link was up: PC/ICE/data channel dropped; composable should reconnect with backoff. */
  onConnectionLost?: (detail: string) => void
} & PartyHandshakeCallbacks

export type GuestPartyHandshakeHandle = {
  dispose: () => void
  /** Sends a UTF-8 string on the host-created party channel when open. */
  sendPartyRaw: (raw: string) => void
  /** This guest’s signaling `clientId` for the current connection (matches host roster / session admin). */
  localPartyPeerId: string
}

async function findHostPeerId(signaling: PartySignalingTransport, signal: AbortSignal): Promise<string> {
  const fromJoined = signaling.joinedPeers.find((p) => p.role === 'host')?.clientId
  if (fromJoined) {
    rtcDebugLog('handshake', 'guest: host id from join snapshot', fromJoined)
    return fromJoined
  }
  rtcDebugLog('handshake', 'guest: waiting for host announcement (up to 60s)')
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup()
      rtcFailureLog('handshake', 'guest: timed out waiting for host (60s)')
      rtcDebugLog('handshake', 'guest: timed out waiting for host')
      reject(new Error('Timed out waiting for host.'))
    }, 60_000)
    const onAbort = () => {
      cleanup()
      rtcFailureLog('handshake', 'guest: aborted while waiting for host')
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    const off = signaling.subscribePeerJoined((peer) => {
      if (peer.role === 'host') {
        rtcDebugLog('handshake', 'guest: host appeared via peer-joined', peer.clientId)
        cleanup()
        resolve(peer.clientId)
      }
    })
    function cleanup() {
      clearTimeout(timeout)
      signal.removeEventListener('abort', onAbort)
      off()
    }
  })
}

/**
 * Host: one RTCPeerConnection per guest; offer/answer with ICE in SDP (non-trickle for dev stability).
 */
export function runHostPartyHandshake(options: HostPartyHandshakeOptions): HostPartyHandshakeHandle {
  const iceServers = getPartyIceServers()
  const clientId = crypto.randomUUID()
  const signaling = createSignalingTransport({
    signalingBaseUrl: import.meta.env.VITE_SIGNALING_URL,
    pubnubPublishKey: import.meta.env.VITE_PUBNUB_PUBLISH_KEY,
    pubnubSubscribeKey: import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY,
  })
  const room = signalingRoomId(options.sessionId)
  const pcs = new Map<string, RTCPeerConnection>()
  const partyChannels = new Map<string, RTCDataChannel>()
  const unsubscribes: Array<() => void> = []
  let reportedConnected = false

  function removeGuest(guestId: string) {
    removeGuestPeer(guestId, pcs, partyChannels)
  }

  function sendPartyToGuest(guestId: string, raw: string) {
    const ch = partyChannels.get(guestId)
    if (!ch || ch.readyState !== 'open') {
      return
    }
    try {
      ch.send(raw)
    } catch (e) {
      rtcFailureLog('webrtc', 'host party channel send failed', guestId, e)
      // Channel may be closing.
    }
  }

  function broadcastParty(raw: string) {
    broadcastToPartyDataChannels(partyChannels, raw)
  }

  const dispose = () => {
    unsubscribes.forEach((u) => u())
    signaling.close()
    for (const id of [...pcs.keys()]) {
      removeGuest(id)
    }
  }

  options.signal.addEventListener(
    'abort',
    () => {
      dispose()
    },
    { once: true },
  )

  void (async () => {
    const reportStatus = (s: HandshakeUiState) => {
      rtcDebugLog('handshake', 'host status', s)
      options.onStatus(s)
    }
    rtcDebugLog('handshake', 'host start', { sessionId: options.sessionId, room, clientId })
    try {
      reportStatus('connecting_signaling')
      await signaling.connect()
      reportStatus('establishing_handshake')
      await signaling.join(room, clientId, 'host')
      rtcDebugLog('handshake', 'host signaling room joined')
    } catch (e) {
      rtcFailureLog('handshake', 'host signaling failed', e)
      rtcDebugLog('handshake', 'host signaling failed', e)
      reportStatus('failed')
      options.onError(e instanceof Error ? e.message : 'Signaling failed.')
      dispose()
      return
    }

    signaling.onPeerLeft = (leftId) => {
      rtcDebugLog('handshake', 'host onPeerLeft', leftId)
      if (pcs.has(leftId)) {
        removeGuest(leftId)
      }
    }

    signaling.onSignal = ({ from, payload }) => {
      void handleHostSignal(from, payload)
    }

    unsubscribes.push(
      signaling.subscribePeerJoined((peer) => {
        if (peer.role !== 'guest') {
          return
        }
        void attachGuest(peer.clientId)
      }),
    )

    for (const peer of signaling.joinedPeers) {
      if (peer.role === 'guest') {
        void attachGuest(peer.clientId)
      }
    }

    async function handleHostSignal(from: string, payload: SignalPayload) {
      const pc = pcs.get(from)
      if (!pc) {
        rtcDebugLog('handshake', 'host signal ignored (no pc)', from, signalPayloadSummary(payload))
        return
      }
      try {
        if (payload.kind === 'answer') {
          rtcDebugLog('handshake', 'host received answer', from, signalPayloadSummary(payload))
          await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
        }
      } catch (e) {
        rtcFailureLog('handshake', 'host setRemoteDescription failed', { from, err: e })
        rtcDebugLog('handshake', 'host setRemoteDescription failed', from, e)
        const message = e instanceof Error ? e.message : 'Handshake failed.'
        options.onGuestPeerFailed?.(from, message)
        removeGuest(from)
      }
    }

    async function attachGuest(guestId: string) {
      if (pcs.has(guestId)) {
        return
      }
      if (options.signal.aborted) {
        return
      }
      rtcDebugLog('handshake', 'host attachGuest', guestId, { iceServerCount: iceServers.length })
      const pc = new RTCPeerConnection({ iceServers })
      pcs.set(guestId, pc)

      const dc = pc.createDataChannel(PARTY_CHANNEL_LABEL, { ordered: true })
      partyChannels.set(guestId, dc)

      /** Clears when the peer is removed or recovers to connected. */
      let disconnectedGraceTimer: ReturnType<typeof setTimeout> | null = null

      function clearDisconnectGrace() {
        if (disconnectedGraceTimer) {
          clearTimeout(disconnectedGraceTimer)
          disconnectedGraceTimer = null
        }
      }

      function removeGuestAfterLoss(detail: string) {
        if (pcs.get(guestId) !== pc) {
          return
        }
        clearDisconnectGrace()
        rtcFailureLog('webrtc', 'host guest connection lost', guestId, detail)
        options.onGuestConnectionLost?.(guestId, detail)
        removeGuest(guestId)
      }

      dc.onopen = () => {
        rtcDebugLog('webrtc', 'host party data channel open', guestId)
        options.onPartyChannelOpen?.(guestId)
      }
      dc.onmessage = (ev) => {
        options.onPartyMessage?.(guestId, String(ev.data))
      }
      dc.onclose = () => {
        removeGuestAfterLoss('Party data channel closed')
      }

      pc.onconnectionstatechange = () => {
        if (pcs.get(guestId) !== pc) {
          return
        }
        const st = pc.connectionState
        rtcDebugLog('webrtc', 'host pc connectionstatechange', guestId, st)
        if (st === 'connected') {
          clearDisconnectGrace()
          return
        }
        if (isImmediateConnectionLoss(st)) {
          removeGuestAfterLoss(`Peer connection ${st}`)
          return
        }
        if (isTransientConnectionDisconnected(st)) {
          clearDisconnectGrace()
          disconnectedGraceTimer = setTimeout(() => {
            disconnectedGraceTimer = null
            if (pcs.get(guestId) !== pc) {
              return
            }
            const cur = pc.connectionState
            if (cur === 'connected') {
              return
            }
            if (cur === 'disconnected' || isImmediateConnectionLoss(cur)) {
              removeGuestAfterLoss(
                `Peer connection ${cur} (still unhealthy after ${PEER_DISCONNECTED_GRACE_MS}ms grace)`,
              )
            }
          }, PEER_DISCONNECTED_GRACE_MS)
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (pcs.get(guestId) !== pc) {
          return
        }
        const ice = pc.iceConnectionState
        rtcDebugLog('webrtc', 'host pc iceconnectionstatechange', guestId, ice)
        if (ice === 'connected' || ice === 'completed') {
          clearDisconnectGrace()
          return
        }
        if (isImmediateIceFailure(ice)) {
          removeGuestAfterLoss(`ICE ${ice}`)
          return
        }
        if (isTransientIceDisconnected(ice)) {
          clearDisconnectGrace()
          disconnectedGraceTimer = setTimeout(() => {
            disconnectedGraceTimer = null
            if (pcs.get(guestId) !== pc) {
              return
            }
            const cur = pc.iceConnectionState
            if (cur === 'connected' || cur === 'completed') {
              return
            }
            if (isTransientIceDisconnected(cur) || isImmediateIceFailure(cur)) {
              removeGuestAfterLoss(`ICE ${cur} (still unhealthy after ${PEER_DISCONNECTED_GRACE_MS}ms grace)`)
            }
          }, PEER_DISCONNECTED_GRACE_MS)
        }
      }

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        rtcDebugLog('handshake', 'host created offer', guestId)
        await waitForIceGatheringComplete(pc, {
          signal: options.signal,
          timeoutMs: 15_000,
          debugLabel: `host→${guestId.slice(0, 8)}`,
        })
        const sdp = pc.localDescription?.sdp ?? ''
        rtcDebugLog('handshake', 'host sending offer', guestId, `sdpChars=${sdp.length}`)
        signaling.sendSignal(guestId, { kind: 'offer', sdp })
        await waitForPeerConnectionConnected(pc, {
          signal: options.signal,
          timeoutMs: 60_000,
          debugLabel: `host→${guestId.slice(0, 8)}`,
        })
        if (!reportedConnected) {
          reportedConnected = true
          rtcDebugLog('handshake', 'host first peer fully connected → UI connected')
          reportStatus('connected')
        }
      } catch (e) {
        rtcFailureLog('handshake', 'host attachGuest / WebRTC failed', guestId, e)
        rtcDebugLog('handshake', 'host attachGuest failed', guestId, e)
        const message = e instanceof Error ? e.message : 'Handshake failed.'
        options.onGuestPeerFailed?.(guestId, message)
        removeGuest(guestId)
      }
    }
  })()

  return { dispose, sendPartyToGuest, broadcastParty }
}

/**
 * Guest: waits for host, answers host offer, waits until the peer connection is connected.
 */
export function runGuestPartyHandshake(options: GuestPartyHandshakeOptions): GuestPartyHandshakeHandle {
  const iceServers = getPartyIceServers()
  const clientId = crypto.randomUUID()
  const signaling = createSignalingTransport({
    signalingBaseUrl: import.meta.env.VITE_SIGNALING_URL,
    pubnubPublishKey: import.meta.env.VITE_PUBNUB_PUBLISH_KEY,
    pubnubSubscribeKey: import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY,
  })
  const room = signalingRoomId(options.sessionId)
  let pc: RTCPeerConnection | null = null
  let partyDc: RTCDataChannel | null = null
  const preSignal: Array<{ from: string; payload: SignalPayload }> = []

  const sendPartyRaw = (raw: string) => {
    if (!partyDc || partyDc.readyState !== 'open') {
      return
    }
    try {
      partyDc.send(raw)
    } catch (e) {
      rtcFailureLog('webrtc', 'guest party channel send failed', e)
      // ignore
    }
  }

  let disconnectedGraceTimer: ReturnType<typeof setTimeout> | null = null

  const dispose = () => {
    if (disconnectedGraceTimer) {
      clearTimeout(disconnectedGraceTimer)
      disconnectedGraceTimer = null
    }
    signaling.close()
    try {
      partyDc?.close()
    } catch {
      // ignore
    }
    partyDc = null
    pc?.close()
    pc = null
  }

  options.signal.addEventListener(
    'abort',
    () => {
      dispose()
    },
    { once: true },
  )

  void (async () => {
    const reportStatus = (s: HandshakeUiState) => {
      rtcDebugLog('handshake', 'guest status', s)
      options.onStatus(s)
    }
    rtcDebugLog('handshake', 'guest start', { sessionId: options.sessionId, room, clientId })
    try {
      reportStatus('connecting_signaling')
      signaling.onSignal = (msg) => {
        rtcDebugLog('handshake', 'guest buffering signal (pre-join)', msg.from, signalPayloadSummary(msg.payload))
        preSignal.push(msg)
      }
      await signaling.connect()
      reportStatus('establishing_handshake')
      await signaling.join(room, clientId, 'guest')
      rtcDebugLog('handshake', 'guest signaling room joined')
      const hostId = await findHostPeerId(signaling, options.signal)
      rtcDebugLog('handshake', 'guest resolved hostId', hostId)

      let handshakeFinished = false
      let lostNotified = false

      function clearDisconnectGrace() {
        if (disconnectedGraceTimer) {
          clearTimeout(disconnectedGraceTimer)
          disconnectedGraceTimer = null
        }
      }

      function notifyGuestLost(detail: string) {
        if (lostNotified) {
          return
        }
        lostNotified = true
        clearDisconnectGrace()
        rtcFailureLog('handshake', 'guest connection lost', detail, { handshakeFinished })
        rtcDebugLog('handshake', 'guest connection lost', detail, { handshakeFinished })
        if (!handshakeFinished) {
          reportStatus('failed')
          options.onError(detail)
          dispose()
          return
        }
        options.onConnectionLost?.(detail)
      }

      function scheduleDisconnectGraceForGuest() {
        clearDisconnectGrace()
        disconnectedGraceTimer = setTimeout(() => {
          disconnectedGraceTimer = null
          if (!pc || lostNotified) {
            return
          }
          if (pc.connectionState === 'connected') {
            return
          }
          const ice = pc.iceConnectionState
          if (ice === 'connected' || ice === 'completed') {
            return
          }
          notifyGuestLost(
            `Peer/ICE still unhealthy after ${PEER_DISCONNECTED_GRACE_MS}ms (connection=${pc.connectionState}, ice=${ice})`,
          )
        }, PEER_DISCONNECTED_GRACE_MS)
      }

      rtcDebugLog('handshake', 'guest RTCPeerConnection created', { iceServerCount: iceServers.length })
      pc = new RTCPeerConnection({ iceServers })

      pc.onconnectionstatechange = () => {
        if (!pc || lostNotified) {
          return
        }
        const st = pc.connectionState
        rtcDebugLog('webrtc', 'guest pc connectionstatechange', st)
        if (st === 'connected') {
          clearDisconnectGrace()
          return
        }
        if (isImmediateConnectionLoss(st)) {
          notifyGuestLost(`Peer connection ${st}`)
          return
        }
        if (isTransientConnectionDisconnected(st)) {
          scheduleDisconnectGraceForGuest()
        }
      }

      pc.oniceconnectionstatechange = () => {
        if (!pc || lostNotified) {
          return
        }
        const ice = pc.iceConnectionState
        rtcDebugLog('webrtc', 'guest pc iceconnectionstatechange', ice)
        if (ice === 'connected' || ice === 'completed') {
          clearDisconnectGrace()
          return
        }
        if (isImmediateIceFailure(ice)) {
          notifyGuestLost(`ICE ${ice}`)
          return
        }
        if (isTransientIceDisconnected(ice)) {
          scheduleDisconnectGraceForGuest()
        }
      }

      pc.ondatachannel = (ev) => {
        if (ev.channel.label !== PARTY_CHANNEL_LABEL) {
          return
        }
        partyDc = ev.channel
        partyDc.binaryType = 'blob'
        partyDc.onopen = () => {
          rtcDebugLog('webrtc', 'guest party data channel open')
          options.onPartyChannelOpen?.()
        }
        partyDc.onmessage = (e) => {
          options.onPartyMessage?.(String(e.data))
        }
        partyDc.onclose = () => {
          notifyGuestLost('Party data channel closed')
        }
      }

      const processSignal = async (from: string, payload: SignalPayload) => {
        try {
          if (from !== hostId || !pc || handshakeFinished) {
            if (payload.kind === 'offer' && from !== hostId) {
              rtcDebugLog('handshake', 'guest ignoring offer from non-host', from)
            }
            return
          }
          if (payload.kind !== 'offer') {
            rtcDebugLog('handshake', 'guest ignoring non-offer', signalPayloadSummary(payload))
            return
          }
          rtcDebugLog('handshake', 'guest received offer', signalPayloadSummary(payload))
          await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp })
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          rtcDebugLog('handshake', 'guest created answer')
          await waitForIceGatheringComplete(pc, {
            signal: options.signal,
            timeoutMs: 15_000,
            debugLabel: 'guest answer',
          })
          const ansSdp = pc.localDescription?.sdp ?? ''
          rtcDebugLog('handshake', 'guest sending answer', `sdpChars=${ansSdp.length}`)
          signaling.sendSignal(hostId, { kind: 'answer', sdp: ansSdp })
          await waitForPeerConnectionConnected(pc, {
            signal: options.signal,
            timeoutMs: 60_000,
            debugLabel: 'guest wait',
          })
          handshakeFinished = true
          rtcDebugLog('handshake', 'guest WebRTC connected')
          reportStatus('connected')
        } catch (e) {
          const msg = e instanceof Error ? e.message : 'Guest offer/answer failed.'
          notifyGuestLost(msg)
        }
      }

      for (const m of preSignal) {
        await processSignal(m.from, m.payload)
      }
      preSignal.length = 0

      signaling.onSignal = (msg) => {
        rtcDebugLog('handshake', 'guest signal', msg.from, signalPayloadSummary(msg.payload))
        void processSignal(msg.from, msg.payload)
      }
    } catch (e) {
      rtcFailureLog('handshake', 'guest handshake failed', e)
      rtcDebugLog('handshake', 'guest handshake failed', e)
      reportStatus('failed')
      options.onError(e instanceof Error ? e.message : 'Handshake failed.')
      dispose()
    }
  })()

  return { dispose, sendPartyRaw, localPartyPeerId: clientId }
}
