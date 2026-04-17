import { describe, expect, it } from 'vitest'

import { createHostVideoQueue, type HostVideoQueueItem } from './hostVideoQueue'

function row(
  videoId: string,
  title: string | null = null,
  requestedBy: string | null = null,
  requesterGuestId: string | null = null,
): HostVideoQueueItem {
  return { videoId, title, requestedBy, requesterGuestId }
}

describe('createHostVideoQueue', () => {
  it('starts empty with no current id', () => {
    const q = createHostVideoQueue()
    expect(q.isEmpty()).toBe(true)
    expect(q.length).toBe(0)
    expect(q.currentVideoId()).toBeUndefined()
    expect(q.advance()).toBe(false)
    expect(q.stepBack()).toBe(false)
    expect(q.hasNext()).toBe(false)
  })

  it('append to empty sets current to first item', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b')])
    expect(q.length).toBe(2)
    expect(q.currentVideoId()).toBe('a')
    expect(q.hasNext()).toBe(true)
  })

  it('append to non-empty does not move current index', () => {
    const q = createHostVideoQueue()
    q.append([row('a')])
    q.append([row('b'), row('c')])
    expect(q.length).toBe(3)
    expect(q.currentVideoId()).toBe('a')
  })

  it('append empty array is a no-op', () => {
    const q = createHostVideoQueue()
    q.append([row('x')])
    q.append([])
    expect(q.currentVideoId()).toBe('x')
    expect(q.length).toBe(1)
  })

  it('replace sets list and current to first or empty', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b')])
    q.advance()
    expect(q.currentVideoId()).toBe('b')
    expect(q.getSnapshot().ids).toEqual(['b'])
    q.replace([row('x'), row('y'), row('z')])
    expect(q.length).toBe(3)
    expect(q.currentVideoId()).toBe('x')
    q.replace([])
    expect(q.isEmpty()).toBe(true)
    expect(q.currentVideoId()).toBeUndefined()
  })

  it('clear removes all ids and current', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b')])
    q.clear()
    expect(q.length).toBe(0)
    expect(q.currentVideoId()).toBeUndefined()
    expect(q.isEmpty()).toBe(true)
  })

  it('advance walks the list, compacts consumed rows, and stops at the last item', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b'), row('c')])
    expect(q.currentVideoId()).toBe('a')
    expect(q.getSnapshot().ids).toEqual(['a', 'b', 'c'])
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('b')
    expect(q.getSnapshot().ids).toEqual(['b', 'c'])
    expect(q.getSnapshot().currentIndex).toBe(0)
    expect(q.hasNext()).toBe(true)
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('c')
    expect(q.getSnapshot().ids).toEqual(['c'])
    expect(q.hasNext()).toBe(false)
    expect(q.advance()).toBe(false)
    expect(q.currentVideoId()).toBe('c')
  })

  it('stepBack does not restore removed prior rows (compact queue)', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b')])
    q.advance()
    expect(q.currentVideoId()).toBe('b')
    expect(q.getSnapshot().ids).toEqual(['b'])
    expect(q.stepBack()).toBe(false)
    expect(q.currentVideoId()).toBe('b')
  })

  it('append can still produce duplicate ids (legacy / data layer; guest enqueue dedupes separately)', () => {
    const q = createHostVideoQueue()
    q.append([row('same'), row('same')])
    expect(q.length).toBe(2)
    expect(q.currentVideoId()).toBe('same')
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('same')
  })

  it('applySnapshot normalizes legacy snapshots with currentIndex > 0 to a compact list', () => {
    const q = createHostVideoQueue()
    q.applySnapshot({
      ids: ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'],
      titles: [null, null, null],
      requestedBys: [null, null, null],
      requesterGuestIds: [null, null, null],
      currentIndex: 1,
    })
    expect(q.currentVideoId()).toBe('bbbbbbbbbbb')
    expect(q.getSnapshot().ids).toEqual(['bbbbbbbbbbb', 'ccccccccccc'])
    expect(q.getSnapshot().currentIndex).toBe(0)
  })

  it('preserves per-row title and requester in snapshot', () => {
    const q = createHostVideoQueue()
    q.append([
      { videoId: 'a', title: 'Song A', requestedBy: 'Sam', requesterGuestId: 'g1' },
      { videoId: 'b', title: null, requestedBy: null, requesterGuestId: null },
    ])
    expect(q.getSnapshot()).toEqual({
      ids: ['a', 'b'],
      titles: ['Song A', null],
      requestedBys: ['Sam', null],
      requesterGuestIds: ['g1', null],
      currentIndex: 0,
    })
  })

  describe('getSnapshot', () => {
    it('returns empty ids and null currentIndex when queue is empty', () => {
      const q = createHostVideoQueue()
      expect(q.getSnapshot()).toEqual({
        ids: [],
        titles: [],
        requestedBys: [],
        requesterGuestIds: [],
        currentIndex: null,
      })
    })

    it('reflects append order and current index', () => {
      const q = createHostVideoQueue()
      q.append([row('a'), row('b'), row('c')])
      expect(q.getSnapshot()).toEqual({
        ids: ['a', 'b', 'c'],
        titles: [null, null, null],
        requestedBys: [null, null, null],
        requesterGuestIds: [null, null, null],
        currentIndex: 0,
      })
    })

    it('updates snapshot after advance to current + up next only', () => {
      const q = createHostVideoQueue()
      q.append([row('a'), row('b')])
      q.advance()
      expect(q.getSnapshot()).toEqual({
        ids: ['b'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      })
    })

    it('matches replace and clear', () => {
      const q = createHostVideoQueue()
      q.append([row('a'), row('b')])
      q.replace([row('x'), row('y'), row('z')])
      expect(q.getSnapshot()).toEqual({
        ids: ['x', 'y', 'z'],
        titles: [null, null, null],
        requestedBys: [null, null, null],
        requesterGuestIds: [null, null, null],
        currentIndex: 0,
      })
      q.clear()
      expect(q.getSnapshot()).toEqual({
        ids: [],
        titles: [],
        requestedBys: [],
        requesterGuestIds: [],
        currentIndex: null,
      })
    })

    it('lists legacy duplicate ids as distinct rows with stable indices', () => {
      const q = createHostVideoQueue()
      q.append([row('same'), row('same')])
      expect(q.getSnapshot()).toEqual({
        ids: ['same', 'same'],
        titles: [null, null],
        requestedBys: [null, null],
        requesterGuestIds: [null, null],
        currentIndex: 0,
      })
      q.advance()
      expect(q.getSnapshot()).toEqual({
        ids: ['same'],
        titles: [null],
        requestedBys: [null],
        requesterGuestIds: [null],
        currentIndex: 0,
      })
    })

    it('returns a fresh ids array each call (read-only snapshot)', () => {
      const q = createHostVideoQueue()
      q.append([row('a')])
      const s1 = q.getSnapshot()
      const s2 = q.getSnapshot()
      expect(s1.ids).toEqual(['a'])
      expect(s2.ids).toEqual(['a'])
      expect(s1.ids).not.toBe(s2.ids)
    })
  })
})
