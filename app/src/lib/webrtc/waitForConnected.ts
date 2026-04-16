/** Resolves when `connectionState` is `connected`, or rejects on failure/timeout/abort. */
export async function waitForPeerConnectionConnected(
  pc: RTCPeerConnection,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 60_000
  if (pc.connectionState === 'connected') {
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
      reject(new DOMException('Aborted', 'AbortError'))
    }
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const onState = () => {
      if (pc.connectionState === 'connected') {
        cleanup()
        resolve()
        return
      }
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanup()
        reject(new Error(`Peer connection ${pc.connectionState}.`))
      }
    }
    pc.addEventListener('connectionstatechange', onState)
    const timeoutId = globalThis.setTimeout(() => {
      cleanup()
      reject(new Error('Real-time connection timed out.'))
    }, timeoutMs)
    onState()
  })
}
