import type { HostVideoQueueItem } from '@/lib/host-queue/hostVideoQueue'

/** Placeholder until queue-driven playback exists (issue #14 scope). */
export const SAMPLE_YOUTUBE_VIDEO_ID = 'M7lc1UVf-VE'

/** Two short public videos for back-to-back host playback QA (issue #16). */
export const DEMO_HOST_QUEUE_IDS = [SAMPLE_YOUTUBE_VIDEO_ID, 'jNQXAC9IVRw'] as const

/** Demo seed rows for the host queue (metadata unknown until guests enqueue). */
export const DEMO_HOST_QUEUE_ITEMS: readonly HostVideoQueueItem[] = DEMO_HOST_QUEUE_IDS.map(
  (videoId) => ({
    videoId,
    title: null,
    requestedBy: null,
  }),
)
