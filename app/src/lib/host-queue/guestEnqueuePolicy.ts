import {
  GUEST_QUEUE_ROWS_CAP_DEFAULT,
  normalizeGuestQueueRowsCap,
} from '@/lib/host-queue/guestQueueLimits'
import type { HostVideoQueueItem, HostVideoQueueSnapshot } from './hostVideoQueue'

/** Default maximum queue rows (including now playing) a single guest may own at once. */
export const MAX_GUEST_QUEUE_ROWS_PER_GUEST = GUEST_QUEUE_ROWS_CAP_DEFAULT

/** Guest-visible message when the host rejects an enqueue because the video is already queued. */
export const ENQUEUE_REJECTED_DUPLICATE_VIDEO =
  'That video is already in the queue.'

/**
 * Guest-visible copy when the guest already has the maximum number of queue rows
 * (now playing + waiting) for the current host cap.
 */
export function buildEnqueueRejectedAlreadyHasRequest(maxSongs: number): string {
  const m = Math.max(1, Math.min(10, Math.floor(maxSongs)))
  const noun = m === 1 ? 'one song' : `${m} songs`
  return `You've already got ${noun} in the queue. You can add another after one plays or is skipped.`
}

/** Default-cap wording (2 rows); kept for tests and call sites that need a stable string. */
export const ENQUEUE_REJECTED_ALREADY_HAS_REQUEST
  = buildEnqueueRejectedAlreadyHasRequest(GUEST_QUEUE_ROWS_CAP_DEFAULT)

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
 * Duplicate-video check first, then per-guest row cap (from host state; default 2 when unset).
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
  /** Authoritative per-guest cap (now playing + waiting rows); default 1–10 from `normalizeGuestQueueRowsCap`. */
  maxGuestQueueRowsPerGuest?: number
}): GuestEnqueueResolution {
  if (isVideoIdInHostQueue(input.videoId, input.snapshot)) {
    return { ok: false, reason: ENQUEUE_REJECTED_DUPLICATE_VIDEO }
  }
  const cap = normalizeGuestQueueRowsCap(input.maxGuestQueueRowsPerGuest)
  const effectiveOwnerId = input.parsedRequesterGuestId ?? input.peerGuestId
  if (countGuestRequestsInQueue(effectiveOwnerId, input.snapshot) >= cap) {
    return { ok: false, reason: buildEnqueueRejectedAlreadyHasRequest(cap) }
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
