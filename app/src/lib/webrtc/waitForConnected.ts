import { connectionStepLog, rtcDebugLog, rtcFailureLog } from '@/lib/debug/rtcDebugLog'

/** Resolves when `connectionState` is `connected`, or rejects on failure/timeout/abort. */
export async function waitForPeerConnectionConnected(
  pc: RTCPeerConnection,
  options: { signal?: AbortSignal; timeoutMs?: number; debugLabel?: string } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 60_000
  const label = options.debugLabel ?? 'pc'
  connectionStepLog('webrtc', `${label}:waitConnected:start`, {
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
  })
  rtcDebugLog('webrtc', `${label} wait connected: start`, {
    connectionState: pc.connectionState,
    iceConnectionState: pc.iceConnectionState,
    iceGatheringState: pc.iceGatheringState,
  })
  if (pc.connectionState === 'connected') {
    connectionStepLog('webrtc', `${label}:waitConnected:alreadyConnected`)
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
      connectionStepLog('webrtc', `${label}:waitConnected:aborted`)
      rtcFailureLog('webrtc', `${label} wait connected: aborted`)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const onState = () => {
      rtcDebugLog('webrtc', `${label} connectionstatechange`, pc.connectionState)
      if (pc.connectionState === 'connected') {
        cleanup()
        connectionStepLog('webrtc', `${label}:waitConnected:resolved`)
        rtcDebugLog('webrtc', `${label} wait connected: resolved`)
        resolve()
        return
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanup()
        connectionStepLog('webrtc', `${label}:waitConnected:failed`, pc.connectionState)
        rtcFailureLog('webrtc', `${label} wait connected: peer connection`, pc.connectionState)
        rtcDebugLog('webrtc', `${label} wait connected: failed`, pc.connectionState)
        reject(new Error(`Peer connection ${pc.connectionState}.`))
      }
    }
    pc.addEventListener('connectionstatechange', onState)
    const timeoutId = globalThis.setTimeout(() => {
      cleanup()
      connectionStepLog('webrtc', `${label}:waitConnected:timeout`, timeoutMs, {
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
      })
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
