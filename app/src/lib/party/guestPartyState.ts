import {
  normalizeHostVideoQueueSnapshot,
  type HostVideoQueueSnapshot,
} from '@/lib/host-queue/hostVideoQueue'

import type { PartyMessage } from './partyMessages'

export type GuestPartyUiState = {
  snapshot: HostVideoQueueSnapshot | null
  /** From the latest `queue_snapshot`; `null` when unknown or no admin. */
  sessionAdminPeerId: string | null
  lastEnqueueError: string | null
}

/**
 * Applies an incoming host→guest party message to guest UI state.
 */
export function applyGuestPartyMessage(prev: GuestPartyUiState, msg: PartyMessage): GuestPartyUiState {
  switch (msg.type) {
    case 'queue_snapshot':
      return {
        snapshot: normalizeHostVideoQueueSnapshot({
          ids: msg.ids,
          titles: msg.titles,
          requestedBys: msg.requestedBys,
          requesterGuestIds: msg.requesterGuestIds,
          currentIndex: msg.currentIndex,
        }),
        sessionAdminPeerId: msg.sessionAdminPeerId,
        lastEnqueueError: prev.lastEnqueueError,
      }
    case 'enqueue_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminPeerId: prev.sessionAdminPeerId,
        lastEnqueueError: msg.reason,
      }
    case 'enqueue_request':
      return prev
    case 'end_current_playback_request':
      return prev
    case 'remove_queue_row_request':
      return prev
    case 'heartbeat':
      return prev
  }
}
