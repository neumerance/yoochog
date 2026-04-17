import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearYoutubeVideoTitleCache, fetchYoutubeVideoTitle } from './fetchYoutubeVideoTitle'

describe('fetchYoutubeVideoTitle', () => {
  const fetchMock = vi.fn()
  const origFetch = globalThis.fetch

  beforeEach(() => {
    clearYoutubeVideoTitleCache()
    vi.stubEnv('VITE_YOUTUBE_API_KEY', '')
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = origFetch
    vi.unstubAllEnvs()
  })

  it('uses noembed when Data API key is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ title: 'Rick Roll' }),
    } as Response)

    const r = await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(r).toBe('Rick Roll')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('noembed.com')
  })

  it('uses Data API when key is set and succeeds', async () => {
    vi.stubEnv('VITE_YOUTUBE_API_KEY', 'test-key')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ snippet: { title: '  API Title  ' } }],
      }),
    } as Response)

    const r = await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(r).toBe('API Title')
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('googleapis.com')
  })

  it('falls back to noembed when Data API returns error JSON', async () => {
    vi.stubEnv('VITE_YOUTUBE_API_KEY', 'bad-key')
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: { message: 'quota' },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ title: 'Fallback' }),
      } as Response)

    const r = await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(r).toBe('Fallback')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when all sources fail', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500 } as Response)

    expect(await fetchYoutubeVideoTitle('dQw4w9WgXcQ')).toBeNull()
  })

  it('caches repeated lookups for the same id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ title: 'Cached' }),
    } as Response)

    await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
