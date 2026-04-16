import { describe, expect, it } from 'vitest'

import { createHostVideoQueue } from './hostVideoQueue'

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
    q.append(['a', 'b'])
    expect(q.length).toBe(2)
    expect(q.currentVideoId()).toBe('a')
    expect(q.hasNext()).toBe(true)
  })

  it('append to non-empty does not move current index', () => {
    const q = createHostVideoQueue()
    q.append(['a'])
    q.append(['b', 'c'])
    expect(q.length).toBe(3)
    expect(q.currentVideoId()).toBe('a')
  })

  it('append empty array is a no-op', () => {
    const q = createHostVideoQueue()
    q.append(['x'])
    q.append([])
    expect(q.currentVideoId()).toBe('x')
    expect(q.length).toBe(1)
  })

  it('replace sets list and current to first or empty', () => {
    const q = createHostVideoQueue()
    q.append(['a', 'b'])
    q.advance()
    expect(q.currentVideoId()).toBe('b')
    q.replace(['x', 'y', 'z'])
    expect(q.length).toBe(3)
    expect(q.currentVideoId()).toBe('x')
    q.replace([])
    expect(q.isEmpty()).toBe(true)
    expect(q.currentVideoId()).toBeUndefined()
  })

  it('clear removes all ids and current', () => {
    const q = createHostVideoQueue()
    q.append(['a', 'b'])
    q.clear()
    expect(q.length).toBe(0)
    expect(q.currentVideoId()).toBeUndefined()
    expect(q.isEmpty()).toBe(true)
  })

  it('advance walks the list and stops at the last item', () => {
    const q = createHostVideoQueue()
    q.append(['a', 'b', 'c'])
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
    q.append(['a', 'b'])
    q.advance()
    expect(q.currentVideoId()).toBe('b')
    expect(q.stepBack()).toBe(true)
    expect(q.currentVideoId()).toBe('a')
    expect(q.stepBack()).toBe(false)
    expect(q.currentVideoId()).toBe('a')
  })

  it('allows duplicate video ids in order', () => {
    const q = createHostVideoQueue()
    q.append(['same', 'same'])
    expect(q.length).toBe(2)
    expect(q.currentVideoId()).toBe('same')
    expect(q.advance()).toBe(true)
    expect(q.currentVideoId()).toBe('same')
  })

  describe('getSnapshot', () => {
    it('returns empty ids and null currentIndex when queue is empty', () => {
      const q = createHostVideoQueue()
      expect(q.getSnapshot()).toEqual({ ids: [], currentIndex: null })
    })

    it('reflects append order and current index', () => {
      const q = createHostVideoQueue()
      q.append(['a', 'b', 'c'])
      expect(q.getSnapshot()).toEqual({
        ids: ['a', 'b', 'c'],
        currentIndex: 0,
      })
    })

    it('updates currentIndex after advance', () => {
      const q = createHostVideoQueue()
      q.append(['a', 'b'])
      q.advance()
      expect(q.getSnapshot()).toEqual({
        ids: ['a', 'b'],
        currentIndex: 1,
      })
    })

    it('matches replace and clear', () => {
      const q = createHostVideoQueue()
      q.append(['a', 'b'])
      q.replace(['x', 'y', 'z'])
      expect(q.getSnapshot()).toEqual({
        ids: ['x', 'y', 'z'],
        currentIndex: 0,
      })
      q.clear()
      expect(q.getSnapshot()).toEqual({ ids: [], currentIndex: null })
    })

    it('lists duplicate ids as distinct rows with stable indices', () => {
      const q = createHostVideoQueue()
      q.append(['same', 'same'])
      expect(q.getSnapshot()).toEqual({
        ids: ['same', 'same'],
        currentIndex: 0,
      })
      q.advance()
      expect(q.getSnapshot()).toEqual({
        ids: ['same', 'same'],
        currentIndex: 1,
      })
    })

    it('returns a fresh ids array each call (read-only snapshot)', () => {
      const q = createHostVideoQueue()
      q.append(['a'])
      const s1 = q.getSnapshot()
      const s2 = q.getSnapshot()
      expect(s1.ids).toEqual(['a'])
      expect(s2.ids).toEqual(['a'])
      expect(s1.ids).not.toBe(s2.ids)
    })
  })
})
