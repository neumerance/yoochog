import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PRIVACY_NOTICE_DISMISSED_KEY,
  readPrivacyNoticeDismissed,
  savePrivacyNoticeDismissed,
} from './privacyNoticeDismissed'

describe('privacyNoticeDismissed', () => {
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
    expect(PRIVACY_NOTICE_DISMISSED_KEY).toBe('yoochog.privacyNoticeDismissed')
  })

  it('returns false when unset', () => {
    expect(readPrivacyNoticeDismissed()).toBe(false)
  })

  it('returns true after dismiss is saved', () => {
    expect(savePrivacyNoticeDismissed()).toBe(true)
    expect(store[PRIVACY_NOTICE_DISMISSED_KEY]).toBe('true')
    expect(readPrivacyNoticeDismissed()).toBe(true)
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
    expect(savePrivacyNoticeDismissed()).toBe(false)
  })

  it('returns false from read when getItem throws', () => {
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
    expect(readPrivacyNoticeDismissed()).toBe(false)
  })
})
