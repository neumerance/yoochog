import { describe, expect, it } from 'vitest'

import { onPlaybackEnded, onPlaybackError } from './hostPlayback'

describe('onPlaybackEnded', () => {
  it('advances when another item follows', () => {
    expect(onPlaybackEnded(true)).toEqual({ kind: 'advance' })
  })

  it('idles at end of queue when there is no next item', () => {
    expect(onPlaybackEnded(false)).toEqual({ kind: 'idle', variant: 'ended' })
  })
})

describe('onPlaybackError', () => {
  it('advances when another item follows', () => {
    expect(onPlaybackError(true)).toEqual({ kind: 'advance' })
  })

  it('idles when there is no next item', () => {
    expect(onPlaybackError(false)).toEqual({ kind: 'idle', variant: 'ended' })
  })
})
