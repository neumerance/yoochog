import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import type { HostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import { normalizeGuestQueueRowsCap, GUEST_QUEUE_ROWS_CAP_DEFAULT } from '@/lib/host-queue/guestQueueLimits'
import { resolveGuestEnqueueRequest } from '@/lib/host-queue/guestEnqueuePolicy'
import { isValidQueueSettingsCapValue, resolveQueueSettingsUpdateRequest } from '@/lib/host-queue/queueSettingsPolicy'
import {
  resolveSessionAdminEndPlaybackRequest,
  resolveSessionAdminPausePlaybackRequest,
  resolveSessionAdminRemoveRowRequest,
  resolveSessionAdminResumePlaybackRequest,
} from '@/lib/host-queue/sessionAdminPolicy'
import {
  AUDIENCE_CHAT_MAX_VISIBLE_LINES,
  CHAT_REJECT_REASON_DISABLED,
  evaluateHostAudienceChatAcceptance,
  nextGuestAudienceChatHostState,
  pickAudienceChatDriftMs,
  type GuestAudienceChatHostState,
} from '@/lib/party/audienceChatPolicy'
import { pickRandomAudienceChatFontFamily } from '@/lib/party/audienceChatFonts'
import {
  parsePartyMessage,
  PARTY_MESSAGE_SCHEMA_VERSION,
  queueSnapshotToMessage,
  serializePartyMessage,
} from '@/lib/party/partyMessages'
import type { PartyMessage } from '@/lib/party/partyMessages'
import { runHostPartySocket } from '@/lib/realtime/partySocket'
import { connectionStepLog } from '@/lib/debug/rtcDebugLog'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/realtime/handshakeStatus'

/**
 * Host Socket.io + party channel: broadcasts queue snapshots and applies guest enqueue requests.
 */
export function useHostPartySession(
  hostSessionId: Ref<string>,
  queue: HostVideoQueue,
  queueTick: Ref<number>,
  bumpQueue: () => void,
  hostAudioSessionUnlocked: Ref<boolean>,
  onGuestEndedCurrentPlayback?: () => void,
  onGuestPausePlayback?: () => void,
  onGuestResumePlayback?: () => void,
) {
  const status = ref<HandshakeUiState>('idle')
  /**
   * Logical guest id of the session admin (first `guest_identify` or first enqueue in the session).
   * Kept when that guest disconnects so they remain admin after reconnect.
   */
  const sessionAdminGuestId = ref<string | null>(null)
  const maxGuestQueueRowsPerGuest = ref(GUEST_QUEUE_ROWS_CAP_DEFAULT)
  const audienceChatEnabled = ref(true)
  /** Per logical guest id (wire `requesterGuestId`) for audience chat rate limits. */
  const audienceChatGuestState = new Map<string, GuestAudienceChatHostState>()
  const audienceChatLines = ref<
    Array<{
      id: string
      text: string
      chatterName: string
      durationMs: number
      fontFamily: string
    }>
  >([])
  let dispose: (() => void) | null = null

  const socketUrl = import.meta.env.VITE_SOCKET_URL?.trim() ?? ''
  const hasSignaling = !!socketUrl

  let broadcastParty: ((raw: string) => void) | null = null
  let sendPartyToGuest: ((guestId: string, raw: string) => void) | null = null

  function pushSnapshotToEveryone() {
    if (!broadcastParty) {
      return
    }
    const msg = queueSnapshotToMessage(
      queue.getSnapshot(),
      sessionAdminGuestId.value,
      maxGuestQueueRowsPerGuest.value,
      audienceChatEnabled.value,
      hostAudioSessionUnlocked.value,
    )
    broadcastParty(serializePartyMessage(msg))
  }

  function pushSnapshotToGuest(guestId: string) {
    if (!sendPartyToGuest) {
      return
    }
    const msg = queueSnapshotToMessage(
      queue.getSnapshot(),
      sessionAdminGuestId.value,
      maxGuestQueueRowsPerGuest.value,
      audienceChatEnabled.value,
      hostAudioSessionUnlocked.value,
    )
    sendPartyToGuest(guestId, serializePartyMessage(msg))
  }

  function ensureSessionAdminFromLogicalId(id: string | null) {
    if (!id || sessionAdminGuestId.value !== null) {
      return
    }
    sessionAdminGuestId.value = id
    pushSnapshotToEveryone()
  }

  function sendReject(guestId: string, reason: string) {
    if (!sendPartyToGuest) {
      return
    }
    const rej: PartyMessage = {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_rejected',
      reason,
    }
    sendPartyToGuest(guestId, serializePartyMessage(rej))
  }

  function sendChatReject(guestId: string, reason: string) {
    if (!sendPartyToGuest) {
      return
    }
    const rej: PartyMessage = {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'chat_rejected',
      reason,
    }
    sendPartyToGuest(guestId, serializePartyMessage(rej))
  }

  function sendQueueSettingsReject(guestId: string, reason: string) {
    if (!sendPartyToGuest) {
      return
    }
    const rej: PartyMessage = {
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'queue_settings_rejected',
      reason,
    }
    sendPartyToGuest(guestId, serializePartyMessage(rej))
  }

  function removeAudienceChatLine(id: string) {
    audienceChatLines.value = audienceChatLines.value.filter((l) => l.id !== id)
  }

  function handleGuestRaw(guestId: string, raw: string) {
    const msg = parsePartyMessage(raw)
    if (msg?.type === 'guest_identify') {
      ensureSessionAdminFromLogicalId(msg.requesterGuestId)
      return
    }
    if (msg?.type === 'queue_settings_update_request') {
      if (!isValidQueueSettingsCapValue(msg.maxGuestQueueRowsPerGuest)) {
        sendQueueSettingsReject(
          guestId,
          'Choose a number between 1 and 10 for max songs per guest.',
        )
        return
      }
      const res = resolveQueueSettingsUpdateRequest({
        sessionAdminGuestId: sessionAdminGuestId.value,
        requesterGuestId: msg.requesterGuestId,
      })
      if (!res.ok) {
        sendQueueSettingsReject(guestId, res.reason)
        return
      }
      if (typeof msg.audienceChatEnabled === 'boolean') {
        const wasOn = audienceChatEnabled.value
        audienceChatEnabled.value = msg.audienceChatEnabled
        if (wasOn && !msg.audienceChatEnabled) {
          audienceChatLines.value = []
        }
      }
      maxGuestQueueRowsPerGuest.value = normalizeGuestQueueRowsCap(
        msg.maxGuestQueueRowsPerGuest,
      )
      pushSnapshotToEveryone()
      return
    }
    if (msg?.type === 'enqueue_request') {
      ensureSessionAdminFromLogicalId(msg.requesterGuestId)
      const resolution = resolveGuestEnqueueRequest({
        snapshot: queue.getSnapshot(),
        videoId: msg.videoId,
        title: msg.title,
        requestedBy: msg.requestedBy,
        parsedRequesterGuestId: msg.requesterGuestId,
        peerGuestId: guestId,
        maxGuestQueueRowsPerGuest: maxGuestQueueRowsPerGuest.value,
      })
      if (!resolution.ok) {
        sendReject(guestId, resolution.reason)
        return
      }
      queue.append([resolution.item])
      bumpQueue()
      return
    }
    if (msg?.type === 'end_current_playback_request') {
      const resolution = resolveSessionAdminEndPlaybackRequest({
        snapshot: queue.getSnapshot(),
        sessionAdminGuestId: sessionAdminGuestId.value,
        peerGuestId: guestId,
        parsedRequesterGuestId: msg.requesterGuestId,
      })
      if (!resolution.ok) {
        sendReject(guestId, resolution.reason)
        return
      }
      onGuestEndedCurrentPlayback?.()
      return
    }
    if (msg?.type === 'pause_current_playback_request') {
      const resolution = resolveSessionAdminPausePlaybackRequest({
        snapshot: queue.getSnapshot(),
        sessionAdminGuestId: sessionAdminGuestId.value,
        peerGuestId: guestId,
        parsedRequesterGuestId: msg.requesterGuestId,
      })
      if (!resolution.ok) {
        sendReject(guestId, resolution.reason)
        return
      }
      onGuestPausePlayback?.()
      return
    }
    if (msg?.type === 'resume_current_playback_request') {
      const resolution = resolveSessionAdminResumePlaybackRequest({
        snapshot: queue.getSnapshot(),
        sessionAdminGuestId: sessionAdminGuestId.value,
        peerGuestId: guestId,
        parsedRequesterGuestId: msg.requesterGuestId,
      })
      if (!resolution.ok) {
        sendReject(guestId, resolution.reason)
        return
      }
      onGuestResumePlayback?.()
      return
    }
    if (msg?.type === 'remove_queue_row_request') {
      const resolution = resolveSessionAdminRemoveRowRequest({
        snapshot: queue.getSnapshot(),
        sessionAdminGuestId: sessionAdminGuestId.value,
        peerGuestId: guestId,
        rowIndex: msg.rowIndex,
        parsedRequesterGuestId: msg.requesterGuestId,
      })
      if (!resolution.ok) {
        sendReject(guestId, resolution.reason)
        return
      }
      queue.removeAt(msg.rowIndex)
      bumpQueue()
      return
    }
    if (msg?.type === 'audience_chat_request') {
      if (!audienceChatEnabled.value) {
        sendChatReject(guestId, CHAT_REJECT_REASON_DISABLED)
        return
      }
      const logicalId = msg.requesterGuestId
      const now = Date.now()
      const prev = audienceChatGuestState.get(logicalId)
      const decision = evaluateHostAudienceChatAcceptance({
        text: msg.text,
        now,
        prev,
      })
      if (!decision.ok) {
        sendChatReject(guestId, decision.reason)
        return
      }
      audienceChatGuestState.set(
        logicalId,
        nextGuestAudienceChatHostState({ text: msg.text, now, prev }),
      )
      const reduced =
        typeof globalThis !== 'undefined' &&
        globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
      const durationMs = pickAudienceChatDriftMs({ prefersReducedMotion: reduced })
      const id =
        typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const chatterName = msg.requestedBy?.trim() || 'Guest'
      const nextLines = [
        ...audienceChatLines.value,
        {
          id,
          text: msg.text,
          chatterName,
          durationMs,
          fontFamily: pickRandomAudienceChatFontFamily(),
        },
      ]
      while (nextLines.length > AUDIENCE_CHAT_MAX_VISIBLE_LINES) {
        nextLines.shift()
      }
      audienceChatLines.value = nextLines
      return
    }
    if (
      msg?.type === 'queue_snapshot' ||
      msg?.type === 'enqueue_rejected' ||
      msg?.type === 'chat_rejected' ||
      msg?.type === 'queue_settings_rejected' ||
      msg?.type === 'heartbeat'
    ) {
      return
    }
    if (msg) {
      return
    }
    try {
      const o = JSON.parse(raw) as { v?: number; type?: string; videoId?: unknown }
      if (
        o &&
        o.v === PARTY_MESSAGE_SCHEMA_VERSION &&
        o.type === 'enqueue_request' &&
        typeof o.videoId === 'string'
      ) {
        sendReject(guestId, 'Invalid video id.')
      }
    } catch {
      // Malformed payloads are ignored.
    }
  }

  watch(
    () => hostSessionId.value,
    (id) => {
      dispose?.()
      dispose = null
      broadcastParty = null
      sendPartyToGuest = null
      sessionAdminGuestId.value = null
      maxGuestQueueRowsPerGuest.value = GUEST_QUEUE_ROWS_CAP_DEFAULT
      audienceChatEnabled.value = true
      audienceChatGuestState.clear()
      audienceChatLines.value = []

      if (!hasSignaling) {
        connectionStepLog('host', 'session:skip', 'missing VITE_SOCKET_URL (Socket.io base URL)')
        status.value = 'missing_config'
        return
      }
      if (!id) {
        status.value = 'idle'
        return
      }

      connectionStepLog('host', 'session:startPartySocket', { sessionId: id })
      status.value = 'idle'
      const ac = new AbortController()
      const r = runHostPartySocket({
        sessionId: id,
        signal: ac.signal,
        onStatus: (s) => {
          status.value = s
        },
        onError: (m) => {
          console.log('[yoochog host party]', m)
        },
        onPartyChannelOpen: (guestId) => {
          pushSnapshotToGuest(guestId)
        },
        onGuestConnectionLost: () => {
          pushSnapshotToEveryone()
        },
        onPartyMessage: (guestId, raw) => {
          handleGuestRaw(guestId, raw)
        },
      })
      broadcastParty = r.broadcastParty
      sendPartyToGuest = r.sendPartyToGuest
      dispose = () => {
        ac.abort()
        r.dispose()
      }
    },
    { immediate: true },
  )

  watch(
    () => queueTick.value,
    () => {
      pushSnapshotToEveryone()
    },
  )

  watch(
    () => hostAudioSessionUnlocked.value,
    () => {
      if (!broadcastParty) {
        return
      }
      pushSnapshotToEveryone()
    },
  )

  onUnmounted(() => {
    dispose?.()
  })

  const statusLabel = computed(() => handshakeStatusLabel(status.value))

  return {
    status,
    statusLabel,
    isSignalingConfigured: computed(() => hasSignaling),
    audienceChatLines,
    removeAudienceChatLine,
    maxGuestQueueRowsPerGuest: computed(() => maxGuestQueueRowsPerGuest.value),
    audienceChatEnabled: computed(() => audienceChatEnabled.value),
  }
}
