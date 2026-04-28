import {
  buildGoogleSearchListUrl,
  createSearchRateLimiter,
  createSearchResponseCache,
  DEFAULT_YOUTUBE_SEARCH_CACHE_MAX_ENTRIES,
  DEFAULT_YOUTUBE_SEARCH_CACHE_TTL_MS,
  DEFAULT_YOUTUBE_SEARCH_RATE_LIMIT_PER_MINUTE,
  mapYoutubeSearchListPayload,
  normalizeYoutubeSearchQuery,
  youtubeSearchCacheKey,
} from './youtubeSearch.mjs'

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {string}
 */
export function youtubeSearchClientKey(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim() || 'unknown'
  }
  const addr = req.socket?.remoteAddress
  return typeof addr === 'string' && addr.length > 0 ? addr : 'unknown'
}

/**
 * @param {boolean | string} allowOrigin
 * @param {import('node:http').IncomingMessage} req
 * @returns {Record<string, string>}
 */
export function corsHeadersForYoutubeSearch(allowOrigin, req) {
  const reqOrigin = req.headers.origin
  if (allowOrigin === true) {
    const o = typeof reqOrigin === 'string' && reqOrigin.length > 0 ? reqOrigin : '*'
    return {
      'Access-Control-Allow-Origin': o,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }
  const allowed = typeof allowOrigin === 'string' ? allowOrigin.trim() : ''
  if (allowed.length === 0) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    }
  }
  const originHeader = typeof reqOrigin === 'string' ? reqOrigin : ''
  const value = originHeader === allowed ? originHeader : allowed
  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

/**
 * @param {{
 *   apiKey: string | undefined,
 *   allowOrigin: boolean | string,
 *   fetchFn?: typeof fetch,
 *   cacheTtlMs?: number,
 *   cacheMaxEntries?: number,
 *   rateLimitPerMinute?: number,
 *   log?: (line: string) => void,
 * }} config
 */
export function createYoutubeSearchApiHandler(config) {
  const fetchFn = config.fetchFn ?? globalThis.fetch
  const cache = createSearchResponseCache({
    ttlMs: config.cacheTtlMs ?? DEFAULT_YOUTUBE_SEARCH_CACHE_TTL_MS,
    maxEntries: config.cacheMaxEntries ?? DEFAULT_YOUTUBE_SEARCH_CACHE_MAX_ENTRIES,
  })
  const limitPerMin = config.rateLimitPerMinute ?? DEFAULT_YOUTUBE_SEARCH_RATE_LIMIT_PER_MINUTE
  const rateLimiter = createSearchRateLimiter({
    maxRequests: limitPerMin,
    windowMs: 60_000,
  })
  const log = config.log ?? ((line) => console.log(line))

  /**
   * @param {import('node:http').IncomingMessage} req
   * @param {import('node:http').ServerResponse} res
   * @param {URL} url
   */
  return async function handleYoutubeSearch(req, res, url) {
    const cors = corsHeadersForYoutubeSearch(config.allowOrigin, req)

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors)
      res.end()
      return
    }

    if (req.method !== 'GET') {
      res.writeHead(405, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'method_not_allowed', message: 'Use GET.' }))
      return
    }

    const apiKey = config.apiKey?.trim()
    if (!apiKey) {
      res.writeHead(503, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          error: 'search_unavailable',
          message: 'YouTube search is not enabled on this server. Use “Paste a YouTube link” instead.',
        }),
      )
      return
    }

    const rawQ = url.searchParams.get('q') ?? ''
    const q = normalizeYoutubeSearchQuery(rawQ)
    if (!q) {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          error: 'invalid_query',
          message: 'Enter a short search phrase and try again.',
        }),
      )
      return
    }

    const pageToken = url.searchParams.get('pageToken')?.trim() ?? ''
    if (pageToken.length > 500) {
      res.writeHead(400, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: 'invalid_page_token', message: 'Invalid pagination token.' }))
      return
    }

    const client = youtubeSearchClientKey(req)
    const rl = rateLimiter.check(client)
    if (!rl.ok) {
      log(`[youtube-search] rate_limited key=${client}`)
      res.writeHead(429, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          error: 'rate_limited',
          message: 'Too many searches. Wait a moment or paste a YouTube link instead.',
          retryAfterSec: rl.retryAfterSec,
        }),
      )
      return
    }

    const ckey = youtubeSearchCacheKey(q, pageToken)
    const cached = cache.get(ckey)
    if (cached) {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'X-Cache': 'HIT' })
      res.end(cached)
      return
    }

    const googleUrl = buildGoogleSearchListUrl({
      apiKey,
      q,
      pageToken: pageToken.length > 0 ? pageToken : undefined,
    })

    try {
      const gRes = await fetchFn(googleUrl, { method: 'GET' })
      const text = await gRes.text()
      /** @type {unknown} */
      let data
      try {
        data = JSON.parse(text)
      } catch {
        data = null
      }

      if (!gRes.ok) {
        const errObj = data && typeof data === 'object' ? /** @type {{ error?: { errors?: Array<{ reason?: string }> } }} */ (data) : null
        const reason = errObj?.error?.errors?.[0]?.reason
        if (gRes.status === 403 && reason === 'quotaExceeded') {
          log('[youtube-search] google_quota pressure (403 quotaExceeded)')
        } else if (gRes.status === 429) {
          log('[youtube-search] google_429')
        } else {
          log(`[youtube-search] google_error status=${gRes.status}`)
        }
        res.writeHead(502, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
        res.end(
          JSON.stringify({
            error: 'upstream_error',
            message: 'Search is temporarily unavailable. Try “Paste a YouTube link” from YouTube → Share.',
          }),
        )
        return
      }

      const mapped = mapYoutubeSearchListPayload(data)
      const body = JSON.stringify(mapped)
      cache.set(ckey, body)
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'X-Cache': 'MISS' })
      res.end(body)
    } catch (e) {
      log(`[youtube-search] fetch_failed ${e instanceof Error ? e.message : 'unknown'}`)
      res.writeHead(502, { ...cors, 'Content-Type': 'application/json; charset=utf-8' })
      res.end(
        JSON.stringify({
          error: 'upstream_error',
          message: 'Could not reach YouTube. Check your connection or paste a link instead.',
        }),
      )
    }
  }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {URL | null}
 */
export function parseRequestUrl(req) {
  try {
    const host = req.headers.host ?? '127.0.0.1'
    return new URL(req.url ?? '/', `http://${host}`)
  } catch {
    return null
  }
}
