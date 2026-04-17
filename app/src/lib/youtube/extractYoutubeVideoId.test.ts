import { describe, expect, it } from 'vitest'

import { extractYoutubeVideoId } from './extractYoutubeVideoId'

describe('extractYoutubeVideoId', () => {
  const id = 'dQw4w9WgXcQ'

  it('accepts a bare 11-character id', () => {
    expect(extractYoutubeVideoId(id)).toBe(id)
  })

  it('trims whitespace and strips surrounding quotes', () => {
    expect(extractYoutubeVideoId(`  ${id}  `)).toBe(id)
    expect(extractYoutubeVideoId(`"${id}"`)).toBe(id)
    expect(extractYoutubeVideoId(`'${id}'`)).toBe(id)
  })

  it('parses watch URLs with v=', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/watch?v=${id}`)).toBe(id)
    expect(extractYoutubeVideoId(`http://youtube.com/watch?v=${id}&list=PLx`)).toBe(id)
    expect(extractYoutubeVideoId(`https://m.youtube.com/watch?v=${id}`)).toBe(id)
  })

  it('parses watch URLs without scheme (https assumed)', () => {
    expect(extractYoutubeVideoId(`www.youtube.com/watch?v=${id}`)).toBe(id)
  })

  it('parses youtu.be short links', () => {
    expect(extractYoutubeVideoId(`https://youtu.be/${id}`)).toBe(id)
    expect(extractYoutubeVideoId(`https://youtu.be/${id}?si=abc`)).toBe(id)
  })

  it('parses Shorts paths', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/shorts/${id}`)).toBe(id)
  })

  it('parses embed and live paths', () => {
    expect(extractYoutubeVideoId(`https://www.youtube.com/embed/${id}`)).toBe(id)
    expect(extractYoutubeVideoId(`https://www.youtube.com/live/${id}`)).toBe(id)
  })

  it('parses music.youtube.com watch URLs', () => {
    expect(extractYoutubeVideoId(`https://music.youtube.com/watch?v=${id}`)).toBe(id)
  })

  it('rejects empty and non-id strings', () => {
    expect(extractYoutubeVideoId('')).toBeNull()
    expect(extractYoutubeVideoId('   ')).toBeNull()
    expect(extractYoutubeVideoId('not-a-url')).toBeNull()
  })

  it('rejects wrong-length bare tokens', () => {
    expect(extractYoutubeVideoId('short')).toBeNull()
    expect(extractYoutubeVideoId('dQw4w9WgXcQextra')).toBeNull()
  })

  it('rejects URLs on non-YouTube hosts', () => {
    expect(extractYoutubeVideoId(`https://example.com/watch?v=${id}`)).toBeNull()
  })

  it('rejects watch URLs with invalid v=', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=bad')).toBeNull()
  })

  it('rejects ambiguous strings with no plausible id', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch')).toBeNull()
  })
})
