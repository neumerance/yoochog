import {
  normalizeHostVideoQueueSnapshot,
  type HostVideoQueueSnapshot,
} from '@/lib/host-queue/hostVideoQueue'

import type { PartyMessage } from './partyMessages'

export type GuestPartyUiState = {
  snapshot: HostVideoQueueSnapshot | null
  /** Logical guest id of the session admin from `queue_snapshot.sessionAdminPeerId`; `null` if unset. */
  sessionAdminGuestId: string | null
  /**
   * Host-enforced per-guest row cap (now playing + waiting), from `queue_snapshot`;
   * default when the field is absent (older hosts).
   */
  maxGuestQueueRowsPerGuest: number
  lastEnqueueError: string | null
  /** Host `chat_rejected` reason; cleared on successful send path / auto-dismiss in composable. */
  lastChatError: string | null
  /** Host `queue_settings_rejected` reason. */
  lastQueueSettingsError: string | null
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
        sessionAdminGuestId: msg.sessionAdminPeerId,
        maxGuestQueueRowsPerGuest: msg.maxGuestQueueRowsPerGuest,
        lastEnqueueError: prev.lastEnqueueError,
        lastChatError: prev.lastChatError,
        lastQueueSettingsError: prev.lastQueueSettingsError,
      }
    case 'enqueue_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminGuestId: prev.sessionAdminGuestId,
        maxGuestQueueRowsPerGuest: prev.maxGuestQueueRowsPerGuest,
        lastEnqueueError: msg.reason,
        lastChatError: prev.lastChatError,
        lastQueueSettingsError: prev.lastQueueSettingsError,
      }
    case 'chat_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminGuestId: prev.sessionAdminGuestId,
        maxGuestQueueRowsPerGuest: prev.maxGuestQueueRowsPerGuest,
        lastEnqueueError: prev.lastEnqueueError,
        lastChatError: msg.reason,
        lastQueueSettingsError: prev.lastQueueSettingsError,
      }
    case 'queue_settings_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminGuestId: prev.sessionAdminGuestId,
        maxGuestQueueRowsPerGuest: prev.maxGuestQueueRowsPerGuest,
        lastEnqueueError: prev.lastEnqueueError,
        lastChatError: prev.lastChatError,
        lastQueueSettingsError: msg.reason,
      }
    case 'queue_settings_update_request':
      return prev
    case 'enqueue_request':
      return prev
    case 'end_current_playback_request':
      return prev
    case 'remove_queue_row_request':
      return prev
    case 'heartbeat':
      return prev
    case 'guest_identify':
      return prev
    case 'audience_chat_request':
      return prev
  }
}
