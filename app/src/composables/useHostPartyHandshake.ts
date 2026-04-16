import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import { runHostPartyHandshake } from '@/lib/webrtc/partyHandshake'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/webrtc/handshakeStatus'

/**
 * Starts host ↔ guest WebRTC signaling + handshake when PubNub keys or `VITE_SIGNALING_URL` is set.
 */
export function useHostPartyHandshake(hostSessionId: Ref<string>) {
  const status = ref<HandshakeUiState>('idle')
  const error = ref<string | null>(null)
  let dispose: (() => void) | null = null

  const wsUrl = import.meta.env.VITE_SIGNALING_URL?.trim() ?? ''
  const pub = import.meta.env.VITE_PUBNUB_PUBLISH_KEY?.trim() ?? ''
  const sub = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY?.trim() ?? ''
  const hasSignaling = !!(wsUrl || (pub && sub))

  watch(
    () => hostSessionId.value,
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
      const r = runHostPartyHandshake({
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
