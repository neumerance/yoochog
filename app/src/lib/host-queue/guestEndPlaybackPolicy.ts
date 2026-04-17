import type { HostVideoQueueSnapshot } from './hostVideoQueue'

/** Nothing is currently playing or the queue snapshot is empty. */
export const END_PLAYBACK_REJECTED_NOTHING_PLAYING
  = 'Nothing is playing right now.'

/** Current row has no recorded guest owner (legacy). */
export const END_PLAYBACK_REJECTED_LEGACY_ROW
  = 'This track can’t be ended from a guest device.'

/** Effective guest id does not own the now-playing row. */
export const END_PLAYBACK_REJECTED_NOT_OWNER
  = 'Only the person who requested the song can end it.'

export type GuestEndPlaybackResolution =
  | { ok: true }
  | { ok: false; reason: string }

/**
 * Host-only: whether the guest may end the currently playing row early.
 * `effectiveOwnerId` matches enqueue: `parsedRequesterGuestId ?? peerGuestId`.
 */
export function resolveEndCurrentPlaybackRequest(input: {
  snapshot: HostVideoQueueSnapshot
  /** Parsed from wire, or `null` when absent. */
  parsedRequesterGuestId: string | null
  /** WebRTC peer id for this connection (fallback when the guest omits `requesterGuestId`). */
  peerGuestId: string
}): GuestEndPlaybackResolution {
  const { snapshot } = input
  if (snapshot.ids.length === 0 || snapshot.currentIndex === null) {
    return { ok: false, reason: END_PLAYBACK_REJECTED_NOTHING_PLAYING }
  }
  const ci = snapshot.currentIndex
  const rowOwner = snapshot.requesterGuestIds[ci]
  if (rowOwner === null) {
    return { ok: false, reason: END_PLAYBACK_REJECTED_LEGACY_ROW }
  }
  const effectiveOwnerId = input.parsedRequesterGuestId ?? input.peerGuestId
  if (rowOwner !== effectiveOwnerId) {
    return { ok: false, reason: END_PLAYBACK_REJECTED_NOT_OWNER }
  }
  return { ok: true }
}
