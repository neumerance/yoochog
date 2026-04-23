/** Inclusive per-guest cap on the wire and in host state (`queue_snapshot` / policy). */
export const GUEST_QUEUE_ROWS_CAP_MIN = 1
export const GUEST_QUEUE_ROWS_CAP_MAX = 10
/** When the field is absent (older hosts) or unparseable. */
export const GUEST_QUEUE_ROWS_CAP_DEFAULT = 2

/**
 * Normalizes a raw snapshot or settings value to a host-enforced cap in [1, 10].
 * Non-finite or out-of-range values fall back to the default.
 */
export function normalizeGuestQueueRowsCap(raw: unknown): number {
  if (raw === undefined || raw === null) {
    return GUEST_QUEUE_ROWS_CAP_DEFAULT
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw)) {
    return GUEST_QUEUE_ROWS_CAP_DEFAULT
  }
  if (raw < GUEST_QUEUE_ROWS_CAP_MIN || raw > GUEST_QUEUE_ROWS_CAP_MAX) {
    return GUEST_QUEUE_ROWS_CAP_DEFAULT
  }
  return raw
}
