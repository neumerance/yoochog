/**
 * Canonical full URL for guest join links and QR payloads.
 *
 * Any feature that shares a join link or renders a QR code must use this helper
 * so the encoded URL matches {@link https://github.com/neumerance/yoochog/blob/master/docs/github-pages.md docs/github-pages.md}.
 */
export function buildGuestJoinUrl(
  sessionId: string,
  config: { origin: string; baseUrl: string },
): string {
  const pathname = joinGuestPathname(config.baseUrl, sessionId)
  return new URL(pathname, config.origin).href
}

function joinGuestPathname(baseUrl: string, sessionId: string): string {
  const segments = baseUrl.split('/').filter(Boolean)
  const idSegment = encodeURIComponent(sessionId)
  const all = [...segments, 'join', idSegment]
  return `/${all.join('/')}`
}

/**
 * Same as {@link buildGuestJoinUrl} using the current page origin and Vite `BASE_URL`
 * (for in-app share / QR when those features exist).
 */
export function buildGuestJoinUrlFromEnv(sessionId: string): string {
  return buildGuestJoinUrl(sessionId, {
    origin: window.location.origin,
    baseUrl: import.meta.env.BASE_URL,
  })
}
