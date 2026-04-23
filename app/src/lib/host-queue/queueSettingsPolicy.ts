import { GUEST_QUEUE_ROWS_CAP_MAX, GUEST_QUEUE_ROWS_CAP_MIN } from '@/lib/host-queue/guestQueueLimits'

export const QUEUE_SETTINGS_REJECTED_NOT_ADMIN
  = 'Only the session admin can change queue settings.'

export type QueueSettingsUpdateResolution = { ok: true } | { ok: false; reason: string }

/**
 * Only the **session admin** (logical guest id) may change the per-guest row cap. Same identity
 * rules as other guest→host actions: `requesterGuestId` on the wire is the effective logical id.
 */
export function resolveQueueSettingsUpdateRequest(input: {
  sessionAdminGuestId: string | null
  requesterGuestId: string
}): QueueSettingsUpdateResolution {
  if (
    input.sessionAdminGuestId !== null
    && input.requesterGuestId === input.sessionAdminGuestId
  ) {
    return { ok: true }
  }
  return { ok: false, reason: QUEUE_SETTINGS_REJECTED_NOT_ADMIN }
}

export function isValidQueueSettingsCapValue(n: number): boolean {
  return (
    Number.isInteger(n) && n >= GUEST_QUEUE_ROWS_CAP_MIN && n <= GUEST_QUEUE_ROWS_CAP_MAX
  )
}
