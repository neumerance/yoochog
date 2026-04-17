import type { HostVideoQueueItem, HostVideoQueueSnapshot } from './hostVideoQueue'

/** Maximum queue rows (including now playing) a single guest may own at once. */
export const MAX_GUEST_QUEUE_ROWS_PER_GUEST = 2

/** Guest-visible message when the host rejects an enqueue because the video is already queued. */
export const ENQUEUE_REJECTED_DUPLICATE_VIDEO =
  'That video is already in the queue.'

/** Guest-visible message when this guest already has the maximum number of songs in the queue. */
export const ENQUEUE_REJECTED_ALREADY_HAS_REQUEST =
  "You've already got two songs in the queue. You can add another after one plays or is skipped."

/** True when `videoId` already appears anywhere in the host queue snapshot (including now playing). */
export function isVideoIdInHostQueue(
  videoId: string,
  snapshot: HostVideoQueueSnapshot,
): boolean {
  return snapshot.ids.includes(videoId)
}

/**
 * Counts rows (including the current track) owned by `ownerId`.
 * Rows with `null` owner do not match (legacy saves).
 */
export function countGuestRequestsInQueue(
  ownerId: string,
  snapshot: HostVideoQueueSnapshot,
): number {
  let n = 0
  for (let i = 0; i < snapshot.ids.length; i++) {
    if (snapshot.requesterGuestIds[i] === ownerId) {
      n++
    }
  }
  return n
}

export type GuestEnqueueResolution =
  | { ok: true; item: HostVideoQueueItem }
  | { ok: false; reason: string }

/**
 * Duplicate-video check first, then per-guest row cap (`MAX_GUEST_QUEUE_ROWS_PER_GUEST`).
 * `effectiveOwnerId` is stored on the new row.
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
  if (
    countGuestRequestsInQueue(effectiveOwnerId, input.snapshot) >=
    MAX_GUEST_QUEUE_ROWS_PER_GUEST
  ) {
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
