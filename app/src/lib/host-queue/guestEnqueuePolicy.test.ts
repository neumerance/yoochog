import { describe, expect, it } from 'vitest'

import {
  buildEnqueueRejectedAlreadyHasRequest,
  ENQUEUE_REJECTED_ALREADY_HAS_REQUEST,
  ENQUEUE_REJECTED_DUPLICATE_VIDEO,
  countGuestRequestsInQueue,
  isVideoIdInHostQueue,
  resolveGuestEnqueueRequest,
} from './guestEnqueuePolicy'
import type { HostVideoQueueSnapshot } from './hostVideoQueue'

function snap(
  ids: string[],
  requesterGuestIds?: (string | null)[] | null,
): HostVideoQueueSnapshot {
  const rgi =
    requesterGuestIds ?? ids.map(() => null as string | null)
  return {
    ids,
    titles: ids.map(() => null),
    requestedBys: ids.map(() => null),
    requesterGuestIds: rgi,
    currentIndex: ids.length === 0 ? null : 0,
  }
}

describe('guestEnqueuePolicy', () => {
  it('exposes stable guest-visible duplicate rejection copy', () => {
    expect(ENQUEUE_REJECTED_DUPLICATE_VIDEO).toMatch(/already/i)
    expect(ENQUEUE_REJECTED_DUPLICATE_VIDEO.length).toBeGreaterThan(0)
  })

  it('exposes stable guest-visible max-per-guest rejection copy', () => {
    expect(ENQUEUE_REJECTED_ALREADY_HAS_REQUEST).toMatch(/already/i)
    expect(ENQUEUE_REJECTED_ALREADY_HAS_REQUEST.length).toBeGreaterThan(0)
  })

  describe('isVideoIdInHostQueue', () => {
    it('returns false when ids is empty', () => {
      expect(isVideoIdInHostQueue('dQw4w9WgXcQ', snap([]))).toBe(false)
    })

    it('returns false when id is not in the ordered list', () => {
      expect(isVideoIdInHostQueue('missing', snap(['a', 'b']))).toBe(false)
    })

    it('returns true when id matches the first row (currently playing)', () => {
      expect(isVideoIdInHostQueue('a', snap(['a', 'b']))).toBe(true)
    })

    it('returns true when id matches any later row', () => {
      expect(isVideoIdInHostQueue('b', snap(['a', 'b']))).toBe(true)
    })

    it('returns true when id appears twice in the snapshot (legacy duplicate rows)', () => {
      expect(isVideoIdInHostQueue('same', snap(['same', 'same']))).toBe(true)
    })
  })

  describe('countGuestRequestsInQueue', () => {
    it('returns 0 when owner id is absent from rows', () => {
      expect(countGuestRequestsInQueue('g1', snap(['a', 'b'], [null, null]))).toBe(0)
    })

    it('counts rows owned by guest including now playing', () => {
      expect(countGuestRequestsInQueue('g1', snap(['a', 'b'], ['g1', null]))).toBe(1)
      expect(countGuestRequestsInQueue('g2', snap(['a', 'b'], ['g1', 'g2']))).toBe(1)
      expect(countGuestRequestsInQueue('g1', snap(['a', 'b', 'c'], ['g1', 'g1', null]))).toBe(2)
    })
  })

  describe('resolveGuestEnqueueRequest', () => {
    it('rejects duplicate video before per-guest row cap', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap(['dQw4w9WgXcQ'], ['g1']),
        videoId: 'dQw4w9WgXcQ',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: 'g1',
        peerGuestId: 'peer',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.reason).toBe(ENQUEUE_REJECTED_DUPLICATE_VIDEO)
      }
    })

    it('allows a second song from the same guest when duplicate does not apply', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap(['aaaaaaaaaaa'], ['g1']),
        videoId: 'dQw4w9WgXcQ',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: 'g1',
        peerGuestId: 'peer',
      })
      expect(r.ok).toBe(true)
    })

    it('rejects when guest already owns the maximum number of rows', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap(['a', 'b'], ['g1', 'g1']),
        videoId: 'dQw4w9WgXcQ',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: 'g1',
        peerGuestId: 'peer',
      })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.reason).toBe(ENQUEUE_REJECTED_ALREADY_HAS_REQUEST)
      }
    })

    it('rejects at cap 1 with matching message', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap(['a'], ['g1']),
        videoId: 'dQw4w9WgXcQ',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: 'g1',
        peerGuestId: 'peer',
        maxGuestQueueRowsPerGuest: 1,
      })
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.reason).toBe(buildEnqueueRejectedAlreadyHasRequest(1))
      }
    })

    it('allows two rows for the same guest when cap is 3', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap(['a', 'b'], ['g1', 'g1']),
        videoId: 'abcdefghijk',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: 'g1',
        peerGuestId: 'peer',
        maxGuestQueueRowsPerGuest: 3,
      })
      expect(r.ok).toBe(true)
    })

    it('allows enqueue after owner row is gone', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap(['aaaaaaaaaaa'], ['g2']),
        videoId: 'dQw4w9WgXcQ',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: 'g1',
        peerGuestId: 'peer',
      })
      expect(r.ok).toBe(true)
    })

    it('uses peerGuestId when parsed requester id is null', () => {
      const r = resolveGuestEnqueueRequest({
        snapshot: snap([]),
        videoId: 'dQw4w9WgXcQ',
        title: null,
        requestedBy: null,
        parsedRequesterGuestId: null,
        peerGuestId: 'peer-1',
      })
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.item.requesterGuestId).toBe('peer-1')
      }
    })
  })
})
