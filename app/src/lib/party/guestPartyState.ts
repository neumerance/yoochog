import {
  normalizeHostVideoQueueSnapshot,
  type HostVideoQueueSnapshot,
} from '@/lib/host-queue/hostVideoQueue'
import { type PlayerResolutionPreference } from '@/lib/host-queue/playerResolutionPreference'

import { sessionAdminGuestIdsFromSnapshotMessage, type PartyMessage } from './partyMessages'

export type GuestPartyUiState = {
  snapshot: HostVideoQueueSnapshot | null
  /** Logical guest ids with session-admin powers from `queue_snapshot`. */
  sessionAdminGuestIds: string[]
  /**
   * Host-enforced per-guest row cap (now playing + waiting), from `queue_snapshot`;
   * default when the field is absent (older hosts).
   */
  maxGuestQueueRowsPerGuest: number
  /**
   * When `false`, guests must not send audience chat. Absent on older hosts → treat as on.
   */
  audienceChatEnabled: boolean
  /**
   * From `queue_snapshot`: preferred YouTube playback quality on the host (`auto` = max 720p).
   */
  playerResolution: PlayerResolutionPreference
  /**
   * From `queue_snapshot`: host has cleared the “Click here to start singing” gate (`true`), or
   * is re-locked for the room (`false`). Omitted on older hosts → default unlocked in parse.
   */
  hostAudioSessionUnlocked: boolean
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
        sessionAdminGuestIds: sessionAdminGuestIdsFromSnapshotMessage(msg),
        maxGuestQueueRowsPerGuest: msg.maxGuestQueueRowsPerGuest,
        audienceChatEnabled: msg.audienceChatEnabled,
        playerResolution: msg.playerResolution,
        hostAudioSessionUnlocked: msg.audioSessionUnlocked,
        lastEnqueueError: prev.lastEnqueueError,
        lastChatError: prev.lastChatError,
        lastQueueSettingsError: prev.lastQueueSettingsError,
      }
    case 'enqueue_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminGuestIds: prev.sessionAdminGuestIds,
        maxGuestQueueRowsPerGuest: prev.maxGuestQueueRowsPerGuest,
        audienceChatEnabled: prev.audienceChatEnabled,
        playerResolution: prev.playerResolution,
        hostAudioSessionUnlocked: prev.hostAudioSessionUnlocked,
        lastEnqueueError: msg.reason,
        lastChatError: prev.lastChatError,
        lastQueueSettingsError: prev.lastQueueSettingsError,
      }
    case 'chat_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminGuestIds: prev.sessionAdminGuestIds,
        maxGuestQueueRowsPerGuest: prev.maxGuestQueueRowsPerGuest,
        audienceChatEnabled: prev.audienceChatEnabled,
        playerResolution: prev.playerResolution,
        hostAudioSessionUnlocked: prev.hostAudioSessionUnlocked,
        lastEnqueueError: prev.lastEnqueueError,
        lastChatError: msg.reason,
        lastQueueSettingsError: prev.lastQueueSettingsError,
      }
    case 'queue_settings_rejected':
      return {
        snapshot: prev.snapshot,
        sessionAdminGuestIds: prev.sessionAdminGuestIds,
        maxGuestQueueRowsPerGuest: prev.maxGuestQueueRowsPerGuest,
        audienceChatEnabled: prev.audienceChatEnabled,
        playerResolution: prev.playerResolution,
        hostAudioSessionUnlocked: prev.hostAudioSessionUnlocked,
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
    case 'pause_current_playback_request':
      return prev
    case 'resume_current_playback_request':
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
