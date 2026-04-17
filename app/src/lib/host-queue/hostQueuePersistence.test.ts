import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hostQueueStorageKey,
  loadHostQueue,
  saveHostQueue,
  snapshotToItems,
} from './hostQueuePersistence'
import { createHostVideoQueue } from './hostVideoQueue'

describe('hostQueuePersistence', () => {
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

  it('round-trips snapshot via localStorage', () => {
    const snap = {
      ids: ['dQw4w9WgXcQ', 'jNQXAC9IVRw'],
      titles: ['A', null],
      requestedBys: ['Sam', null],
      requesterGuestIds: ['g1', null],
      currentIndex: 0,
    }
    saveHostQueue('session-1', snap)
    const loaded = loadHostQueue('session-1')
    expect(loaded).toEqual({
      ids: snap.ids,
      titles: snap.titles,
      requestedBys: snap.requestedBys,
      requesterGuestIds: snap.requesterGuestIds,
      currentIndex: 0,
    })
  })

  it('loads legacy JSON without requesterGuestIds as null owners', () => {
    const legacy = JSON.stringify({
      ids: ['dQw4w9WgXcQ'],
      titles: ['T'],
      requestedBys: ['Sam'],
      currentIndex: 0,
    })
    store[hostQueueStorageKey('legacy-session')] = legacy
    const loaded = loadHostQueue('legacy-session')
    expect(loaded).toEqual({
      ids: ['dQw4w9WgXcQ'],
      titles: ['T'],
      requestedBys: ['Sam'],
      requesterGuestIds: [null],
      currentIndex: 0,
    })
  })

  it('snapshotToItems matches queue replace', () => {
    const q = createHostVideoQueue()
    const items = snapshotToItems({
      ids: ['aaaaaaaaaaa'],
      titles: ['T'],
      requestedBys: ['R'],
      requesterGuestIds: ['g1'],
      currentIndex: 0,
    })
    q.replace(items)
    expect(q.getSnapshot()).toEqual({
      ids: ['aaaaaaaaaaa'],
      titles: ['T'],
      requestedBys: ['R'],
      requesterGuestIds: ['g1'],
      currentIndex: 0,
    })
  })
})
