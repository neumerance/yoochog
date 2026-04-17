import { PARTY_QUEUE_TITLE_MAX_LENGTH } from '@/lib/party/partyMessages'

/** Default timeout for YouTube Data API title lookup (ms). */
export const YOUTUBE_VIDEO_TITLE_FETCH_TIMEOUT_MS = 8_000

const titleCache = new Map<string, string | null>()

/** Clears the in-memory title cache (e.g. between tests). */
export function clearYoutubeVideoTitleCache(): void {
  titleCache.clear()
}

function apiKey(): string | undefined {
  const k = import.meta.env.VITE_YOUTUBE_API_KEY
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : undefined
}

function clampTitle(title: string): string {
  let t = title.trim()
  if (t.length > PARTY_QUEUE_TITLE_MAX_LENGTH) {
    t = t.slice(0, PARTY_QUEUE_TITLE_MAX_LENGTH)
  }
  return t
}

async function fetchTitleFromDataApi(videoId: string, key: string): Promise<string | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', key)

  const ac = new AbortController()
  const timer = globalThis.setTimeout(() => ac.abort(), YOUTUBE_VIDEO_TITLE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), { signal: ac.signal })
    const data = (await res.json()) as {
      error?: { message?: string }
      items?: Array<{ snippet?: { title?: string } }>
    }
    if (data.error) {
      return null
    }
    if (!res.ok) {
      return null
    }
    const title = data.items?.[0]?.snippet?.title
    if (typeof title !== 'string' || title.trim().length === 0) {
      return null
    }
    return clampTitle(title)
  } catch {
    return null
  } finally {
    globalThis.clearTimeout(timer)
  }
}

/**
 * Public noembed.com endpoint (CORS-friendly) — works without a Data API key.
 * @see https://noembed.com/
 */
async function fetchTitleFromNoembed(videoId: string): Promise<string | null> {
  const pageUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
  const embedUrl = `https://noembed.com/embed?url=${encodeURIComponent(pageUrl)}`

  const ac = new AbortController()
  const timer = globalThis.setTimeout(() => ac.abort(), YOUTUBE_VIDEO_TITLE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(embedUrl, { signal: ac.signal })
    if (!res.ok) {
      return null
    }
    const data = (await res.json()) as { title?: string; error?: string }
    if (data.error || typeof data.title !== 'string' || data.title.trim().length === 0) {
      return null
    }
    return clampTitle(data.title)
  } catch {
    return null
  } finally {
    globalThis.clearTimeout(timer)
  }
}

/**
 * Resolves the public title for a valid 11-character video id.
 * Tries YouTube Data API v3 when `VITE_YOUTUBE_API_KEY` is set, then falls back to noembed.com.
 * Returns `null` when unavailable. Does not throw.
 */
export async function fetchYoutubeVideoTitle(videoId: string): Promise<string | null> {
  const hit = titleCache.get(videoId)
  if (hit !== undefined) {
    return hit
  }

  const key = apiKey()
  if (key) {
    const fromApi = await fetchTitleFromDataApi(videoId, key)
    if (fromApi) {
      titleCache.set(videoId, fromApi)
      return fromApi
    }
  }

  const fromNoembed = await fetchTitleFromNoembed(videoId)
  if (fromNoembed) {
    titleCache.set(videoId, fromNoembed)
    return fromNoembed
  }

  titleCache.set(videoId, null)
  return null
}
