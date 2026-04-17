import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { clearYoutubeVideoTitleCache, fetchYoutubeVideoTitle } from './fetchYoutubeVideoTitle'

describe('fetchYoutubeVideoTitle', () => {
  const fetchMock = vi.fn()
  const origFetch = globalThis.fetch

  beforeEach(() => {
    clearYoutubeVideoTitleCache()
    vi.stubEnv('VITE_YOUTUBE_API_KEY', 'test-key')
    fetchMock.mockReset()
    globalThis.fetch = fetchMock as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = origFetch
    vi.unstubAllEnvs()
  })

  it('returns null when API key is missing', async () => {
    vi.stubEnv('VITE_YOUTUBE_API_KEY', '')
    const r = await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(r).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns title on success JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{ snippet: { title: '  Never Gonna Give You Up  ' } }],
      }),
    } as Response)

    const r = await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(r).toBe('Never Gonna Give You Up')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null on 403', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 } as Response)
    expect(await fetchYoutubeVideoTitle('aaaaaaaaaaa')).toBeNull()
  })

  it('returns null on network error', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    expect(await fetchYoutubeVideoTitle('bbbbbbbbbbb')).toBeNull()
  })

  it('caches repeated lookups for the same id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ snippet: { title: 'Cached' } }] }),
    } as Response)

    await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    await fetchYoutubeVideoTitle('dQw4w9WgXcQ')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
