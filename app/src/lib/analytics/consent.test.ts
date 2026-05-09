import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsConsent,
  saveAnalyticsConsent,
} from './consent'

describe('analytics consent', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => {
          store[k] = v
        },
        removeItem: (k: string) => {
          delete store[k]
        },
        clear: () => {
          store = {}
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() {
          return Object.keys(store).length
        },
      } as Storage,
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a stable localStorage key', () => {
    expect(ANALYTICS_CONSENT_KEY).toBe('yoochog.analyticsConsent')
  })

  it('returns undecided when unset', () => {
    expect(readAnalyticsConsent()).toBe('undecided')
  })

  it('returns accepted after save', () => {
    expect(saveAnalyticsConsent('accepted')).toBe(true)
    expect(store[ANALYTICS_CONSENT_KEY]).toBe('accepted')
    expect(readAnalyticsConsent()).toBe('accepted')
  })

  it('returns declined after save', () => {
    expect(saveAnalyticsConsent('declined')).toBe(true)
    expect(readAnalyticsConsent()).toBe('declined')
  })

  it('returns false from save when setItem fails', () => {
    vi.stubGlobal(
      'localStorage',
      {
        getItem: (k: string) => store[k] ?? null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: (k: string) => {
          delete store[k]
        },
        clear: () => {
          store = {}
        },
        key: (i: number) => Object.keys(store)[i] ?? null,
        get length() {
          return Object.keys(store).length
        },
      } as Storage,
    )
    expect(saveAnalyticsConsent('accepted')).toBe(false)
  })

  it('returns undecided from read when getItem throws', () => {
    vi.stubGlobal(
      'localStorage',
      {
        getItem: () => {
          throw new Error('SecurityError')
        },
        setItem: () => {},
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      } as Storage,
    )
    expect(readAnalyticsConsent()).toBe('undecided')
  })
})
