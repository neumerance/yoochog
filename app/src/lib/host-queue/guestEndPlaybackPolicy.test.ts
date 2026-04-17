import { describe, expect, it } from 'vitest'

import {
  END_PLAYBACK_REJECTED_LEGACY_ROW,
  END_PLAYBACK_REJECTED_NOTHING_PLAYING,
  END_PLAYBACK_REJECTED_NOT_OWNER,
  resolveEndCurrentPlaybackRequest,
} from './guestEndPlaybackPolicy'
import type { HostVideoQueueSnapshot } from './hostVideoQueue'

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

describe('resolveEndCurrentPlaybackRequest', () => {
  it('allows when effective owner matches stored owner and row is non-null', () => {
    const r = resolveEndCurrentPlaybackRequest({
      snapshot: snap(['a', 'b'], ['g1', null], 0),
      parsedRequesterGuestId: 'g1',
      peerGuestId: 'peer',
    })
    expect(r).toEqual({ ok: true })
  })

  it('uses peerGuestId when parsed requester id is null', () => {
    const r = resolveEndCurrentPlaybackRequest({
      snapshot: snap(['a'], ['peer-1'], 0),
      parsedRequesterGuestId: null,
      peerGuestId: 'peer-1',
    })
    expect(r).toEqual({ ok: true })
  })

  it('rejects when wrong guest', () => {
    const r = resolveEndCurrentPlaybackRequest({
      snapshot: snap(['a'], ['g1'], 0),
      parsedRequesterGuestId: 'g2',
      peerGuestId: 'peer',
    })
    expect(r).toEqual({ ok: false, reason: END_PLAYBACK_REJECTED_NOT_OWNER })
  })

  it('rejects legacy row with null owner', () => {
    const r = resolveEndCurrentPlaybackRequest({
      snapshot: snap(['a'], [null], 0),
      parsedRequesterGuestId: 'g1',
      peerGuestId: 'peer',
    })
    expect(r).toEqual({ ok: false, reason: END_PLAYBACK_REJECTED_LEGACY_ROW })
  })

  it('rejects empty queue', () => {
    const r = resolveEndCurrentPlaybackRequest({
      snapshot: snap([], [], null),
      parsedRequesterGuestId: 'g1',
      peerGuestId: 'peer',
    })
    expect(r).toEqual({ ok: false, reason: END_PLAYBACK_REJECTED_NOTHING_PLAYING })
  })

  it('rejects when currentIndex is null with non-empty ids', () => {
    const r = resolveEndCurrentPlaybackRequest({
      snapshot: snap(['a'], ['g1'], null),
      parsedRequesterGuestId: 'g1',
      peerGuestId: 'peer',
    })
    expect(r).toEqual({ ok: false, reason: END_PLAYBACK_REJECTED_NOTHING_PLAYING })
  })
})
