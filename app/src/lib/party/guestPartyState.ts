import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'

import type { PartyMessage } from './partyMessages'

export type GuestPartyUiState = {
  snapshot: HostVideoQueueSnapshot | null
  lastEnqueueError: string | null
}

/**
 * Applies an incoming host→guest party message to guest UI state.
 */
export function applyGuestPartyMessage(prev: GuestPartyUiState, msg: PartyMessage): GuestPartyUiState {
  switch (msg.type) {
    case 'queue_snapshot':
      return {
        snapshot: {
          ids: Object.freeze([...msg.ids]),
          titles: Object.freeze([...msg.titles]),
          requestedBys: Object.freeze([...msg.requestedBys]),
          requesterGuestIds: Object.freeze([...msg.requesterGuestIds]),
          currentIndex: msg.currentIndex,
        },
        lastEnqueueError: prev.lastEnqueueError,
      }
    case 'enqueue_rejected':
      return {
        snapshot: prev.snapshot,
        lastEnqueueError: msg.reason,
      }
    case 'enqueue_request':
      return prev
    case 'heartbeat':
      return prev
  }
}
