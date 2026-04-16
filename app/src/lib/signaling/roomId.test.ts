import { describe, expect, it } from 'vitest'

import { signalingRoomId } from './roomId'

describe('signalingRoomId', () => {
  it('prefixes session id per ADR 0001', () => {
    expect(signalingRoomId('abc')).toBe('yoochog:party:abc')
  })
})
