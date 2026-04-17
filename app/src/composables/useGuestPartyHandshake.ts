import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'
import { loadGuestQueueSnapshot, saveGuestQueueSnapshot } from '@/lib/party/guestQueuePersistence'
import { applyGuestPartyMessage } from '@/lib/party/guestPartyState'
import { parsePartyMessage, PARTY_MESSAGE_SCHEMA_VERSION } from '@/lib/party/partyMessages'
import { runGuestPartyHandshake } from '@/lib/webrtc/partyHandshake'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/webrtc/handshakeStatus'
import {
  nextDelayMs,
  RECONNECT_VISIBILITY_MIN_HIDDEN_MS,
  shouldStopRetry,
} from '@/lib/webrtc/reconnectPolicy'

import { useTabVisibilityRecovery } from './useTabVisibilityRecovery'

/**
 * Guest handshake for `/join/:sessionId` plus party channel state (queue snapshot, enqueue request).
 */
export function useGuestPartyHandshake(sessionId: Ref<string>) {
  const status = ref<HandshakeUiState>('idle')
  const error = ref<string | null>(null)
  const queueSnapshot = ref<HostVideoQueueSnapshot | null>(null)
  const lastEnqueueError = ref<string | null>(null)
  let enqueueErrorDismissTimer: ReturnType<typeof setTimeout> | null = null
  let sendPartyRaw: ((raw: string) => void) | null = null

  function clearEnqueueErrorDismissTimer() {
    if (enqueueErrorDismissTimer) {
      clearTimeout(enqueueErrorDismissTimer)
      enqueueErrorDismissTimer = null
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

  const reconnectTrigger = ref(0)
  let failureCount = 0
  let backoffTimer: ReturnType<typeof setTimeout> | null = null
  let activeDispose: (() => void) | null = null

  const wsUrl = import.meta.env.VITE_SIGNALING_URL?.trim() ?? ''
  const pub = import.meta.env.VITE_PUBNUB_PUBLISH_KEY?.trim() ?? ''
  const sub = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY?.trim() ?? ''
  const hasSignaling = !!(wsUrl || (pub && sub))

  const visibilityRecovery = ref<(() => void) | null>(null)

  useTabVisibilityRecovery({
    minHiddenMs: RECONNECT_VISIBILITY_MIN_HIDDEN_MS,
    onVisibleAfterHidden: () => visibilityRecovery.value?.(),
  })

  function clearBackoff() {
    if (backoffTimer) {
      clearTimeout(backoffTimer)
      backoffTimer = null
    }
  }

  function scheduleReconnectFromLoss() {
    if (!sessionId.value) {
      return
    }
    if (activeDispose === null) {
      return
    }

    status.value = 'reconnecting'
    error.value = null
    clearBackoff()
    activeDispose()
    activeDispose = null
    sendPartyRaw = null

    if (shouldStopRetry(failureCount)) {
      status.value = 'failed'
      error.value = 'Reconnect limit reached. Refresh the page or rejoin.'
      return
    }

    const delay = nextDelayMs(failureCount)
    failureCount++
    backoffTimer = setTimeout(() => {
      backoffTimer = null
      reconnectTrigger.value++
    }, delay)
  }

  const prevSessionId = ref<string | null>(null)

  watch(
    () => [sessionId.value, reconnectTrigger.value] as const,
    ([id, trig]) => {
      clearBackoff()
      activeDispose?.()
      activeDispose = null
      sendPartyRaw = null
      error.value = null
      queueSnapshot.value = id ? loadGuestQueueSnapshot(id) : null
      lastEnqueueError.value = null

      if (id !== prevSessionId.value) {
        failureCount = 0
        prevSessionId.value = id
        if (trig !== 0) {
          reconnectTrigger.value = 0
          return
        }
      }

      if (!hasSignaling) {
        status.value = 'missing_config'
        visibilityRecovery.value = null
        return
      }
      if (!id) {
        status.value = 'idle'
        visibilityRecovery.value = null
        return
      }

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
          error.value = m
        },
        onPartyChannelOpen: () => {
          lastEnqueueError.value = null
        },
        onPartyMessage: (raw) => {
          const msg = parsePartyMessage(raw)
          if (!msg) {
            return
          }
          const next = applyGuestPartyMessage(
            { snapshot: queueSnapshot.value, lastEnqueueError: lastEnqueueError.value },
            msg,
          )
          queueSnapshot.value = next.snapshot
          lastEnqueueError.value = next.lastEnqueueError
          if (next.snapshot && sessionId.value) {
            saveGuestQueueSnapshot(sessionId.value, next.snapshot)
          }
        },
        onConnectionLost: () => {
          scheduleReconnectFromLoss()
        },
      })
      sendPartyRaw = r.sendPartyRaw
      activeDispose = () => {
        ac.abort()
        r.dispose()
      }
      visibilityRecovery.value = () => {
        if (!hasSignaling || !sessionId.value) {
          return
        }
        if (status.value === 'failed' || status.value === 'missing_config') {
          return
        }
        scheduleReconnectFromLoss()
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    clearEnqueueErrorDismissTimer()
    clearBackoff()
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

  return {
    status,
    error,
    statusLabel,
    isSignalingConfigured: computed(() => hasSignaling),
    queueSnapshot,
    lastEnqueueError,
    requestEnqueue,
    canRequestEnqueue: computed(() => status.value === 'connected'),
  }
}
