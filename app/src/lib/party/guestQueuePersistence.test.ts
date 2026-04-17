import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { guestQueueStorageKey, loadGuestQueueSnapshot, saveGuestQueueSnapshot } from './guestQueuePersistence'

describe('guestQueuePersistence', () => {
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

  it('round-trips snapshot including requesterGuestIds', () => {
    const snap = {
      ids: ['dQw4w9WgXcQ'],
      titles: ['T'],
      requestedBys: ['Sam'],
      requesterGuestIds: ['g1'],
      currentIndex: 0,
    }
    saveGuestQueueSnapshot('guest-sess', snap)
    expect(loadGuestQueueSnapshot('guest-sess')).toEqual(snap)
  })

  it('loads legacy cache without requesterGuestIds as null owners', () => {
    const legacy = JSON.stringify({
      ids: ['dQw4w9WgXcQ'],
      titles: ['T'],
      requestedBys: ['Sam'],
      currentIndex: 0,
    })
    store[guestQueueStorageKey('legacy')] = legacy
    expect(loadGuestQueueSnapshot('legacy')).toEqual({
      ids: ['dQw4w9WgXcQ'],
      titles: ['T'],
      requestedBys: ['Sam'],
      requesterGuestIds: [null],
      currentIndex: 0,
    })
  })

  it('normalizes legacy cache with currentIndex > 0 to compact snapshot', () => {
    const legacy = JSON.stringify({
      ids: ['aaaaaaaaaaa', 'bbbbbbbbbbb'],
      titles: ['A', 'B'],
      requestedBys: [null, null],
      currentIndex: 1,
      requesterGuestIds: [null, null],
    })
    store[guestQueueStorageKey('legacy-idx')] = legacy
    expect(loadGuestQueueSnapshot('legacy-idx')).toEqual({
      ids: ['bbbbbbbbbbb'],
      titles: ['B'],
      requestedBys: [null],
      requesterGuestIds: [null],
      currentIndex: 0,
    })
  })
})
