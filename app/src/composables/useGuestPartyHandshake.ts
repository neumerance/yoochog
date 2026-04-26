import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { GUEST_QUEUE_ROWS_CAP_DEFAULT } from '@/lib/host-queue/guestQueueLimits'
import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'
import { loadGuestQueueSnapshot, saveGuestQueueSnapshot } from '@/lib/party/guestQueuePersistence'
import { applyGuestPartyMessage } from '@/lib/party/guestPartyState'
import {
  AUDIENCE_CHAT_COOLDOWN_MS,
  AUDIENCE_CHAT_DEDUP_WINDOW_MS,
  CHAT_REJECT_REASON_DISABLED,
  CHAT_REJECT_REASON_DUPLICATE,
} from '@/lib/party/audienceChatPolicy'
import {
  normalizeAudienceChatInput,
  validateAudienceChatText,
} from '@/lib/party/audienceChatValidation'
import {
  DEFAULT_AUDIO_SESSION_UNLOCKED,
  DEFAULT_AUDIENCE_CHAT_ENABLED,
  parsePartyMessage,
  PARTY_MESSAGE_SCHEMA_VERSION,
  serializePartyMessage,
} from '@/lib/party/partyMessages'
import { getOrCreatePartyGuestRequesterId } from '@/lib/party/partyGuestRequesterId'
import { readGuestDisplayName } from '@/lib/guest/guestDisplayName'
import { connectionStepLog } from '@/lib/debug/rtcDebugLog'
import { runGuestPartyHandshake } from '@/lib/webrtc/partyHandshake'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/webrtc/handshakeStatus'
import {
  RECONNECT_VISIBILITY_MIN_HIDDEN_MS,
  shouldStopRetry,
  VISIBILITY_RESUME_HEALTH_PROBE_MS,
} from '@/lib/webrtc/reconnectPolicy'

import { useTabVisibilityRecovery } from './useTabVisibilityRecovery'

/**
 * Guest handshake for `/join/:sessionId` plus party channel state (queue snapshot, enqueue request).
 */
