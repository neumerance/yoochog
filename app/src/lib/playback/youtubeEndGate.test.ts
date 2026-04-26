import { describe, expect, it } from 'vitest'

import {
  YT_STATE_ENDED,
  YT_STATE_PAUSED,
  YT_STATE_PLAYING,
  shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd,
  shouldEmitYoutubeEndedToHost,
} from './youtubeEndGate'

describe('shouldEmitYoutubeEndedToHost', () => {
  it('is true for PLAYING → ENDED (natural in-play finish)', () => {
    expect(shouldEmitYoutubeEndedToHost(YT_STATE_ENDED, YT_STATE_PLAYING)).toBe(true)
  })

  it('is false for PAUSED → ENDED (user hold / transport pause, §D)', () => {
    expect(shouldEmitYoutubeEndedToHost(YT_STATE_ENDED, YT_STATE_PAUSED)).toBe(false)
  })

  it('is false for ENDED from null (load/swap / spurious ENDED)', () => {
    expect(shouldEmitYoutubeEndedToHost(YT_STATE_ENDED, null)).toBe(false)
  })

  it('is false when not ENDED', () => {
    expect(shouldEmitYoutubeEndedToHost(YT_STATE_PLAYING, YT_STATE_PAUSED)).toBe(false)
  })
})

describe('shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd', () => {
  it('allows advance when session unlocked and no hold (matrix: unlocked, playing, no hold)', () => {
    expect(
      shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd({
        audioSessionUnlocked: true,
        userPlaybackHoldActive: false,
      }),
    ).toBe(true)
  })

  it('denies when session locked (re-lock / pre-unlock, embed may still be PLAYING muted)', () => {
    expect(
      shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd({
        audioSessionUnlocked: false,
        userPlaybackHoldActive: false,
      }),
    ).toBe(false)
  })

  it('denies when user playback hold (guest/ host transport pause, §D)', () => {
    expect(
      shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd({
        audioSessionUnlocked: true,
        userPlaybackHoldActive: true,
      }),
    ).toBe(false)
  })
})
