import { rtcDebugLog, rtcFailureLog } from '@/lib/debug/rtcDebugLog'

/** Resolves when `connectionState` is `connected`, or rejects on failure/timeout/abort. */
export async function waitForPeerConnectionConnected(
  pc: RTCPeerConnection,
  options: { signal?: AbortSignal; timeoutMs?: number; debugLabel?: string } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 60_000
  const label = options.debugLabel ?? 'pc'
  rtcDebugLog('webrtc', `${label} wait connected: start`, {
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
  })
  if (pc.connectionState === 'connected') {
    rtcDebugLog('webrtc', `${label} wait connected: already connected`)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeoutId)
      pc.removeEventListener('connectionstatechange', onState)
      options.signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      rtcFailureLog('webrtc', `${label} wait connected: aborted`)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const onState = () => {
      rtcDebugLog('webrtc', `${label} connectionstatechange`, pc.connectionState)
      if (pc.connectionState === 'connected') {
        cleanup()
        rtcDebugLog('webrtc', `${label} wait connected: resolved`)
        resolve()
        return
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanup()
        rtcFailureLog('webrtc', `${label} wait connected: peer connection`, pc.connectionState)
        rtcDebugLog('webrtc', `${label} wait connected: failed`, pc.connectionState)
        reject(new Error(`Peer connection ${pc.connectionState}.`))
      }
    }
    pc.addEventListener('connectionstatechange', onState)
    const timeoutId = globalThis.setTimeout(() => {
      cleanup()
      rtcFailureLog('webrtc', `${label} wait connected: timed out after ${timeoutMs}ms`, {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
      })
      rtcDebugLog('webrtc', `${label} wait connected: timeout`, timeoutMs, {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
      })
      reject(new Error('Real-time connection timed out.'))
    }, timeoutMs)
    onState()
  })
}
