import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getOrCreatePartyGuestRequesterId } from './partyGuestRequesterId'

describe('getOrCreatePartyGuestRequesterId', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal(
      'sessionStorage',
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

  it('returns the same id for the same session on repeat calls', () => {
    const a = getOrCreatePartyGuestRequesterId('party-1')
    const b = getOrCreatePartyGuestRequesterId('party-1')
    expect(a).toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('uses distinct ids for different sessions', () => {
    const a = getOrCreatePartyGuestRequesterId('party-a')
    const b = getOrCreatePartyGuestRequesterId('party-b')
    expect(a).not.toBe(b)
  })
})
