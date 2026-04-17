import type { SignalPayload } from '@/lib/signaling/protocol'

/**
 * Verbose RTC/signaling traces (`console.log`). Enable via either:
 * - `VITE_DEBUG_RTC=true` in `.env.local` (rebuild required), or
 * - DevTools: `localStorage.setItem('yoochog:debug:rtc', '1')` then reload.
 *
 * **`rtcFailureLog`** always uses `console.warn` (no toggle) for errors, timeouts, and connection loss.
 *
 * Does not log full SDP bodies (only lengths) to keep the console usable.
 */
export type RtcDebugScope = 'signaling' | 'handshake' | 'webrtc'

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

/**
 * Always-on warning for signaling / handshake / WebRTC failures (no env toggle).
 * Use for errors, timeouts, and connection loss so production consoles show why something broke.
 */
export function rtcFailureLog(scope: RtcDebugScope, ...args: unknown[]): void {
  console.warn(`[yoochog:${scope}]`, ...args)
}

export function signalPayloadSummary(p: SignalPayload): string {
  if (p.kind === 'offer' || p.kind === 'answer') {
    return `${p.kind} sdpChars=${p.sdp.length}`
  }
  if (p.kind === 'ice') {
    const c = p.candidate
    if (c == null) {
      return 'ice end-of-candidates'
    }
    return `ice candidate type=${c.sdpMLineIndex ?? '?'}`
  }
  return 'unknown-payload'
}
