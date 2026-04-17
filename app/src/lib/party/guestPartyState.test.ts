import { describe, expect, it } from 'vitest'

import { applyGuestPartyMessage } from './guestPartyState'

describe('applyGuestPartyMessage', () => {
  it('updates snapshot on queue_snapshot', () => {
    const next = applyGuestPartyMessage(
      { snapshot: null, lastEnqueueError: null },
      {
        v: 1,
        type: 'queue_snapshot',
        ids: ['a'],
        currentIndex: 0,
      },
    )
    expect(next.snapshot?.ids).toEqual(['a'])
    expect(next.snapshot?.currentIndex).toBe(0)
  })

  it('records enqueue_rejected', () => {
    const prev = {
      snapshot: { ids: ['x'], currentIndex: 0 },
      lastEnqueueError: null as string | null,
    }
    const next = applyGuestPartyMessage(prev, {
      v: 1,
      type: 'enqueue_rejected',
      reason: 'bad id',
    })
    expect(next.lastEnqueueError).toBe('bad id')
    expect(next.snapshot).toEqual(prev.snapshot)
  })
})
