import type { HostVideoQueueSnapshot } from './hostVideoQueue'

/** Guest-visible message when the host rejects an enqueue because the video is already queued. */
export const ENQUEUE_REJECTED_DUPLICATE_VIDEO =
  'That video is already in the queue.'

/** True when `videoId` already appears anywhere in the host queue snapshot (including now playing). */
export function isVideoIdInHostQueue(
  videoId: string,
  snapshot: HostVideoQueueSnapshot,
): boolean {
  return snapshot.ids.includes(videoId)
}
