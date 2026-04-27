/**
 * Tunables for Socket.io party recovery (guest reconnection limits, visibility).
 */

/** After this many connection-loss events without a successful reconnect, stop retrying. */
export const RECONNECT_MAX_ATTEMPTS = 10

/**
 * Legacy constant name: reserved for doc alignment; WebRTC ICE grace is no longer used for the party channel.
 * Kept so recovery timing references in docs remain grep-friendly.
 */
export const PEER_DISCONNECTED_GRACE_MS = 8_000

/**
 * Page Visibility: only treat return-to-tab as recovery when hidden at least this long
 * (reduces thrashing on quick tab switches; aligns with ~1 min background doc).
 */
export const RECONNECT_VISIBILITY_MIN_HIDDEN_MS = 60_000

/**
 * Guest: after a long `hidden` / return to `visible`, wait this long (post-layout) before probing
 * the party link, so the visibility probe does not flap on the first frame.
 */
export const VISIBILITY_RESUME_HEALTH_PROBE_MS = 200

/** True when failureCount consecutive losses have reached the limit (no more retries). */
export function shouldStopRetry(failureCount: number): boolean {
  return failureCount >= RECONNECT_MAX_ATTEMPTS
}
