import { computed, onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

import type { HostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import { resolveGuestEnqueueRequest } from '@/lib/host-queue/guestEnqueuePolicy'
import {
  resolveSessionAdminEndPlaybackRequest,
  resolveSessionAdminRemoveRowRequest,
} from '@/lib/host-queue/sessionAdminPolicy'
import {
  AUDIENCE_CHAT_MAX_VISIBLE_LINES,
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
  onGuestEndedCurrentPlayback?: () => void,
) {
  const status = ref<HandshakeUiState>('idle')
  /**
   * Logical guest id of the session admin (first `guest_identify` or first enqueue in the session).
   * Kept when that guest disconnects so they remain admin after reconnect.
   */
  const sessionAdminGuestId = ref<string | null>(null)
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
    const msg = queueSnapshotToMessage(queue.getSnapshot(), sessionAdminGuestId.value)
    broadcastParty(serializePartyMessage(msg))
  }

  function pushSnapshotToGuest(guestId: string) {
    if (!sendPartyToGuest) {
      return
    }
    const msg = queueSnapshotToMessage(queue.getSnapshot(), sessionAdminGuestId.value)
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

  function removeAudienceChatLine(id: string) {
    audienceChatLines.value = audienceChatLines.value.filter((l) => l.id !== id)
  }

  function handleGuestRaw(guestId: string, raw: string) {
    const msg = parsePartyMessage(raw)
    if (msg?.type === 'guest_identify') {
      ensureSessionAdminFromLogicalId(msg.requesterGuestId)
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
      audienceChatGuestState.clear()
      audienceChatLines.value = []

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
          console.log('[yoochog host handshake]', m)
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
  }
}
