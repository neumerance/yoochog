import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import type { HostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import {
  parsePartyMessage,
  PARTY_MESSAGE_SCHEMA_VERSION,
  queueSnapshotToMessage,
  serializePartyMessage,
} from '@/lib/party/partyMessages'
import type { PartyMessage } from '@/lib/party/partyMessages'
import { runHostPartyHandshake } from '@/lib/webrtc/partyHandshake'
import { handshakeStatusLabel, type HandshakeUiState } from '@/lib/webrtc/handshakeStatus'

/**
 * Host signaling + WebRTC + party data channel: broadcasts queue snapshots and applies guest enqueue requests.
 */
export function useHostPartySession(
  hostSessionId: Ref<string>,
  queue: HostVideoQueue,
  queueTick: Ref<number>,
  bumpQueue: () => void,
) {
  const status = ref<HandshakeUiState>('idle')
  const error = ref<string | null>(null)
  let dispose: (() => void) | null = null

  const wsUrl = import.meta.env.VITE_SIGNALING_URL?.trim() ?? ''
  const pub = import.meta.env.VITE_PUBNUB_PUBLISH_KEY?.trim() ?? ''
  const sub = import.meta.env.VITE_PUBNUB_SUBSCRIBE_KEY?.trim() ?? ''
  const hasSignaling = !!(wsUrl || (pub && sub))

  let broadcastParty: ((raw: string) => void) | null = null
  let sendPartyToGuest: ((guestId: string, raw: string) => void) | null = null

  function pushSnapshotToEveryone() {
    if (!broadcastParty) {
      return
    }
    const msg = queueSnapshotToMessage(queue.getSnapshot())
    broadcastParty(serializePartyMessage(msg))
  }

  function pushSnapshotToGuest(guestId: string) {
    if (!sendPartyToGuest) {
      return
    }
    const msg = queueSnapshotToMessage(queue.getSnapshot())
    sendPartyToGuest(guestId, serializePartyMessage(msg))
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

  function handleGuestRaw(guestId: string, raw: string) {
    const msg = parsePartyMessage(raw)
    if (msg?.type === 'enqueue_request') {
      queue.append([msg.videoId])
      bumpQueue()
      return
    }
    if (
      msg?.type === 'queue_snapshot' ||
      msg?.type === 'enqueue_rejected' ||
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
        onPartyChannelOpen: (guestId) => {
          pushSnapshotToGuest(guestId)
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
