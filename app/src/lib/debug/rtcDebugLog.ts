/**
 * Verbose RTC/signaling traces (`console.log`). Enable via either:
 * - `VITE_DEBUG_RTC=true` in `.env.local` (rebuild required), or
 * - DevTools: `localStorage.setItem('yoochog:debug:rtc', '1')` then reload.
 *
 * **`rtcFailureLog`** always uses `console.warn` (no toggle) for errors, timeouts, and connection loss.
 *
 * Does not log full SDP bodies (only lengths) to keep the console usable.
 */
export type RtcDebugScope = 'signaling' | 'handshake' | 'webrtc' | 'realtime'

function rtcDebugEnabled(): boolean {
  if (import.meta.env.VITE_DEBUG_RTC === 'true') {
    return true
  }
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('yoochog:debug:rtc') === '1'
  } catch {
    return false
  }
}

export function isRtcDebugEnabled(): boolean {
  return rtcDebugEnabled()
}

export function rtcDebugLog(scope: RtcDebugScope, ...args: unknown[]): void {
  if (!rtcDebugEnabled()) {
    return
  }
  console.log(`[yoochog:${scope}]`, ...args)
}

/** Always-on connection milestone logs (not gated by `VITE_DEBUG_RTC` / localStorage). */
export type ConnectionStepRole = 'host' | 'guest' | 'signaling' | 'webrtc'

export function connectionStepLog(role: ConnectionStepRole, step: string, ...detail: unknown[]): void {
  if (detail.length) {
    console.log(`[yoochog:connection:${role}]`, step, ...detail)
  } else {
    console.log(`[yoochog:connection:${role}]`, step)
  }
}

/**
 * Always-on warning for signaling / handshake / WebRTC failures (no env toggle).
 * Use for errors, timeouts, and connection loss so production consoles show why something broke.
 */
export function rtcFailureLog(scope: RtcDebugScope, ...args: unknown[]): void {
  console.warn(`[yoochog:${scope}]`, ...args)
}
