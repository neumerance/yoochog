import { describe, expect, it } from 'vitest'

import { RECONNECT_MAX_ATTEMPTS, shouldStopRetry } from './reconnectPolicy'

describe('reconnectPolicy', () => {
  it('shouldStopRetry is true at and beyond max attempts', () => {
    expect(shouldStopRetry(0)).toBe(false)
    expect(shouldStopRetry(RECONNECT_MAX_ATTEMPTS - 1)).toBe(false)
    expect(shouldStopRetry(RECONNECT_MAX_ATTEMPTS)).toBe(true)
  })
})
