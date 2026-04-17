import { isPlausibleYoutubeVideoId } from '@/lib/party/partyMessages'

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'www.music.youtube.com',
])

function normalizePaste(input: string): string {
  let s = input.trim()
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim()
  }
  return s
}

function tryParseUrl(s: string): URL | null {
  try {
    return new URL(s)
  } catch {
    if (/^https?:\/\//i.test(s)) {
      return null
    }
    try {
      return new URL(`https://${s}`)
    } catch {
      return null
    }
  }
}

function isAllowedYoutubeHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'youtu.be') {
    return true
  }
  return ALLOWED_HOSTS.has(h)
}

const PATH_ID_PATTERNS = [
  /^\/shorts\/([^/?#]+)/i,
  /^\/embed\/([^/?#]+)/i,
  /^\/live\/([^/?#]+)/i,
  /^\/v\/([^/?#]+)/i,
] as const

function matchPathVideoId(pathname: string): string | null {
  for (const re of PATH_ID_PATTERNS) {
    const m = pathname.match(re)
    const seg = m?.[1]
    if (seg && isPlausibleYoutubeVideoId(seg)) {
      return seg
    }
  }
  return null
}

/**
 * Returns a plausible 11-character YouTube video id from pasted text (bare id or typical URL),
 * or null if none can be extracted. Aligns with host `isPlausibleYoutubeVideoId`.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const normalized = normalizePaste(input)
  if (!normalized) {
    return null
  }
  if (isPlausibleYoutubeVideoId(normalized)) {
    return normalized
  }

  const url = tryParseUrl(normalized)
  if (!url || !isAllowedYoutubeHost(url.hostname)) {
    return null
  }

  const host = url.hostname.toLowerCase()

  if (host === 'youtu.be') {
    const seg =
      url.pathname.replace(/^\//, '').split('/')[0]?.split('?')[0]?.split('#')[0] ?? ''
    return isPlausibleYoutubeVideoId(seg) ? seg : null
  }

  const v = url.searchParams.get('v')
  if (v) {
    const t = v.trim()
    if (isPlausibleYoutubeVideoId(t)) {
      return t
    }
  }

  const fromPath = matchPathVideoId(url.pathname)
  if (fromPath) {
    return fromPath
  }

  return null
}
