import { describe, expect, it } from 'vitest'

import { buildGuestJoinUrl } from './buildGuestJoinUrl'

describe('buildGuestJoinUrl', () => {
  it('builds production-shaped URL with /yoochog/ base and no double slashes', () => {
    const href = buildGuestJoinUrl('abc-123', {
      origin: 'https://neumerance.github.io',
      baseUrl: '/yoochog/',
    })
    expect(href).toBe('https://neumerance.github.io/yoochog/join/abc-123')
  })

  it('works with dev base /', () => {
    const href = buildGuestJoinUrl('demo', {
      origin: 'http://localhost:5173',
      baseUrl: '/',
    })
    expect(href).toBe('http://localhost:5173/join/demo')
  })

  it('works with a custom subpath (self-hosted `VITE_BASE_PATH`)', () => {
    const href = buildGuestJoinUrl('sid-1', {
      origin: 'https://yoochog.example.com',
      baseUrl: '/watch/',
    })
    expect(href).toBe('https://yoochog.example.com/watch/join/sid-1')
  })

  it('encodes reserved characters in the session id for the path segment', () => {
    const href = buildGuestJoinUrl('a/b c', {
      origin: 'https://example.com',
      baseUrl: '/yoochog/',
    })
    expect(href).toBe('https://example.com/yoochog/join/a%2Fb%20c')
  })

  it('guest join QR payload matches canonical GitHub Pages guest URL (issue #21)', () => {
    const sessionId = 'test-session-id'
    const href = buildGuestJoinUrl(sessionId, {
      origin: 'https://neumerance.github.io',
      baseUrl: '/yoochog/',
    })
    expect(href).toBe('https://neumerance.github.io/yoochog/join/test-session-id')
  })
})
