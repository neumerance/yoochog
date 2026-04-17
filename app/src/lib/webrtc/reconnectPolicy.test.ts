import { describe, expect, it, vi } from 'vitest'

import {
  nextDelayMs,
  RECONNECT_BASE_DELAY_MS,
  RECONNECT_MAX_ATTEMPTS,
  RECONNECT_MAX_DELAY_MS,
  shouldStopRetry,
} from './reconnectPolicy'

describe('reconnectPolicy', () => {
  it('shouldStopRetry is true at and beyond max attempts', () => {
    expect(shouldStopRetry(0)).toBe(false)
    expect(shouldStopRetry(RECONNECT_MAX_ATTEMPTS - 1)).toBe(false)
    expect(shouldStopRetry(RECONNECT_MAX_ATTEMPTS)).toBe(true)
  })

  it('nextDelayMs uses full jitter within the exponential cap', () => {
    const mockRandom = vi.fn().mockReturnValue(0.5)
    const d0 = nextDelayMs(0, mockRandom)
    expect(d0).toBe(Math.floor(0.5 * Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS)))
    const d5 = nextDelayMs(5, mockRandom)
    const cap5 = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_BASE_DELAY_MS * Math.pow(2, 5))
    expect(d5).toBe(Math.floor(0.5 * cap5))
  })

  it('nextDelayMs clamps exponential growth at RECONNECT_MAX_DELAY_MS', () => {
    const mockRandom = vi.fn().mockReturnValue(1)
    const d = nextDelayMs(32, mockRandom)
    expect(d).toBe(RECONNECT_MAX_DELAY_MS)
  })

  it('nextDelayMs returns 0 for negative attempt index', () => {
    expect(nextDelayMs(-1, () => 0.5)).toBe(0)
  })
})
