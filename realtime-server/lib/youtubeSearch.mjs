/**
 * YouTube Data API v3 search.list helpers (server-only).
 * Title clamp: keep in sync with `app/src/lib/party/partyMessages.ts` PARTY_QUEUE_TITLE_MAX_LENGTH.
 */
export const YOUTUBE_SEARCH_TITLE_MAX_LENGTH = 200

/** Max length for normalized search query string (bytes-ish; YouTube accepts long q but we bound abuse). */
export const YOUTUBE_SEARCH_QUERY_MAX_LENGTH = 200

/** Default searches per client key per rolling minute (override with env on server). */
export const DEFAULT_YOUTUBE_SEARCH_RATE_LIMIT_PER_MINUTE = 20

/** Default in-memory cache TTL (ms). */
export const DEFAULT_YOUTUBE_SEARCH_CACHE_TTL_MS = 600_000 // 10 minutes

/** Default max cache entries before evicting oldest. */
export const DEFAULT_YOUTUBE_SEARCH_CACHE_MAX_ENTRIES = 500

/**
 * @param {string} raw
 * @returns {string | null} normalized query or null if empty / too long
 */
export function normalizeYoutubeSearchQuery(raw) {
  if (typeof raw !== 'string') {
    return null
  }
  const collapsed = raw.trim().replace(/\s+/g, ' ')
  if (collapsed.length === 0) {
    return null
  }
  if (collapsed.length > YOUTUBE_SEARCH_QUERY_MAX_LENGTH) {
    return null
  }
  return collapsed
}

/**
 * @param {string} title
 * @returns {string}
 */
export function clampYoutubeSearchTitle(title) {
  let t = String(title).trim()
  if (t.length > YOUTUBE_SEARCH_TITLE_MAX_LENGTH) {
    t = t.slice(0, YOUTUBE_SEARCH_TITLE_MAX_LENGTH)
  }
  return t
}

/**
 * Map YouTube search.list JSON body to our API shape.
 * @param {unknown} data
 * @returns {{ items: Array<{ videoId: string, title: string }>, nextPageToken?: string }}
 */
export function mapYoutubeSearchListPayload(data) {
  if (!data || typeof data !== 'object') {
    return { items: [] }
  }
  const d = /** @type {{ items?: unknown, nextPageToken?: unknown }} */ (data)
  const rawItems = Array.isArray(d.items) ? d.items : []
  /** @type {Array<{ videoId: string, title: string }>} */
  const items = []
  for (const it of rawItems) {
    if (!it || typeof it !== 'object') {
      continue
    }
    const row = /** @type {{ id?: unknown, snippet?: unknown }} */ (it)
    const idObj = row.id && typeof row.id === 'object' ? /** @type {{ videoId?: unknown }} */ (row.id) : null
    const vid = idObj && typeof idObj.videoId === 'string' ? idObj.videoId.trim() : ''
    if (vid.length !== 11) {
      continue
    }
    const sn = row.snippet && typeof row.snippet === 'object' ? /** @type {{ title?: unknown }} */ (row.snippet) : null
    const titleRaw = sn && typeof sn.title === 'string' ? sn.title : ''
    const title = clampYoutubeSearchTitle(titleRaw)
    if (!title) {
      continue
    }
    items.push({ videoId: vid, title })
  }
  const next =
    typeof d.nextPageToken === 'string' && d.nextPageToken.length > 0 ? d.nextPageToken : undefined
  return next ? { items, nextPageToken: next } : { items }
}

/**
 * Sliding-window rate limiter (per logical client key, e.g. IP).
 * @param {{ maxRequests: number, windowMs: number }} opts
 */
export function createSearchRateLimiter({ maxRequests, windowMs }) {
  /** @type {Map<string, number[]>} */
  const buckets = new Map()

  /**
   * @param {string} key
   * @param {number} [now]
   * @returns {{ ok: true } | { ok: false, retryAfterSec: number }}
   */
  function check(key, now = Date.now()) {
    const cutoff = now - windowMs
    const prev = buckets.get(key) ?? []
    const recent = prev.filter((t) => t > cutoff)
    if (recent.length >= maxRequests) {
      const oldest = recent[0]
      const retryAfterMs = Math.max(0, windowMs - (now - oldest))
      return { ok: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) }
    }
    recent.push(now)
    buckets.set(key, recent)
    return { ok: true }
  }

  return { check }
}

/**
 * @param {{ ttlMs: number, maxEntries: number }} opts
 */
export function createSearchResponseCache({ ttlMs, maxEntries }) {
  /** @type {Map<string, { expiresAt: number, payload: string }>} */
  const map = new Map()

  /**
   * @param {string} key
   * @returns {string | null} JSON body or null
   */
  function get(key, now = Date.now()) {
    const e = map.get(key)
    if (!e) {
      return null
    }
    if (e.expiresAt <= now) {
      map.delete(key)
      return null
    }
    return e.payload
  }

  /**
   * @param {string} key
   * @param {string} jsonBody
   */
  function set(key, jsonBody, now = Date.now()) {
    while (map.size >= maxEntries) {
      const first = map.keys().next().value
      if (first === undefined) {
        break
      }
      map.delete(first)
    }
    map.set(key, { expiresAt: now + ttlMs, payload: jsonBody })
  }

  return { get, set }
}

/**
 * @param {{ apiKey: string, q: string, pageToken?: string }} opts
 * @returns {string}
 */
export function buildGoogleSearchListUrl({ apiKey, q, pageToken }) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('type', 'video')
  url.searchParams.set('videoEmbeddable', 'true')
  url.searchParams.set('maxResults', '15')
  url.searchParams.set('q', q)
  url.searchParams.set('key', apiKey)
  if (pageToken && pageToken.length > 0) {
    url.searchParams.set('pageToken', pageToken)
  }
  return url.toString()
}

/**
 * Stable cache key for query + pagination.
 * @param {string} normalizedQ
 * @param {string} [pageToken]
 */
export function youtubeSearchCacheKey(normalizedQ, pageToken = '') {
  return `${normalizedQ}\0${pageToken}`
}
