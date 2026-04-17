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
        titles: ['Song'],
        requestedBys: ['Sam'],
        requesterGuestIds: ['g1'],
      },
    )
    expect(next.snapshot?.ids).toEqual(['a'])
    expect(next.snapshot?.titles).toEqual(['Song'])
    expect(next.snapshot?.requestedBys).toEqual(['Sam'])
    expect(next.snapshot?.requesterGuestIds).toEqual(['g1'])
    expect(next.snapshot?.currentIndex).toBe(0)
  })

  it('normalizes legacy queue_snapshot rows before current playhead', () => {
    const next = applyGuestPartyMessage(
      { snapshot: null, lastEnqueueError: null },
      {
        v: 1,
        type: 'queue_snapshot',
        ids: ['aaaaaaaaaaa', 'bbbbbbbbbbb'],
        currentIndex: 1,
        titles: ['A', 'B'],
        requestedBys: [null, null],
        requesterGuestIds: [null, null],
      },
    )
    expect(next.snapshot?.ids).toEqual(['bbbbbbbbbbb'])
    expect(next.snapshot?.titles).toEqual(['B'])
    expect(next.snapshot?.currentIndex).toBe(0)
  })

  it('records enqueue_rejected', () => {
    const prev = {
      snapshot: {
        ids: ['x'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      },
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

  it('leaves state unchanged on heartbeat', () => {
    const prev = {
      snapshot: {
        ids: ['a'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      },
      lastEnqueueError: 'prior' as string | null,
    }
    const next = applyGuestPartyMessage(prev, {
      v: 1,
      type: 'heartbeat',
    })
    expect(next).toEqual(prev)
  })
})
