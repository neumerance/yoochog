/**
 * Pure playback transition helpers (queue + YouTube events) for testability without YT.Player.
 */

export type PlaybackEndedAction =
  | { kind: 'advance' }
  | { kind: 'idle'; variant: 'ended' }

export type PlaybackErrorAction =
  | { kind: 'advance' }
  | { kind: 'idle'; variant: 'ended' }

/** After natural END: advance when another song follows; otherwise end-of-queue idle. */
export function onPlaybackEnded(hasNext: boolean): PlaybackEndedAction {
  if (hasNext) {
    return { kind: 'advance' }
  }
  return { kind: 'idle', variant: 'ended' }
}

/** On embed/playback error: skip when possible; otherwise same idle as last song ended. */
export function onPlaybackError(hasNext: boolean): PlaybackErrorAction {
  if (hasNext) {
    return { kind: 'advance' }
  }
  return { kind: 'idle', variant: 'ended' }
}
