import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { runGuestPartyHandshake } from '@/lib/webrtc/partyHandshake'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/webrtc/handshakeStatus'

/**
 * Guest handshake for the party id from `/join/:sessionId` (must match host session id).
 */
export function useGuestPartyHandshake(sessionId: Ref<string>) {
  const status = ref<HandshakeUiState>('idle')
  const error = ref<string | null>(null)
  let dispose: (() => void) | null = null

  const wsUrl = import.meta.env.VITE_SIGNALING_URL?.trim() ?? ''
  const pub = import.meta.env.VITE_PUBNUB_PUBLISH_KEY?.trim() ?? ''
  const sub = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY?.trim() ?? ''
  const hasSignaling = !!(wsUrl || (pub && sub))

  watch(
    () => sessionId.value,
    (id) => {
      dispose?.()
      dispose = null
      error.value = null

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
      })
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

  return {
    status,
    error,
    statusLabel,
    isSignalingConfigured: computed(() => hasSignaling),
  }
}
