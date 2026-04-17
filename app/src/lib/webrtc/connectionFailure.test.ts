import { describe, expect, it } from 'vitest'

import {
  isImmediateConnectionLoss,
  isImmediateIceFailure,
  isTransientConnectionDisconnected,
  isTransientIceDisconnected,
} from './connectionFailure'

describe('connectionFailure', () => {
  it('classifies terminal connection states', () => {
    expect(isImmediateConnectionLoss('failed')).toBe(true)
    expect(isImmediateConnectionLoss('closed')).toBe(true)
    expect(isImmediateConnectionLoss('disconnected')).toBe(false)
    expect(isImmediateConnectionLoss('connected')).toBe(false)
    expect(isTransientConnectionDisconnected('disconnected')).toBe(true)
  })

  it('classifies ICE states', () => {
    expect(isImmediateIceFailure('failed')).toBe(true)
    expect(isImmediateIceFailure('closed')).toBe(true)
    expect(isImmediateIceFailure('disconnected')).toBe(false)
    expect(isTransientIceDisconnected('disconnected')).toBe(true)
  })
})
