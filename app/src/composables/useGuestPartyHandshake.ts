import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import type { HostVideoQueueSnapshot } from '@/lib/host-queue/hostVideoQueue'
import { applyGuestPartyMessage } from '@/lib/party/guestPartyState'
import { parsePartyMessage, PARTY_MESSAGE_SCHEMA_VERSION } from '@/lib/party/partyMessages'
import { runGuestPartyHandshake } from '@/lib/webrtc/partyHandshake'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/webrtc/handshakeStatus'

/**
 * Guest handshake for `/join/:sessionId` plus party channel state (queue snapshot, enqueue request).
 */
export function useGuestPartyHandshake(sessionId: Ref<string>) {
  const status = ref<HandshakeUiState>('idle')
  const error = ref<string | null>(null)
  const queueSnapshot = ref<HostVideoQueueSnapshot | null>(null)
  const lastEnqueueError = ref<string | null>(null)
  let dispose: (() => void) | null = null
  let sendPartyRaw: ((raw: string) => void) | null = null

  const wsUrl = import.meta.env.VITE_SIGNALING_URL?.trim() ?? ''
  const pub = import.meta.env.VITE_PUBNUB_PUBLISH_KEY?.trim() ?? ''
  const sub = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY?.trim() ?? ''
  const hasSignaling = !!(wsUrl || (pub && sub))

  watch(
    () => sessionId.value,
    (id) => {
      dispose?.()
      dispose = null
      sendPartyRaw = null
      error.value = null
      queueSnapshot.value = null
      lastEnqueueError.value = null

      if (!hasSignaling) {
        status.value = 'missing_config'
        return
      }
      if (!id) {
        status.value = 'idle'
        return
      }

      status.value = 'idle'
      const ac = new AbortController()
      const r = runGuestPartyHandshake({
        sessionId: id,
        signal: ac.signal,
        onStatus: (s) => {
          status.value = s
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
        },
      })
      sendPartyRaw = r.sendPartyRaw
      dispose = () => {
        ac.abort()
        r.dispose()
      }
    },
    { immediate: true },
  )

  onUnmounted(() => {
    dispose?.()
  })

  const statusLabel = computed(() => handshakeStatusLabel(status.value))

  function requestEnqueue(videoId: string) {
    const trimmed = videoId.trim()
    if (!sendPartyRaw) {
      return
    }
    const raw = JSON.stringify({
      v: PARTY_MESSAGE_SCHEMA_VERSION,
      type: 'enqueue_request',
      videoId: trimmed,
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
