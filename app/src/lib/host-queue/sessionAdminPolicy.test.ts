import { describe, expect, it } from 'vitest'

import type { HostVideoQueueSnapshot } from './hostVideoQueue'
import {
  END_PLAYBACK_REJECTED_LEGACY_ROW,
  END_PLAYBACK_REJECTED_NOT_OWNER,
  REMOVE_ROW_REJECTED_BAD_INDEX,
  REMOVE_ROW_REJECTED_LEGACY_ROW,
  REMOVE_ROW_REJECTED_NOT_OWNER,
  resolveSessionAdminEndPlaybackRequest,
  resolveSessionAdminRemoveRowRequest,
  SESSION_ADMIN_REJECTED_NOTHING_PLAYING,
} from './sessionAdminPolicy'

function snap(
  ids: string[],
  requesterGuestIds: (string | null)[],
  currentIndex: number | null,
): HostVideoQueueSnapshot {
  return {
    ids,
    titles: ids.map(() => null),
    requestedBys: ids.map(() => null),
    requesterGuestIds,
    currentIndex,
  }
}

describe('resolveSessionAdminEndPlaybackRequest', () => {
  it('allows when peer is session admin and something is playing', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a', 'b'], [null, null], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: true })
  })

  it('allows session admin to end legacy row (null owner)', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a'], [null], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: true })
  })

  it('allows owner when not admin (logical id matches row)', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a'], ['g1'], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'other-guest',
      parsedRequesterGuestId: 'g1',
    })
    expect(r).toEqual({ ok: true })
  })

  it('uses peerGuestId when parsed requester id is null and row matches peer', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a'], ['peer-1'], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'peer-1',
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: true })
  })

  it('rejects non-admin non-owner', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a'], ['g1'], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'other',
      parsedRequesterGuestId: 'g2',
    })
    expect(r).toEqual({ ok: false, reason: END_PLAYBACK_REJECTED_NOT_OWNER })
  })

  it('rejects legacy row for non-admin', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a'], [null], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'other',
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: false, reason: END_PLAYBACK_REJECTED_LEGACY_ROW })
  })

  it('rejects empty queue', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap([], [], null),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: false, reason: SESSION_ADMIN_REJECTED_NOTHING_PLAYING })
  })

  it('rejects when currentIndex is null with rows', () => {
    const r = resolveSessionAdminEndPlaybackRequest({
      snapshot: snap(['a'], ['g1'], null),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: false, reason: SESSION_ADMIN_REJECTED_NOTHING_PLAYING })
  })
})

describe('resolveSessionAdminRemoveRowRequest', () => {
  it('allows admin with valid index', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap(['a', 'b'], [null, null], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      rowIndex: 1,
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: true })
  })

  it('allows admin to remove legacy row', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap(['a', 'b'], [null, 'g2'], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      rowIndex: 1,
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: true })
  })

  it('allows owner when not admin', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap(['a', 'b'], ['x', 'g1'], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'other-guest',
      rowIndex: 1,
      parsedRequesterGuestId: 'g1',
    })
    expect(r).toEqual({ ok: true })
  })

  it('rejects non-admin non-owner', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap(['a', 'b'], ['x', 'g1'], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'other',
      rowIndex: 1,
      parsedRequesterGuestId: 'g2',
    })
    expect(r).toEqual({ ok: false, reason: REMOVE_ROW_REJECTED_NOT_OWNER })
  })

  it('rejects legacy row for non-admin', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap(['a', 'b'], ['x', null], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'other',
      rowIndex: 1,
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: false, reason: REMOVE_ROW_REJECTED_LEGACY_ROW })
  })

  it('rejects bad row index', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap(['a'], [null], 0),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      rowIndex: 3,
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: false, reason: REMOVE_ROW_REJECTED_BAD_INDEX })
  })

  it('rejects empty queue', () => {
    const r = resolveSessionAdminRemoveRowRequest({
      snapshot: snap([], [], null),
      sessionAdminPeerId: 'admin-peer',
      peerGuestId: 'admin-peer',
      rowIndex: 0,
      parsedRequesterGuestId: null,
    })
    expect(r).toEqual({ ok: false, reason: REMOVE_ROW_REJECTED_BAD_INDEX })
  })
})
