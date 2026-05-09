import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildYoutubeSearchApiUrl, searchYoutubeOnServer } from './searchYoutubeOnServer'

describe('searchYoutubeOnServer', () => {
  const fetchMock = vi.fn()
  const origFetch = globalThis.fetch

  beforeEach(() => {
    vi.stubEnv('VITE_SOCKET_URL', 'https://party.example')
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = origFetch
    vi.unstubAllEnvs()
  })

  it('buildYoutubeSearchApiUrl encodes query and page token', () => {
    expect(buildYoutubeSearchApiUrl('hello world', 'PTOK')).toBe(
      'https://party.example/api/v1/youtube/search?q=hello+world&pageToken=PTOK',
    )
    expect(buildYoutubeSearchApiUrl('a')).toBe('https://party.example/api/v1/youtube/search?q=a')
  })

  it('buildYoutubeSearchApiUrl returns null when socket URL missing', () => {
    vi.stubEnv('VITE_SOCKET_URL', '')
    expect(buildYoutubeSearchApiUrl('q')).toBeNull()
  })

  it('returns no_socket_url when VITE_SOCKET_URL is empty', async () => {
    vi.stubEnv('VITE_SOCKET_URL', '')
    const r = await searchYoutubeOnServer('test')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('no_socket_url')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps 503 search_unavailable', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () =>
        JSON.stringify({
          error: 'search_unavailable',
          message: 'YouTube search is not enabled on this server.',
        }),
    } as Response)

    const r = await searchYoutubeOnServer('bohemian')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('search_unavailable')
      expect(r.message).toContain('Video URL')
    }
  })

  it('maps 429 rate_limited with retry hint', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () =>
        JSON.stringify({
          error: 'rate_limited',
          message: 'Too many searches.',
          retryAfterSec: 42,
        }),
    } as Response)

    const r = await searchYoutubeOnServer('x')
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('rate_limited')
      expect(r.retryAfterSec).toBe(42)
      expect(r.message).toContain('42')
    }
  })

  it('maps 200 success body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [{ videoId: 'dQw4w9WgXcQ', title: 'Example' }],
          nextPageToken: 'N1',
        }),
    } as Response)

    const r = await searchYoutubeOnServer('rick')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.items).toEqual([{ videoId: 'dQw4w9WgXcQ', title: 'Example' }])
      expect(r.data.nextPageToken).toBe('N1')
    }
  })
})
