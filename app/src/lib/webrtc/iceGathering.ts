/** Waits until ICE gathering finishes so SDP contains candidates (avoids trickle ordering issues in dev). */
export async function waitForIceGatheringComplete(
  pc: RTCPeerConnection,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 15_000
  if (pc.iceGatheringState === 'complete') {
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
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const onGather = () => {
      if (pc.iceGatheringState === 'complete') {
        cleanup()
        resolve()
      }
    }
    pc.addEventListener('icegatheringstatechange', onGather)
    const timeoutId = globalThis.setTimeout(() => {
      cleanup()
      reject(new Error('ICE gathering timed out.'))
    }, timeoutMs)
    onGather()
  })
}
