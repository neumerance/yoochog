/**
 * Derives a WebSocket URL from `VITE_SIGNALING_URL` (ADR 0001 base URL).
 * - `http:` → `ws:`, `https:` → `wss:`
 * - `ws:` / `wss:` are passed through unchanged
 * - Pathname, search, and hash are preserved
 */
export function websocketUrlFromSignalingBase(base: string): string {
  const u = new URL(base)
  if (u.protocol === 'http:') {
    u.protocol = 'ws:'
  } else if (u.protocol === 'https:') {
    u.protocol = 'wss:'
  } else if (u.protocol !== 'ws:' && u.protocol !== 'wss:') {
    throw new Error(`Unsupported signaling URL scheme: ${u.protocol}`)
  }
  return u.toString()
}
