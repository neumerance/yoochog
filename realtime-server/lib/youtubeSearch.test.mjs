import assert from 'node:assert/strict'
import test from 'node:test'

import {
  YOUTUBE_SEARCH_QUERY_MAX_LENGTH,
  buildGoogleSearchListUrl,
  clampYoutubeSearchTitle,
  createSearchRateLimiter,
  createSearchResponseCache,
  mapYoutubeSearchListPayload,
  normalizeYoutubeSearchQuery,
  youtubeSearchCacheKey,
} from './youtubeSearch.mjs'

test('normalizeYoutubeSearchQuery trims and collapses whitespace', () => {
  assert.equal(normalizeYoutubeSearchQuery('  foo   bar  '), 'foo bar')
  assert.equal(normalizeYoutubeSearchQuery('x'), 'x')
})

test('normalizeYoutubeSearchQuery rejects empty and non-string', () => {
  assert.equal(normalizeYoutubeSearchQuery(''), null)
  assert.equal(normalizeYoutubeSearchQuery('   '), null)
  assert.equal(normalizeYoutubeSearchQuery(/** @type {any} */ (null)), null)
})

test('normalizeYoutubeSearchQuery rejects over max length', () => {
  const q = 'a'.repeat(YOUTUBE_SEARCH_QUERY_MAX_LENGTH + 1)
  assert.equal(normalizeYoutubeSearchQuery(q), null)
})

test('clampYoutubeSearchTitle enforces max length', () => {
  const long = 'x'.repeat(250)
  assert.equal(clampYoutubeSearchTitle(long).length, 200)
  assert.equal(clampYoutubeSearchTitle('  hi  '), 'hi')
})

test('mapYoutubeSearchListPayload maps items and nextPageToken', () => {
  const payload = {
    items: [
      {
        id: { videoId: 'dQw4w9WgXcQ' },
        snippet: { title: '  Never Gonna Give You Up  ' },
      },
      { id: { videoId: 'short' }, snippet: { title: 'bad id' } },
    ],
    nextPageToken: 'NEXT',
  }
  const out = mapYoutubeSearchListPayload(payload)
  assert.equal(out.items.length, 1)
  assert.equal(out.items[0].videoId, 'dQw4w9WgXcQ')
  assert.equal(out.items[0].title, 'Never Gonna Give You Up')
  assert.equal(out.nextPageToken, 'NEXT')
})

test('mapYoutubeSearchListPayload handles empty / malformed', () => {
  assert.deepEqual(mapYoutubeSearchListPayload(null), { items: [] })
  assert.deepEqual(mapYoutubeSearchListPayload({}), { items: [] })
})

test('createSearchRateLimiter allows burst then blocks', () => {
  const lim = createSearchRateLimiter({ maxRequests: 3, windowMs: 60_000 })
  assert.equal(lim.check('a').ok, true)
  assert.equal(lim.check('a').ok, true)
  assert.equal(lim.check('a').ok, true)
  const fourth = lim.check('a')
  assert.equal(fourth.ok, false)
  assert.ok('retryAfterSec' in fourth && fourth.retryAfterSec >= 1)
})

test('createSearchResponseCache get/set and expiry', () => {
  const c = createSearchResponseCache({ ttlMs: 1000, maxEntries: 10 })
  assert.equal(c.get('k', 0), null)
  c.set('k', '{"a":1}', 0)
  assert.equal(c.get('k', 100), '{"a":1}')
  assert.equal(c.get('k', 2000), null)
})

test('youtubeSearchCacheKey separates query and page', () => {
  assert.notEqual(youtubeSearchCacheKey('a', ''), youtubeSearchCacheKey('a', 't2'))
})

test('buildGoogleSearchListUrl includes embeddable and optional pageToken', () => {
  const u = buildGoogleSearchListUrl({ apiKey: 'KEY', q: 'karaoke', pageToken: 'PTOK' })
  const parsed = new URL(u)
  assert.equal(parsed.hostname, 'www.googleapis.com')
  assert.equal(parsed.searchParams.get('key'), 'KEY')
  assert.equal(parsed.searchParams.get('q'), 'karaoke')
  assert.equal(parsed.searchParams.get('type'), 'video')
  assert.equal(parsed.searchParams.get('videoEmbeddable'), 'true')
  assert.equal(parsed.searchParams.get('pageToken'), 'PTOK')
})

test('buildGoogleSearchListUrl omits pageToken when absent', () => {
  const u = buildGoogleSearchListUrl({ apiKey: 'KEY', q: 'karaoke' })
  assert.equal(new URL(u).searchParams.get('pageToken'), null)
})
