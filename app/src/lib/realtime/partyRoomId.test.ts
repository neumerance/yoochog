import { describe, expect, it } from 'vitest'

import { partySessionRoomId } from './partyRoomId'

describe('partySessionRoomId', () => {
  it('prefixes session id per ADR 0001 / 0006', () => {
    expect(partySessionRoomId('abc')).toBe('yoochog:party:abc')
  })
})
