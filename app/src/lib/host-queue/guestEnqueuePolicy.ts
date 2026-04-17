import type { HostVideoQueueItem, HostVideoQueueSnapshot } from './hostVideoQueue'

/** Guest-visible message when the host rejects an enqueue because the video is already queued. */
export const ENQUEUE_REJECTED_DUPLICATE_VIDEO =
  'That video is already in the queue.'

/** Guest-visible message when this guest already has a song in the queue (including now playing). */
export const ENQUEUE_REJECTED_ALREADY_HAS_REQUEST =
  "You've already got a song in the queue. You can add another after it's played or skipped."

/** True when `videoId` already appears anywhere in the host queue snapshot (including now playing). */
export function isVideoIdInHostQueue(
  videoId: string,
  snapshot: HostVideoQueueSnapshot,
): boolean {
  return snapshot.ids.includes(videoId)
}

/**
 * True when any row (including the current track) is owned by `ownerId`.
 * Rows with `null` owner do not match (legacy saves).
 */
export function guestAlreadyHasRequestInQueue(
  ownerId: string,
  snapshot: HostVideoQueueSnapshot,
): boolean {
  for (let i = 0; i < snapshot.ids.length; i++) {
    if (snapshot.requesterGuestIds[i] === ownerId) {
      return true
    }
  }
  return false
}

export type GuestEnqueueResolution =
  | { ok: true; item: HostVideoQueueItem }
  | { ok: false; reason: string }

/**
 * Duplicate-video check first, then one-song-per-guest. `effectiveOwnerId` is stored on the new row.
 */
export function resolveGuestEnqueueRequest(input: {
  snapshot: HostVideoQueueSnapshot
  videoId: string
  title: string | null
  requestedBy: string | null
  /** Parsed from wire, or `null` when absent. */
  parsedRequesterGuestId: string | null
  /** WebRTC peer id for this connection (fallback when the guest omits `requesterGuestId`). */
  peerGuestId: string
}): GuestEnqueueResolution {
  if (isVideoIdInHostQueue(input.videoId, input.snapshot)) {
    return { ok: false, reason: ENQUEUE_REJECTED_DUPLICATE_VIDEO }
  }
  const effectiveOwnerId = input.parsedRequesterGuestId ?? input.peerGuestId
  if (guestAlreadyHasRequestInQueue(effectiveOwnerId, input.snapshot)) {
    return { ok: false, reason: ENQUEUE_REJECTED_ALREADY_HAS_REQUEST }
  }
  return {
    ok: true,
    item: {
      videoId: input.videoId,
      title: input.title,
      requestedBy: input.requestedBy,
      requesterGuestId: effectiveOwnerId,
    },
  }
}
