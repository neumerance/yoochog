import { describe, expect, it } from 'vitest'

import { createHostVideoQueue, type HostVideoQueueItem } from './hostVideoQueue'

function row(
  videoId: string,
  title: string | null = null,
  requestedBy: string | null = null,
): HostVideoQueueItem {
  return { videoId, title, requestedBy }
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

  it('advance walks the list and stops at the last item', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b'), row('c')])
    expect(q.currentVideoId()).toBe('a')
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('b')
    expect(q.hasNext()).toBe(true)
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('c')
    expect(q.hasNext()).toBe(false)
    expect(q.advance()).toBe(false)
    expect(q.currentVideoId()).toBe('c')
  })

  it('stepBack walks backward and stops at the first item', () => {
    const q = createHostVideoQueue()
    q.append([row('a'), row('b')])
    q.advance()
    expect(q.currentVideoId()).toBe('b')
    expect(q.stepBack()).toBe(true)
    expect(q.currentVideoId()).toBe('a')
    expect(q.stepBack()).toBe(false)
    expect(q.currentVideoId()).toBe('a')
  })

  it('allows duplicate video ids in order', () => {
    const q = createHostVideoQueue()
    q.append([row('same'), row('same')])
    expect(q.length).toBe(2)
    expect(q.currentVideoId()).toBe('same')
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('same')
  })

  it('applySnapshot restores currentIndex not only row 0', () => {
    const q = createHostVideoQueue()
    q.applySnapshot({
      ids: ['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ccccccccccc'],
      titles: [null, null, null],
      requestedBys: [null, null, null],
      currentIndex: 1,
    })
    expect(q.currentVideoId()).toBe('bbbbbbbbbbb')
    expect(q.getSnapshot().currentIndex).toBe(1)
  })

  it('preserves per-row title and requester in snapshot', () => {
    const q = createHostVideoQueue()
    q.append([
      { videoId: 'a', title: 'Song A', requestedBy: 'Sam' },
      { videoId: 'b', title: null, requestedBy: null },
    ])
    expect(q.getSnapshot()).toEqual({
      ids: ['a', 'b'],
      titles: ['Song A', null],
      requestedBys: ['Sam', null],
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
        currentIndex: 0,
      })
    })

    it('updates currentIndex after advance', () => {
      const q = createHostVideoQueue()
      q.append([row('a'), row('b')])
      q.advance()
      expect(q.getSnapshot()).toEqual({
        ids: ['a', 'b'],
        titles: [null, null],
        requestedBys: [null, null],
        currentIndex: 1,
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
        currentIndex: 0,
      })
      q.clear()
      expect(q.getSnapshot()).toEqual({
        ids: [],
        titles: [],
        requestedBys: [],
        currentIndex: null,
      })
    })

    it('lists duplicate ids as distinct rows with stable indices', () => {
      const q = createHostVideoQueue()
      q.append([row('same'), row('same')])
      expect(q.getSnapshot()).toEqual({
        ids: ['same', 'same'],
        titles: [null, null],
        requestedBys: [null, null],
        currentIndex: 0,
      })
      q.advance()
      expect(q.getSnapshot()).toEqual({
        ids: ['same', 'same'],
        titles: [null, null],
        requestedBys: [null, null],
        currentIndex: 1,
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
