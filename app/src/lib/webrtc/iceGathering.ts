import { rtcDebugLog, rtcFailureLog } from '@/lib/debug/rtcDebugLog'

/** Waits until ICE gathering finishes so SDP contains candidates (avoids trickle ordering issues in dev). */
export async function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  options: { signal?: AbortSignal; timeoutMs?: number; debugLabel?: string } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 15_000
  const label = options.debugLabel ?? 'pc'
  rtcDebugLog('webrtc', `${label} ICE gathering: start`, pc.iceGatheringState)
  if (pc.iceGatheringState === 'complete') {
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
      rtcFailureLog('webrtc', `${label} ICE gathering: aborted`)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const onGather = () => {
      rtcDebugLog('webrtc', `${label} icegatheringstatechange`, pc.iceGatheringState)
      if (pc.iceGatheringState === 'complete') {
        cleanup()
        rtcDebugLog('webrtc', `${label} ICE gathering: complete`)
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', onGather)
    const timeoutId = globalThis.setTimeout(() => {
      cleanup()
      rtcFailureLog('webrtc', `${label} ICE gathering: timed out after ${timeoutMs}ms`, {
        iceGatheringState: pc.iceGatheringState,
      })
      rtcDebugLog('webrtc', `${label} ICE gathering: timeout`, timeoutMs)
      reject(new Error('ICE gathering timed out.'))
    }, timeoutMs)
    onGather()
  })
}
