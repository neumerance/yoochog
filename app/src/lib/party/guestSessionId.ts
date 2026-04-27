/**
 * Normalizes the join route `sessionId` param (opaque party id; see ADR 0001 / 0006).
 * Applies `decodeURIComponent` once for encoded path segments.
 */
export function guestSessionIdFromRouteParam(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return ''
  }
  try {
    return decodeURIComponent(trimmed)
  } catch {
    return trimmed
  }
}
