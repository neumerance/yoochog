import type { PartySignalingTransport } from '@/lib/signaling/PartySignalingTransport'
import type { SignalPayload } from '@/lib/signaling/protocol'
import { createSignalingTransport } from '@/lib/signaling/signalingFactory'
import { signalingRoomId } from '@/lib/signaling/roomId'
import type { HandshakeUiState } from '@/lib/webrtc/handshakeStatus'
import { DEFAULT_DEV_ICE_SERVERS } from '@/lib/webrtc/defaultIceServers'
import { waitForIceGatheringComplete } from '@/lib/webrtc/iceGathering'
import { waitForPeerConnectionConnected } from '@/lib/webrtc/waitForConnected'

export type PartyHandshakeCallbacks = {
  onStatus: (s: HandshakeUiState) => void
  onError: (message: string) => void
}

async function findHostPeerId(signaling: PartySignalingTransport, signal: AbortSignal): Promise<string> {
  const fromJoined = signaling.joinedPeers.find((p) => p.role === 'host')?.clientId
  if (fromJoined) {
    return fromJoined
  }
  return new Promise((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      cleanup()
      reject(new Error('Timed out waiting for host.'))
    }, 60_000)
    const onAbort = () => {
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
    const off = signaling.subscribePeerJoined((peer) => {
      if (peer.role === 'host') {
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
export function runHostPartyHandshake(
  options: {
    sessionId: string
    signal: AbortSignal
  } & PartyHandshakeCallbacks,
): { dispose: () => void } {
  const clientId = crypto.randomUUID()
  const signaling = createSignalingTransport({
    signalingBaseUrl: import.meta.env.VITE_SIGNALING_URL,
    pubnubPublishKey: import.meta.env.VITE_PUBNUB_PUBLISH_KEY,
    pubnubSubscribeKey: import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY,
  })
  const room = signalingRoomId(options.sessionId)
  const pcs = new Map<string, RTCPeerConnection>()
  const unsubscribes: Array<() => void> = []
  let reportedConnected = false

  const dispose = () => {
    unsubscribes.forEach((u) => u())
    signaling.close()
    for (const pc of pcs.values()) {
      pc.close()
    }
    pcs.clear()
  }

  options.signal.addEventListener(
    'abort',
    () => {
      dispose()
    },
    { once: true },
  )

  void (async () => {
    try {
      options.onStatus('connecting_signaling')
      await signaling.connect()
      options.onStatus('establishing_handshake')
      await signaling.join(room, clientId, 'host')
    } catch (e) {
      options.onStatus('failed')
      options.onError(e instanceof Error ? e.message : 'Signaling failed.')
      dispose()
      return
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
        return
      }
      try {
        if (payload.kind === 'answer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp })
        }
      } catch (e) {
        options.onStatus('failed')
        options.onError(e instanceof Error ? e.message : 'Handshake failed.')
        dispose()
      }
    }

    async function attachGuest(guestId: string) {
      if (pcs.has(guestId)) {
        return
      }
      if (options.signal.aborted) {
        return
      }
      const pc = new RTCPeerConnection({ iceServers: DEFAULT_DEV_ICE_SERVERS })
      pcs.set(guestId, pc)
      pc.createDataChannel('yoochog-handshake')
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        await waitForIceGatheringComplete(pc, { signal: options.signal, timeoutMs: 15_000 })
        const sdp = pc.localDescription?.sdp ?? ''
        signaling.sendSignal(guestId, { kind: 'offer', sdp })
        await waitForPeerConnectionConnected(pc, { signal: options.signal, timeoutMs: 60_000 })
        if (!reportedConnected) {
          reportedConnected = true
          options.onStatus('connected')
        }
      } catch (e) {
        options.onStatus('failed')
        options.onError(e instanceof Error ? e.message : 'Handshake failed.')
        dispose()
      }
    }
  })()

  return { dispose }
}

/**
 * Guest: waits for host, answers host offer, waits until the peer connection is connected.
 */
export function runGuestPartyHandshake(
  options: {
    sessionId: string
    signal: AbortSignal
  } & PartyHandshakeCallbacks,
): { dispose: () => void } {
  const clientId = crypto.randomUUID()
  const signaling = createSignalingTransport({
    signalingBaseUrl: import.meta.env.VITE_SIGNALING_URL,
    pubnubPublishKey: import.meta.env.VITE_PUBNUB_PUBLISH_KEY,
    pubnubSubscribeKey: import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY,
  })
  const room = signalingRoomId(options.sessionId)
  let pc: RTCPeerConnection | null = null
  const preSignal: Array<{ from: string; payload: SignalPayload }> = []

  const dispose = () => {
    signaling.close()
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
    try {
      options.onStatus('connecting_signaling')
      signaling.onSignal = (msg) => {
        preSignal.push(msg)
      }
      await signaling.connect()
      options.onStatus('establishing_handshake')
      await signaling.join(room, clientId, 'guest')
      const hostId = await findHostPeerId(signaling, options.signal)
      pc = new RTCPeerConnection({ iceServers: DEFAULT_DEV_ICE_SERVERS })
      pc.ondatachannel = () => {
        // Keeps the SCTP side alive for connectionState to reach connected.
      }

      let handshakeFinished = false
      const processSignal = async (from: string, payload: SignalPayload) => {
        if (from !== hostId || !pc || handshakeFinished) {
          return
        }
        if (payload.kind !== 'offer') {
          return
        }
        await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp })
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        await waitForIceGatheringComplete(pc, { signal: options.signal, timeoutMs: 15_000 })
        signaling.sendSignal(hostId, { kind: 'answer', sdp: pc.localDescription?.sdp ?? '' })
        await waitForPeerConnectionConnected(pc, { signal: options.signal, timeoutMs: 60_000 })
        handshakeFinished = true
        options.onStatus('connected')
      }

      for (const m of preSignal) {
        await processSignal(m.from, m.payload)
      }
      preSignal.length = 0

      signaling.onSignal = (msg) => {
        void processSignal(msg.from, msg.payload)
      }
    } catch (e) {
      options.onStatus('failed')
      options.onError(e instanceof Error ? e.message : 'Handshake failed.')
      dispose()
    }
  })()

  return { dispose }
}
