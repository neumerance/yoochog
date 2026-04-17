import { describe, expect, it } from 'vitest'

import { ENQUEUE_REJECTED_DUPLICATE_VIDEO, isVideoIdInHostQueue } from './guestEnqueuePolicy'
import type { HostVideoQueueSnapshot } from './hostVideoQueue'

function snap(ids: string[]): HostVideoQueueSnapshot {
  return {
    ids,
    titles: ids.map(() => null),
    requestedBys: ids.map(() => null),
    currentIndex: ids.length === 0 ? null : 0,
  }
}

describe('guestEnqueuePolicy', () => {
  it('exposes stable guest-visible duplicate rejection copy', () => {
    expect(ENQUEUE_REJECTED_DUPLICATE_VIDEO).toMatch(/already/i)
    expect(ENQUEUE_REJECTED_DUPLICATE_VIDEO.length).toBeGreaterThan(0)
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
})
