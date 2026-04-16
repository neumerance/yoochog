/**
 * Normalizes the join route `sessionId` param (opaque party id per ADR 0001).
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
