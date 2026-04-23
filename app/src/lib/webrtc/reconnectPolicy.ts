/**
 * Bounded exponential backoff with full jitter for WebRTC / signaling recovery.
 * Tunables are exported for docs (docs/realtime-recovery.md) and operators.
 */

/** First retry schedule uses this base before capping (see nextDelayMs). */
export const RECONNECT_BASE_DELAY_MS = 1_000

/** Upper cap on the exponential component before jitter (not the same as worst-case sleep). */
export const RECONNECT_MAX_DELAY_MS = 30_000

/** After this many connection-loss events without a successful reconnect, stop retrying. */
export const RECONNECT_MAX_ATTEMPTS = 10

/**
 * Guest: after each connection loss, show a countdown in the UI for this many seconds,
 * then start a new handshake (fixed delay; replaces exponential backoff for guests).
 */
export const RECONNECT_COUNTDOWN_SECONDS = 5

/**
 * When RTCPeerConnection enters "disconnected", ICE may recover without a full teardown.
 * Wait this long before treating it as a loss (host + guest).
 */
export const PEER_DISCONNECTED_GRACE_MS = 8_000

/**
 * Page Visibility: only treat return-to-tab as recovery when hidden at least this long
 * (reduces thrashing on quick tab switches; aligns with ~1 min background doc).
 */
export const RECONNECT_VISIBILITY_MIN_HIDDEN_MS = 60_000

/**
 * Guest: after a long `hidden` / return to `visible`, wait this long (post-layout) before reading
 * PC/party data channel state, so the visibility probe does not flap on the first frame.
 */
export const VISIBILITY_RESUME_HEALTH_PROBE_MS = 200

/**
 * Full jitter in [0, min(maxDelay, base * 2^attemptIndex)] — spreads retries in time.
 * @param attemptIndex 0-based index for this scheduled retry (0 = first retry after a loss).
 */
export function nextDelayMs(attemptIndex: number, random: () => number = Math.random): number {
  if (attemptIndex < 0) {
    return 0
  }
  const expCap = RECONNECT_BASE_DELAY_MS * Math.pow(2, attemptIndex)
  const cap = Math.min(RECONNECT_MAX_DELAY_MS, expCap)
  return Math.floor(random() * cap)
}

/** True when failureCount consecutive losses have reached the limit (no more retries). */
export function shouldStopRetry(failureCount: number): boolean {
  return failureCount >= RECONNECT_MAX_ATTEMPTS
}
