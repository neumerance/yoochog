import { describe, expect, it } from 'vitest'

import { applyGuestPartyMessage, type GuestPartyUiState } from './guestPartyState'

function emptyState(over: Partial<GuestPartyUiState> = {}): GuestPartyUiState {
  return {
    snapshot: null,
    sessionAdminGuestId: null,
    maxGuestQueueRowsPerGuest: 2,
    audienceChatEnabled: true,
    lastEnqueueError: null,
    lastChatError: null,
    lastQueueSettingsError: null,
    ...over,
  }
}

describe('applyGuestPartyMessage', () => {
  it('updates snapshot on queue_snapshot', () => {
    const next = applyGuestPartyMessage(emptyState(), {
      v: 1,
      type: 'queue_snapshot',
      ids: ['a'],
      currentIndex: 0,
      titles: ['Song'],
      requestedBys: ['Sam'],
      requesterGuestIds: ['g1'],
      sessionAdminPeerId: 'admin-1',
      maxGuestQueueRowsPerGuest: 2,
      audienceChatEnabled: true,
    })
    expect(next.snapshot?.ids).toEqual(['a'])
    expect(next.snapshot?.titles).toEqual(['Song'])
    expect(next.snapshot?.requestedBys).toEqual(['Sam'])
    expect(next.snapshot?.requesterGuestIds).toEqual(['g1'])
    expect(next.snapshot?.currentIndex).toBe(0)
    expect(next.sessionAdminGuestId).toBe('admin-1')
  })

  it('normalizes legacy queue_snapshot rows before current playhead', () => {
    const next = applyGuestPartyMessage(emptyState(), {
      v: 1,
      type: 'queue_snapshot',
      ids: ['aaaaaaaaaaa', 'bbbbbbbbbbb'],
      currentIndex: 1,
      titles: ['A', 'B'],
      requestedBys: [null, null],
      requesterGuestIds: [null, null],
      sessionAdminPeerId: null,
      maxGuestQueueRowsPerGuest: 2,
      audienceChatEnabled: true,
    })
    expect(next.snapshot?.ids).toEqual(['bbbbbbbbbbb'])
    expect(next.snapshot?.titles).toEqual(['B'])
    expect(next.snapshot?.currentIndex).toBe(0)
  })

  it('records enqueue_rejected', () => {
    const prev = emptyState({
      snapshot: {
        ids: ['x'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      },
      sessionAdminGuestId: 'a',
    })
    const next = applyGuestPartyMessage(prev, {
      v: 1,
      type: 'enqueue_rejected',
      reason: 'bad id',
    })
    expect(next.lastEnqueueError).toBe('bad id')
    expect(next.snapshot).toEqual(prev.snapshot)
    expect(next.sessionAdminGuestId).toBe('a')
  })

  it('leaves state unchanged on heartbeat', () => {
    const prev = emptyState({
      snapshot: {
        ids: ['a'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      },
      sessionAdminGuestId: null,
      lastEnqueueError: 'prior',
    })
    const next = applyGuestPartyMessage(prev, {
      v: 1,
      type: 'heartbeat',
    })
    expect(next).toEqual(prev)
  })

  it('records chat_rejected', () => {
    const prev = emptyState({
      snapshot: {
        ids: ['a'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      },
    })
    const next = applyGuestPartyMessage(prev, {
      v: 1,
      type: 'chat_rejected',
      reason: 'Please wait.',
    })
    expect(next.lastChatError).toBe('Please wait.')
    expect(next.lastEnqueueError).toBeNull()
    expect(next.snapshot).toEqual(prev.snapshot)
  })

  it('updates max from queue_snapshot and preserves on other messages', () => {
    const a = applyGuestPartyMessage(emptyState(), {
      v: 1,
      type: 'queue_snapshot',
      ids: ['a'],
      currentIndex: 0,
      titles: [null],
      requestedBys: [null],
      requesterGuestIds: [null],
      sessionAdminPeerId: null,
      maxGuestQueueRowsPerGuest: 5,
      audienceChatEnabled: true,
    })
    expect(a.maxGuestQueueRowsPerGuest).toBe(5)
    const b = applyGuestPartyMessage(a, { v: 1, type: 'heartbeat' })
    expect(b.maxGuestQueueRowsPerGuest).toBe(5)
  })

  it('updates audience chat flag from queue_snapshot', () => {
    const a = applyGuestPartyMessage(emptyState(), {
      v: 1,
      type: 'queue_snapshot',
      ids: ['a'],
      currentIndex: 0,
      titles: [null],
      requestedBys: [null],
      requesterGuestIds: [null],
      sessionAdminPeerId: null,
      maxGuestQueueRowsPerGuest: 2,
      audienceChatEnabled: false,
    })
    expect(a.audienceChatEnabled).toBe(false)
  })

  it('records queue_settings_rejected', () => {
    const prev = emptyState()
    const next = applyGuestPartyMessage(prev, {
      v: 1,
      type: 'queue_settings_rejected',
      reason: 'Nope',
    })
    expect(next.lastQueueSettingsError).toBe('Nope')
  })
})
