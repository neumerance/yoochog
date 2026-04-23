import { connectionStepLog, rtcDebugLog, rtcFailureLog } from '@/lib/debug/rtcDebugLog'

/** Waits until ICE gathering finishes so SDP contains candidates (avoids trickle ordering issues in dev). */
export async function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  options: { signal?: AbortSignal; timeoutMs?: number; debugLabel?: string } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const label = options.debugLabel ?? 'pc'
  connectionStepLog('webrtc', `${label}:iceGathering:start`, pc.iceGatheringState)
  rtcDebugLog('webrtc', `${label} ICE gathering: start`, pc.iceGatheringState)
  if (pc.iceGatheringState === 'complete') {
    connectionStepLog('webrtc', `${label}:iceGathering:alreadyComplete`)
    rtcDebugLog('webrtc', `${label} ICE gathering: already complete`)
    return
  }
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeoutId)
      pc.removeEventListener('icegatheringstatechange', onGather)
      options.signal?.removeEventListener('abort', onAbort)
    }
    const onAbort = () => {
      cleanup()
      connectionStepLog('webrtc', `${label}:iceGathering:aborted`)
      rtcFailureLog('webrtc', `${label} ICE gathering: aborted`)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const onGather = () => {
      rtcDebugLog('webrtc', `${label} icegatheringstatechange`, pc.iceGatheringState)
      if (pc.iceGatheringState === 'complete') {
        cleanup()
        connectionStepLog('webrtc', `${label}:iceGathering:complete`)
        rtcDebugLog('webrtc', `${label} ICE gathering: complete`)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', onGather)
    const timeoutId = globalThis.setTimeout(() => {
      cleanup()
      connectionStepLog('webrtc', `${label}:iceGathering:timeout`, timeoutMs, {
        iceGatheringState: pc.iceGatheringState,
      })
      rtcFailureLog('webrtc', `${label} ICE gathering: timed out after ${timeoutMs}ms`, {
        iceGatheringState: pc.iceGatheringState,
      })
      rtcDebugLog('webrtc', `${label} ICE gathering: timeout`, timeoutMs)
      reject(new Error('ICE gathering timed out.'))
    }, timeoutMs)
    onGather()
  })
}
