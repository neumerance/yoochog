import { partySocketBaseUrl } from '@/lib/realtime/partySocket'

/** Response item from realtime-server `GET /api/v1/youtube/search`. */
export type YoutubeSearchItem = {
  videoId: string
  title: string
}

export type YoutubeSearchSuccessBody = {
  items: YoutubeSearchItem[]
  nextPageToken?: string
}

export type YoutubeSearchFailureCode =
  | 'no_socket_url'
  | 'search_unavailable'
  | 'invalid_query'
  | 'invalid_page_token'
  | 'rate_limited'
  | 'upstream_error'
  | 'method_not_allowed'
  | 'bad_response'
  | 'network'

export type YoutubeSearchResult =
  | { ok: true; data: YoutubeSearchSuccessBody }
  | { ok: false; code: YoutubeSearchFailureCode; message: string; retryAfterSec?: number }

const SERVER_MESSAGE_PASTE_HINT =
  ' You can also open the “Paste a YouTube link” tab and add a song with a link from YouTube → Share → Copy link.'

export function buildYoutubeSearchApiUrl(query: string, pageToken?: string): string | null {
  const base = partySocketBaseUrl()
  if (!base) {
    return null
  }
  const root = base.replace(/\/$/, '')
  const u = new URL(`${root}/api/v1/youtube/search`)
  u.searchParams.set('q', query)
  if (pageToken && pageToken.length > 0) {
    u.searchParams.set('pageToken', pageToken)
  }
  return u.toString()
}

function userMessageForFailure(
  code: YoutubeSearchFailureCode,
  serverMessage: string | undefined,
  retryAfterSec?: number,
): string {
  if (code === 'rate_limited' && retryAfterSec !== undefined && retryAfterSec > 0) {
    return `Too many searches. Wait about ${retryAfterSec}s or use “Paste a YouTube link” below (YouTube → Share → Copy link).`
  }
  if (typeof serverMessage === 'string' && serverMessage.trim().length > 0) {
    return `${serverMessage.trim()}${SERVER_MESSAGE_PASTE_HINT}`
  }
  switch (code) {
    case 'no_socket_url':
      return 'This app is not connected to a party server, so search is unavailable. Use “Paste a YouTube link” with a link from YouTube → Share → Copy link.'
    case 'search_unavailable':
      return 'Search is not available on this party right now. Use “Paste a YouTube link” with a link from YouTube → Share → Copy link.'
    case 'invalid_query':
      return 'Try a shorter search phrase. You can also paste a link from YouTube → Share → Copy link.'
    case 'invalid_page_token':
      return 'Could not load more results. Try a new search or paste a YouTube link.'
    case 'upstream_error':
      return 'Search hit a temporary problem. Try again in a moment, or use “Paste a YouTube link” from YouTube → Share → Copy link.'
    case 'bad_response':
      return 'Unexpected response from the party server. Try “Paste a YouTube link” instead.'
    case 'network':
      return 'Could not reach the party server. Check your connection, or paste a YouTube link from YouTube → Share → Copy link.'
    default:
      return 'Something went wrong. Use “Paste a YouTube link” from YouTube → Share → Copy link.'
  }
}

/**
 * Keyword YouTube search via the realtime server (never uses a browser-exposed Data API key).
 */
export async function searchYoutubeOnServer(
  query: string,
  options?: { pageToken?: string; signal?: AbortSignal },
): Promise<YoutubeSearchResult> {
  const q = query.trim()
  if (!q) {
    return {
      ok: false,
      code: 'invalid_query',
      message: userMessageForFailure('invalid_query', undefined),
    }
  }

  const url = buildYoutubeSearchApiUrl(q, options?.pageToken)
  if (!url) {
    return {
      ok: false,
      code: 'no_socket_url',
      message: userMessageForFailure('no_socket_url', undefined),
    }
  }

  try {
    const res = await fetch(url, { method: 'GET', signal: options?.signal })
    let body: unknown
    const text = await res.text()
    try {
      body = text.length > 0 ? JSON.parse(text) : null
    } catch {
      return {
        ok: false,
        code: 'bad_response',
        message: userMessageForFailure('bad_response', undefined),
      }
    }

    const obj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
    const err = typeof obj?.error === 'string' ? obj.error : undefined
    const msg = typeof obj?.message === 'string' ? obj.message : undefined
    const retryRaw = obj?.retryAfterSec
    const retryAfterSec =
      typeof retryRaw === 'number' && Number.isFinite(retryRaw) ? Math.max(0, Math.round(retryRaw)) : undefined

    if (res.ok) {
      const itemsRaw = obj?.items
      if (!Array.isArray(itemsRaw)) {
        return {
          ok: false,
          code: 'bad_response',
          message: userMessageForFailure('bad_response', undefined),
        }
      }
      const items: YoutubeSearchItem[] = []
      for (const row of itemsRaw) {
        if (!row || typeof row !== 'object') {
          continue
        }
        const r = row as { videoId?: unknown; title?: unknown }
        const videoId = typeof r.videoId === 'string' ? r.videoId.trim() : ''
        const title = typeof r.title === 'string' ? r.title.trim() : ''
        if (videoId.length === 11 && title.length > 0) {
          items.push({ videoId, title })
        }
      }
      const nextToken = obj?.nextPageToken
      const next =
        typeof nextToken === 'string' && nextToken.length > 0 ? nextToken : undefined
      return { ok: true, data: next ? { items, nextPageToken: next } : { items } }
    }

    const code = (err ?? 'upstream_error') as YoutubeSearchFailureCode
    const mapped: YoutubeSearchFailureCode =
      code === 'search_unavailable'
      || code === 'invalid_query'
      || code === 'invalid_page_token'
      || code === 'rate_limited'
      || code === 'upstream_error'
      || code === 'method_not_allowed'
        ? code
        : 'upstream_error'

    return {
      ok: false,
      code: mapped,
      message: userMessageForFailure(mapped, msg, retryAfterSec),
      retryAfterSec: mapped === 'rate_limited' ? retryAfterSec : undefined,
    }
  } catch {
    return {
      ok: false,
      code: 'network',
      message: userMessageForFailure('network', undefined),
    }
  }
}
