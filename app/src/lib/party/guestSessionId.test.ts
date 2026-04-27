import { describe, expect, it } from 'vitest'

import { guestSessionIdFromRouteParam } from './guestSessionId'

describe('guestSessionIdFromRouteParam', () => {
  it('returns empty for blank input', () => {
    expect(guestSessionIdFromRouteParam('   ')).toBe('')
  })

  it('decodes a single encoded segment', () => {
    expect(guestSessionIdFromRouteParam('a%2Fb%20c')).toBe('a/b c')
  })
})
