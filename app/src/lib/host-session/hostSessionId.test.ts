import { describe, expect, it, vi } from 'vitest'

import { getOrCreateHostSessionId, HOST_SESSION_STORAGE_KEY } from './hostSessionId'

function createFakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key]! : null
    },
    setItem(key: string, value: string): void {
      store[key] = value
    },
    _store: store,
  }
}

describe('getOrCreateHostSessionId', () => {
  it('when storage is empty, calls randomUuid once, persists key and value, returns id', () => {
    const storage = createFakeStorage()
    const randomUuid = vi.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000')

    const id = getOrCreateHostSessionId(storage, randomUuid)

    expect(randomUuid).toHaveBeenCalledTimes(1)
    expect(storage._store[HOST_SESSION_STORAGE_KEY]).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(id).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('when id already exists, returns same id and does not call randomUuid', () => {
    const existing = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const storage = createFakeStorage({ [HOST_SESSION_STORAGE_KEY]: existing })
    const randomUuid = vi.fn()

    const id = getOrCreateHostSessionId(storage, randomUuid)

    expect(randomUuid).not.toHaveBeenCalled()
    expect(id).toBe(existing)
  })
})