export function useGuestPartyHandshake(sessionId: Ref<string>) {
  const status = ref<HandshakeUiState>('idle')
  const queueSnapshot = ref<HostVideoQueueSnapshot | null>(null)
  const sessionAdminGuestId = ref<string | null>(null)
  const localPartyPeerId = ref<string | null>(null)
  const lastEnqueueError = ref<string | null>(null)
  const lastChatError = ref<string | null>(null)
  const lastQueueSettingsError = ref<string | null>(null)
  const maxGuestQueueRowsPerGuest = ref(GUEST_QUEUE_ROWS_CAP_DEFAULT)
  const audienceChatEnabled = ref(DEFAULT_AUDIENCE_CHAT_ENABLED)
  const hostAudioSessionUnlocked = ref(DEFAULT_AUDIO_SESSION_UNLOCKED)
  /** Wall-clock ms when guest chat cooldown ends (`0` = none). */
  const audienceChatCooldownEndsAt = ref(0)
  /** Last text sent from this tab (for local duplicate UX). */
  const lastGuestChatSend = ref<{ text: string; at: number } | null>(null)
  let enqueueErrorDismissTimer: ReturnType<typeof setTimeout> | null = null
  let chatErrorDismissTimer: ReturnType<typeof setTimeout> | null = null
  let queueSettingsErrorDismissTimer: ReturnType<typeof setTimeout> | null = null
  let sendPartyRaw: ((raw: string) => void) | null = null

  function clearEnqueueErrorDismissTimer() {
    if (enqueueErrorDismissTimer) {
      clearTimeout(enqueueErrorDismissTimer)
      enqueueErrorDismissTimer = null
    }
  }

  function clearChatErrorDismissTimer() {
    if (chatErrorDismissTimer) {
      clearTimeout(chatErrorDismissTimer)
      chatErrorDismissTimer = null
    }
  }

  watch(lastEnqueueError, (msg) => {
    clearEnqueueErrorDismissTimer()
    if (!msg) {
      return
    }
    enqueueErrorDismissTimer = setTimeout(() => {
      lastEnqueueError.value = null
      enqueueErrorDismissTimer = null
    }, 8000)
  })

  watch(lastChatError, (msg) => {
    clearChatErrorDismissTimer()
    if (!msg) {
      return
    }
    chatErrorDismissTimer = setTimeout(() => {
      lastChatError.value = null
      chatErrorDismissTimer = null
    }, 8000)
  })

  function clearQueueSettingsErrorDismissTimer() {
    if (queueSettingsErrorDismissTimer) {
      clearTimeout(queueSettingsErrorDismissTimer)
      queueSettingsErrorDismissTimer = null
    }
  }

  watch(lastQueueSettingsError, (msg) => {
    clearQueueSettingsErrorDismissTimer()
    if (!msg) {
      return
    }
    queueSettingsErrorDismissTimer = setTimeout(() => {
      lastQueueSettingsError.value = null
      queueSettingsErrorDismissTimer = null
    }, 8000)
  })

  const reconnectTrigger = ref(0)
  let failureCount = 0
  let activeDispose: (() => void) | null = null

  const wsUrl = import.meta.env.VITE_SIGNALING_URL?.trim() ?? ''
  const pub = import.meta.env.VITE_PUBNUB_PUBLISH_KEY?.trim() ?? ''
  const sub = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY?.trim() ?? ''
  const hasSignaling = !!(wsUrl || (pub && sub))

  const visibilityRecovery = ref<(() => void) | null>(null)
  const partyLinkHealth = ref<(() => boolean) | null>(null)
  let visibilityResumeProbeTimer: ReturnType<typeof setTimeout> | null = null

  function clearVisibilityResumeProbeTimer() {
    if (visibilityResumeProbeTimer) {
      clearTimeout(visibilityResumeProbeTimer)
      visibilityResumeProbeTimer = null
    }
  }

  useTabVisibilityRecovery({
    minHiddenMs: RECONNECT_VISIBILITY_MIN_HIDDEN_MS,
    onVisibleAfterHidden: () => visibilityRecovery.value?.(),
  })

  function scheduleReconnectFromLoss() {
    if (!sessionId.value) {
      return
    }
    if (activeDispose === null) {
      return
    }

    activeDispose()
    activeDispose = null
    sendPartyRaw = null

    if (shouldStopRetry(failureCount)) {
      status.value = 'failed'
      console.log(
        '[yoochog guest handshake]',
        'Reconnect limit reached. Refresh the page or rejoin.',
      )
      return
    }

    failureCount++
    status.value = 'reconnecting'
    reconnectTrigger.value++
  }

  const prevSessionId = ref<string | null>(null)

  watch(
    () => [sessionId.value, reconnectTrigger.value] as const,
    ([id, trig]) => {
      clearVisibilityResumeProbeTimer()
      partyLinkHealth.value = null
      activeDispose?.()
      activeDispose = null
      sendPartyRaw = null
      queueSnapshot.value = id ? loadGuestQueueSnapshot(id) : null
      sessionAdminGuestId.value = null
      localPartyPeerId.value = null
      lastEnqueueError.value = null
      lastChatError.value = null
      lastQueueSettingsError.value = null
      maxGuestQueueRowsPerGuest.value = GUEST_QUEUE_ROWS_CAP_DEFAULT
      audienceChatEnabled.value = DEFAULT_AUDIENCE_CHAT_ENABLED
      hostAudioSessionUnlocked.value = DEFAULT_AUDIO_SESSION_UNLOCKED
      clearChatErrorDismissTimer()
      clearQueueSettingsErrorDismissTimer()
      audienceChatCooldownEndsAt.value = 0
      lastGuestChatSend.value = null

      if (id !== prevSessionId.value) {
        failureCount = 0
        prevSessionId.value = id
        if (trig !== 0) {
          reconnectTrigger.value = 0
          return
        }
      }

      if (!hasSignaling) {
        connectionStepLog('guest', 'session:skip', 'missing signaling env (VITE_SIGNALING_URL or PubNub keys)')
        status.value = 'missing_config'
        visibilityRecovery.value = null
        return
      }
      if (!id) {
        status.value = 'idle'
        visibilityRecovery.value = null
        return
      }

      connectionStepLog('guest', 'session:startPartyHandshake', {
        sessionId: id,
        reconnectAttempt: reconnectTrigger.value,
      })
      if (reconnectTrigger.value === 0) {
        status.value = 'idle'
      }
      const ac = new AbortController()
      const r = runGuestPartyHandshake({
        sessionId: id,
        signal: ac.signal,
        onStatus: (s) => {
          status.value = s
          if (s === 'connected') {
            failureCount = 0
          }
        },
        onError: (m) => {
          console.log('[yoochog guest handshake]', m)
        },
        onPartyChannelOpen: () => {
          lastEnqueueError.value = null
          lastChatError.value = null
          lastQueueSettingsError.value = null
          const sid = sessionId.value
          if (!sid || !sendPartyRaw) {
            return
          }
          const rid = getOrCreatePartyGuestRequesterId(sid)
          sendPartyRaw(
            serializePartyMessage({
              v: PARTY_MESSAGE_SCHEMA_VERSION,
              type: 'guest_identify',
              requesterGuestId: rid,
            }),
          )
        },
        onPartyMessage: (raw) => {
          const msg = parsePartyMessage(raw)
          if (!msg) {
            return
          }
          const next = applyGuestPartyMessage(
            {
              snapshot: queueSnapshot.value,
              sessionAdminGuestId: sessionAdminGuestId.value,
              maxGuestQueueRowsPerGuest: maxGuestQueueRowsPerGuest.value,
              audienceChatEnabled: audienceChatEnabled.value,
              hostAudioSessionUnlocked: hostAudioSessionUnlocked.value,
              lastEnqueueError: lastEnqueueError.value,
              lastChatError: lastChatError.value,
              lastQueueSettingsError: lastQueueSettingsError.value,
            },
            msg,
          )
          queueSnapshot.value = next.snapshot
          sessionAdminGuestId.value = next.sessionAdminGuestId
          maxGuestQueueRowsPerGuest.value = next.maxGuestQueueRowsPerGuest
          audienceChatEnabled.value = next.audienceChatEnabled
          hostAudioSessionUnlocked.value = next.hostAudioSessionUnlocked
          lastEnqueueError.value = next.lastEnqueueError
          lastChatError.value = next.lastChatError
          lastQueueSettingsError.value = next.lastQueueSettingsError
          if (next.snapshot && sessionId.value) {
            saveGuestQueueSnapshot(sessionId.value, next.snapshot)
          }
        },
        onConnectionLost: () => {
          scheduleReconnectFromLoss()
        },
      })
      localPartyPeerId.value = r.localPartyPeerId
      sendPartyRaw = r.sendPartyRaw
      activeDispose = () => {
        ac.abort()
        r.dispose()
      }
      partyLinkHealth.value = r.isPartyLinkOkForVisibilityResume
      visibilityRecovery.value = () => {
        if (!hasSignaling || !sessionId.value) {
          return
        }
        if (status.value === 'failed' || status.value === 'missing_config') {
          return
        }
        if (status.value !== 'connected') {
          return
        }
        clearVisibilityResumeProbeTimer()
        visibilityResumeProbeTimer = setTimeout(() => {
          visibilityResumeProbeTimer = null
          if (status.value !== 'connected') {
            return
          }
          if (partyLinkHealth.value?.() ?? false) {
            connectionStepLog(
              'guest',
              'visibility:resume:skipReconnect',
              'party link still healthy after long hidden',
            )
            return
          }
          scheduleReconnectFromLoss()
        }, VISIBILITY_RESUME_HEALTH_PROBE_MS)
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    clearVisibilityResumeProbeTimer()
    clearEnqueueErrorDismissTimer()
    clearChatErrorDismissTimer()
    clearQueueSettingsErrorDismissTimer()
    activeDispose?.()
    activeDispose = null
    visibilityRecovery.value = null
  })

  const statusLabel = computed(() => handshakeStatusLabel(status.value))

  function requestEnqueue(
    videoId: string,
    title: string | null,
    requestedBy: string | null,
    requesterGuestId: string,
  ) {
    const trimmed = videoId.trim()
    if (!sendPartyRaw) {
      return
    }
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: trimmed,
      title,
      requestedBy,
      requesterGuestId,
    })
    sendPartyRaw(raw)
  }

  function requestEndCurrentPlayback(requesterGuestId: string) {
    if (!sendPartyRaw) {
      return
    }
    sendPartyRaw(
      serializePartyMessage({
        v: PARTY_MESSAGE_SCHEMA_VERSION,
        type: 'end_current_playback_request',
        requesterGuestId,
      }),
    )
  }

  function requestPauseCurrentPlayback(requesterGuestId: string) {
    if (!sendPartyRaw) {
      return
    }
    sendPartyRaw(
      serializePartyMessage({
        v: PARTY_MESSAGE_SCHEMA_VERSION,
        type: 'pause_current_playback_request',
        requesterGuestId,
      }),
    )
  }

  function requestResumeCurrentPlayback(requesterGuestId: string) {
    if (!sendPartyRaw) {
      return
    }
    sendPartyRaw(
      serializePartyMessage({
        v: PARTY_MESSAGE_SCHEMA_VERSION,
        type: 'resume_current_playback_request',
        requesterGuestId,
      }),
    )
  }

  function requestRemoveRow(rowIndex: number, requesterGuestId: string) {
    if (!sendPartyRaw) {
      return
    }
    sendPartyRaw(
      serializePartyMessage({
        v: PARTY_MESSAGE_SCHEMA_VERSION,
        type: 'remove_queue_row_request',
        rowIndex,
        requesterGuestId,
      }),
    )
  }

  function requestQueueSettingsUpdate(
    payload: { maxGuestQueueRowsPerGuest: number; audienceChatEnabled: boolean },
    requesterGuestId: string,
  ) {
    if (!sendPartyRaw) {
      return
    }
    lastQueueSettingsError.value = null
    sendPartyRaw(
      serializePartyMessage({
        v: PARTY_MESSAGE_SCHEMA_VERSION,
        type: 'queue_settings_update_request',
        maxGuestQueueRowsPerGuest: payload.maxGuestQueueRowsPerGuest,
        audienceChatEnabled: payload.audienceChatEnabled,
        requesterGuestId,
      }),
    )
  }

  /**
   * Sends audience chat to the host. Enforces local validation, cooldown, and duplicate window
   * before writing to the wire.
   */
  function requestAudienceChat(text: string): { ok: true } | { ok: false; reason: string } {
    if (!sendPartyRaw) {
      return { ok: false, reason: 'Not connected.' }
    }
    if (!audienceChatEnabled.value) {
      return { ok: false, reason: CHAT_REJECT_REASON_DISABLED }
    }
    const sid = sessionId.value
    if (!sid) {
      return { ok: false, reason: 'Not connected.' }
    }
    const normalized = normalizeAudienceChatInput(text)
    const v = validateAudienceChatText(normalized)
    if (!v.ok) {
      return { ok: false, reason: v.error }
    }
    const now = Date.now()
    if (now < audienceChatCooldownEndsAt.value) {
      return { ok: false, reason: 'Please wait before sending again.' }
    }
    const last = lastGuestChatSend.value
    if (
      last &&
      normalized === last.text &&
      now - last.at < AUDIENCE_CHAT_DEDUP_WINDOW_MS
    ) {
      return { ok: false, reason: CHAT_REJECT_REASON_DUPLICATE }
    }
    const requesterGuestId = getOrCreatePartyGuestRequesterId(sid)
    const requestedBy = readGuestDisplayName()
    sendPartyRaw(
      serializePartyMessage({
        v: PARTY_MESSAGE_SCHEMA_VERSION,
        type: 'audience_chat_request',
        text: normalized,
        requesterGuestId,
        requestedBy,
      }),
    )
    lastChatError.value = null
    lastGuestChatSend.value = { text: normalized, at: now }
    audienceChatCooldownEndsAt.value = now + AUDIENCE_CHAT_COOLDOWN_MS
    return { ok: true }
  }

  return {
    status,
    statusLabel,
    isSignalingConfigured: computed(() => hasSignaling),
    queueSnapshot,
    sessionAdminGuestId,
    localPartyPeerId,
    lastEnqueueError,
    lastChatError,
    lastQueueSettingsError,
    maxGuestQueueRowsPerGuest,
    audienceChatEnabled,
    hostAudioSessionUnlocked,
    audienceChatCooldownEndsAt,
    requestEnqueue,
    requestEndCurrentPlayback,
    requestPauseCurrentPlayback,
    requestResumeCurrentPlayback,
    requestRemoveRow,
    requestQueueSettingsUpdate,
    requestAudienceChat,
    canRequestEnqueue: computed(() => status.value === 'connected'),
  }
}
