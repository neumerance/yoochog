/**
 * Two-layer gating for “natural” queue advance on YouTube ENDED (issue #89):
 * 1) IFrame: only treat ENDED as a host notification when the prior state was PLAYING
 *    (not PAUSED — avoids advancing after user transport pause + ENDED quirks).
 * 2) Host: only advance when the audio session is unlocked and no explicit user playback hold
 *    (e.g. guest- or host-paused transport while still “in session”).
 *
 * Re-lock uses `audioSessionUnlocked === false` (locked overlay) — the embed may still report
 * PLAYING while muted, so the host layer must block advance while locked.
 */

/** YT.PlayerState.ENDED */
export const YT_STATE_ENDED = 0
/** YT.PlayerState.PLAYING */
export const YT_STATE_PLAYING = 1
/** YT.PlayerState.PAUSED */
export const YT_STATE_PAUSED = 2

/**
 * @param fromState - Last YT state before this `onStateChange` (or null after load/destroy).
 * @param toState - New state in `onStateChange`.
 * @returns Whether the composable should invoke `onEnded` (host may still no-op in `handlePlaybackEnded`).
 */
export function shouldEmitYoutubeEndedToHost(
  toState: number,
  fromState: number | null,
): boolean {
  if (toState !== YT_STATE_ENDED) {
    return false
  }
  return fromState === YT_STATE_PLAYING
}

export type HostYoutubeNaturalAdvanceContext = {
  /** True only after the host has cleared the “Click here to start singing” gate for this period. */
  audioSessionUnlocked: boolean
  /**
   * True while user-intended **transport** hold is active (host or guest pause applied on the
   * room player). When true, do not treat ENDED as a queue advance (see issue #89 §D / open decisions).
   */
  userPlaybackHoldActive: boolean
}

/**
 * Final gate before `applyNaturalPlaybackEnd` / queue advance. Call only when
 * {@link shouldEmitYoutubeEndedToHost} was true for the IFrame, or the same invariants are intended.
 */
export function shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd(
  ctx: HostYoutubeNaturalAdvanceContext,
): boolean {
  if (!ctx.audioSessionUnlocked) {
    return false
  }
  if (ctx.userPlaybackHoldActive) {
    return false
  }
  return true
}
