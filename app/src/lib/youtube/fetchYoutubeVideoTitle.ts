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

/**
 * Resolves the public title for a valid 11-character video id via YouTube Data API v3 `videos.list`.
 * Returns `null` when the key is missing, the request fails, times out, or the title is unavailable.
 * Does not throw.
 */
export async function fetchYoutubeVideoTitle(videoId: string): Promise<string | null> {
  const key = apiKey()
  if (!key) {
    return null
  }
  const hit = titleCache.get(videoId)
  if (hit !== undefined) {
    return hit
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', key)

  const ac = new AbortController()
  const timer = globalThis.setTimeout(() => ac.abort(), YOUTUBE_VIDEO_TITLE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url.toString(), { signal: ac.signal })
    if (!res.ok) {
      titleCache.set(videoId, null)
      return null
    }
    const data = (await res.json()) as {
      items?: Array<{ snippet?: { title?: string } }>
    }
    const title = data.items?.[0]?.snippet?.title
    if (typeof title !== 'string' || title.trim().length === 0) {
      titleCache.set(videoId, null)
      return null
    }
    let trimmed = title.trim()
    if (trimmed.length > PARTY_QUEUE_TITLE_MAX_LENGTH) {
      trimmed = trimmed.slice(0, PARTY_QUEUE_TITLE_MAX_LENGTH)
    }
    titleCache.set(videoId, trimmed)
    return trimmed
  } catch {
    titleCache.set(videoId, null)
    return null
  } finally {
    globalThis.clearTimeout(timer)
  }
}
