<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import logoUrl from '@/assets/images/logo/yoohchog-logo-v1.png'

import GuestShell from '@/components/GuestShell.vue'
import PrivacyNoticeSheet from '@/components/PrivacyNoticeSheet.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import { useGuestPartyHandshake } from '@/composables/useGuestPartyHandshake'
import {
  readGuestDisplayName,
  saveGuestDisplayName,
  validateGuestDisplayName,
} from '@/lib/guest/guestDisplayName'
import {
  countGuestRequestsInQueue,
  ENQUEUE_REJECTED_ALREADY_HAS_REQUEST,
  MAX_GUEST_QUEUE_ROWS_PER_GUEST,
} from '@/lib/host-queue/guestEnqueuePolicy'
import { getOrCreatePartyGuestRequesterId } from '@/lib/party/partyGuestRequesterId'
import { readPrivacyNoticeDismissed } from '@/lib/privacy/privacyNoticeDismissed'
import { guestSessionIdFromRouteParam } from '@/lib/signaling/guestSessionId'
import { extractYoutubeVideoId } from '@/lib/youtube/extractYoutubeVideoId'
import { fetchYoutubeVideoTitle } from '@/lib/youtube/fetchYoutubeVideoTitle'

const route = useRoute()
const sessionId = computed(() => guestSessionIdFromRouteParam(String(route.params.sessionId ?? '')))

const {
  status: handshakeStatus,
  statusLabel,
  error: handshakeError,
  isSignalingConfigured,
  queueSnapshot,
  sessionAdminGuestId,
  lastEnqueueError,
  requestEnqueue,
  requestEndCurrentPlayback,
  requestRemoveRow,
  canRequestEnqueue,
} = useGuestPartyHandshake(sessionId)

const guestNameDialog = ref<HTMLDialogElement | null>(null)
const guestNameInput = ref('')
const guestNameError = ref<string | null>(null)

const privacyNoticeSheet = ref<InstanceType<typeof PrivacyNoticeSheet> | null>(null)

const endSongDialog = ref<HTMLDialogElement | null>(null)
const addSongDialog = ref<HTMLDialogElement | null>(null)
const addSongTriggerRef = ref<HTMLButtonElement | null>(null)
const addSongStep = ref<1 | 2>(1)
const pasteInput = ref('')
const pasteValidationError = ref<string | null>(null)
const isEnqueueSubmitting = ref(false)

/** True when the name dialog was opened from “Add my song”; after save, open that flow. */
const openAddSongAfterGuestName = ref(false)

/** Rows in the snapshot owned by this tab’s guest id (including now playing). */
const mySongsInQueueCount = computed(() => {
  const s = queueSnapshot.value
  const sid = sessionId.value
  if (!s?.ids?.length || !sid) {
    return 0
  }
  const mine = getOrCreatePartyGuestRequesterId(sid)
  return countGuestRequestsInQueue(mine, s)
})

/** Matches host `resolveGuestEnqueueRequest` per-guest cap. */
const atMaxMySongsInQueue = computed(
  () => mySongsInQueueCount.value >= MAX_GUEST_QUEUE_ROWS_PER_GUEST,
)

/** True when connected and policy allows opening the add-song flow (under per-guest row cap). */
const canOpenAddSongFlow = computed(
  () => canRequestEnqueue.value && !atMaxMySongsInQueue.value,
)

function queueRowTitle(index: number): string {
  const s = queueSnapshot.value
  if (!s) {
    return 'Unknown title'
  }
  const t = s.titles[index]
  return t ?? 'Unknown title'
}

function queueRowRequester(index: number): string | null {
  const s = queueSnapshot.value
  if (!s) {
    return null
  }
  return s.requestedBys[index] ?? null
}

function isMyQueueRow(index: number): boolean {
  const s = queueSnapshot.value
  if (!s || !sessionId.value) {
    return false
  }
  const mine = getOrCreatePartyGuestRequesterId(sessionId.value)
  return s.requesterGuestIds[index] === mine
}

/** First guest in the session (stable logical id from host); used for admin-only actions. */
const isSessionAdmin = computed(() => {
  const sid = sessionId.value
  if (!sid) {
    return false
  }
  const admin = sessionAdminGuestId.value
  const mine = getOrCreatePartyGuestRequesterId(sid)
  return admin !== null && mine === admin
})

/** Saved display name (re-read after save / when connecting). */
const guestDisplayName = ref<string | null>(null)

function refreshGuestDisplayName() {
  guestDisplayName.value = readGuestDisplayName()
}

const guestDisplayNameLabel = computed(() => {
  const n = guestDisplayName.value?.trim()
  return n && n.length > 0 ? n : 'Guest'
})

const guestAvatarInitials = computed(() => {
  const n = guestDisplayName.value?.trim()
  if (!n) {
    return 'G'
  }
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0]
    const b = parts[1]![0]
    if (a && b) {
      return (a + b).toUpperCase()
    }
  }
  return n.slice(0, 2).toUpperCase()
})

watch(handshakeStatus, (s) => {
  if (s === 'connected') {
    refreshGuestDisplayName()
  }
})

/**
 * Stop current track: **session admin** (any now-playing row) **or** **owner** of that row only.
 * Host: `resolveSessionAdminEndPlaybackRequest`.
 */
const canShowEndNowPlaying = computed(() => {
  if (!canRequestEnqueue.value) {
    return false
  }
  const s = queueSnapshot.value
  if (!s || s.currentIndex === null || s.ids.length === 0) {
    return false
  }
  if (isSessionAdmin.value) {
    return true
  }
  return isMyQueueRow(s.currentIndex)
})

/**
 * Remove a future (non-current) row: **session admin** (any row) **or** **owner** of that row.
 * Now-playing row uses “End for everyone” instead.
 */
function canShowRemoveQueueRow(index: number): boolean {
  if (!canRequestEnqueue.value) {
    return false
  }
  const s = queueSnapshot.value
  if (!s || s.currentIndex === null) {
    return false
  }
  if (index === s.currentIndex) {
    return false
  }
  if (isSessionAdmin.value) {
    return true
  }
  return isMyQueueRow(index)
}

function openEndSongDialog() {
  endSongDialog.value?.showModal()
  void nextTick(() => {
    endSongDialog.value?.querySelector<HTMLElement>('button, [href]')?.focus()
  })
}

function closeEndSongDialog() {
  endSongDialog.value?.close()
}

function confirmEndSong() {
  const sid = sessionId.value
  if (!sid) {
    closeEndSongDialog()
    return
  }
  requestEndCurrentPlayback(getOrCreatePartyGuestRequesterId(sid))
  closeEndSongDialog()
}

function onRemoveQueueRow(index: number) {
  const sid = sessionId.value
  if (!sid) {
    return
  }
  requestRemoveRow(index, getOrCreatePartyGuestRequesterId(sid))
}

function onAddSongBarTap() {
  if (!canRequestEnqueue.value) {
    return
  }
  if (atMaxMySongsInQueue.value) {
    window.alert(ENQUEUE_REJECTED_ALREADY_HAS_REQUEST)
    return
  }
  openAddSongModal()
}

function tryOpenGuestNameModalIfNeeded() {
  if (readGuestDisplayName()) {
    return
  }
  openAddSongAfterGuestName.value = false
  guestNameInput.value = ''
  guestNameError.value = null
  guestNameDialog.value?.showModal()
  void nextTick(() => document.getElementById('guest-display-name-input')?.focus())
}

function openAddSongModal() {
  if (!readGuestDisplayName()) {
    openAddSongAfterGuestName.value = true
    guestNameInput.value = ''
    guestNameError.value = null
    guestNameDialog.value?.showModal()
    void nextTick(() => document.getElementById('guest-display-name-input')?.focus())
    return
  }
  openAddSongModalAfterName()
}

function openAddSongModalAfterName() {
  addSongStep.value = 1
  pasteInput.value = ''
  pasteValidationError.value = null
  addSongDialog.value?.showModal()
  void nextTick(() => {
    const root = addSongDialog.value
    root?.querySelector<HTMLElement>('button, [href]')?.focus()
  })
}

function submitGuestName() {
  guestNameError.value = null
  const v = validateGuestDisplayName(guestNameInput.value)
  if (!v) {
    guestNameError.value = 'Enter a nickname (1–10 characters).'
    return
  }
  if (!saveGuestDisplayName(v)) {
    guestNameError.value = 'Could not save. Check browser storage settings.'
    return
  }
  const openAddSong = openAddSongAfterGuestName.value
  openAddSongAfterGuestName.value = false
  refreshGuestDisplayName()
  guestNameDialog.value?.close()
  if (openAddSong) {
    openAddSongModalAfterName()
  }
}

function closeGuestNameModal() {
  openAddSongAfterGuestName.value = false
  guestNameDialog.value?.close()
}

function onGuestNameDialogClose() {
  guestNameInput.value = ''
  guestNameError.value = null
  openAddSongAfterGuestName.value = false
}

function onPrivacyNoticeDismissed() {
  void nextTick(() => tryOpenGuestNameModalIfNeeded())
}

function closeAddSongModal() {
  addSongDialog.value?.close()
}

function onAddSongDialogClose() {
  addSongStep.value = 1
  pasteInput.value = ''
  pasteValidationError.value = null
  void nextTick(() => addSongTriggerRef.value?.focus())
}

function goToPasteStep() {
  addSongStep.value = 2
  void nextTick(() => document.getElementById('guest-add-song-paste')?.focus())
}

/** Advances to the paste step without opening external sites. */
function continueFromStep1() {
  goToPasteStep()
}

async function submitPasteEnqueue() {
  pasteValidationError.value = null
  const guestName = readGuestDisplayName()
  if (!guestName) {
    pasteValidationError.value = 'Set your display name before adding a song.'
    return
  }
  if (atMaxMySongsInQueue.value) {
    pasteValidationError.value = ENQUEUE_REJECTED_ALREADY_HAS_REQUEST
    return
  }
  const id = extractYoutubeVideoId(pasteInput.value)
  if (!id) {
    pasteValidationError.value = "That doesn't look like a valid YouTube link."
    return
  }
  if (isEnqueueSubmitting.value) {
    return
  }
  isEnqueueSubmitting.value = true
  try {
    const title = await fetchYoutubeVideoTitle(id)
    const requesterId = getOrCreatePartyGuestRequesterId(sessionId.value)
    requestEnqueue(id, title, guestName, requesterId)
    closeAddSongModal()
  } finally {
    isEnqueueSubmitting.value = false
  }
}

onMounted(() => {
  refreshGuestDisplayName()
  if (!readPrivacyNoticeDismissed()) {
    void nextTick(() => privacyNoticeSheet.value?.open())
  } else {
    void nextTick(() => tryOpenGuestNameModalIfNeeded())
  }
})
</script>

<template>
  <GuestShell
    class="flex h-full min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden !pb-0 bg-[#F2F2F7] text-[17px] leading-[1.29] antialiased [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',sans-serif]"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
    <header class="flex shrink-0 justify-center pb-2 pt-1">
      <img
        :src="logoUrl"
        alt="Yoochog"
        class="h-14 w-auto max-w-[min(100%,16rem)] object-contain object-center"
        decoding="async"
      />
    </header>

    <!-- Connection status + WebRTC (left); you / avatar / name (right when connected) -->
    <div
      class="shrink-0 overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)]"
      aria-live="polite"
    >
      <div class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1 text-[15px] leading-snug text-[#3C3C43]">
          <HandshakeStatusStrip
            :status="handshakeStatus"
            :status-label="statusLabel"
            :error="handshakeError"
            :is-signaling-configured="isSignalingConfigured"
          />
        </div>
        <div
          v-if="handshakeStatus === 'connected'"
          class="flex min-w-0 shrink-0 items-center gap-2 border-l border-[#C6C6C8] pl-3"
          role="region"
          :aria-label="isSessionAdmin ? 'You are the session admin' : 'Your display name'"
        >
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold leading-none text-white tabular-nums"
            :class="
              isSessionAdmin
                ? 'bg-[#FF3B30] shadow-[0_1px_2px_rgba(255,59,48,0.35)] ring-2 ring-[#FF3B30]/20 ring-offset-1 ring-offset-white'
                : 'bg-[#007AFF] shadow-[0_1px_2px_rgba(0,122,255,0.25)]'
            "
            aria-hidden="true"
          >
            {{ guestAvatarInitials }}
          </div>
          <div class="min-w-0 max-w-[11rem]">
            <p class="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-black">
              {{ guestDisplayNameLabel }}<span
                v-if="isSessionAdmin"
                class="font-medium text-[#6D6D72]"
              >
                — Admin</span>
            </p>
          </div>
        </div>
      </div>
    </div>

    <Transition name="enqueue-toast">
      <div
        v-if="lastEnqueueError"
        class="overflow-hidden rounded-[12px] bg-white px-4 py-3 text-center text-[15px] font-normal leading-[1.38] tracking-[-0.24px] text-[#3C3C43] shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)]"
        role="status"
        aria-live="polite"
      >
        {{ lastEnqueueError }}
      </div>
    </Transition>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <h2 class="shrink-0 px-1 pb-1 pt-0 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#6D6D72]">
        Queue
      </h2>
      <div
        class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)]"
      >
        <div
          v-if="!(queueSnapshot?.ids?.length)"
          class="flex min-h-0 w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center"
          role="status"
          aria-label="Queue is empty"
        >
          <p
            class="max-w-[17rem] text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black"
          >
            No songs in the queue yet
          </p>
          <p
            class="mt-2 max-w-[17rem] text-[13px] font-normal leading-[1.38] text-[#8E8E93]"
          >
            When someone adds a song, it will show up here.
          </p>
        </div>

        <ol
          v-else
          class="ios-scroll flex min-h-0 w-full min-w-0 flex-1 flex-col"
          aria-label="Playback queue"
        >
          <li
            v-for="(rowId, index) in queueSnapshot?.ids ?? []"
            :key="`${index}-${rowId}`"
            :aria-current="index === queueSnapshot?.currentIndex ? 'true' : undefined"
            class="flex min-h-[44px] min-w-0 w-full shrink-0 border-b border-[#C6C6C8] px-4 py-3.5 last:border-b-0"
            :class="
              index === queueSnapshot?.currentIndex
                ? 'bg-[rgba(255,59,48,0.08)]'
                : 'bg-white'
            "
          >
            <div class="flex w-full min-w-0 items-start gap-2">
              <div class="min-w-0 flex-1 pt-0.5">
                <div class="flex items-start gap-2">
                  <span class="w-5 shrink-0 pt-0.5 text-right text-[13px] tabular-nums leading-5 text-[#8E8E93] select-none">{{ index + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <p
                      class="min-w-0 truncate text-left text-[17px] font-normal leading-[1.35] tracking-[-0.01em] text-black"
                    >
                      {{ queueRowTitle(index) }}
                    </p>
                    <p
                      v-if="queueRowRequester(index)"
                      class="mt-1.5 min-w-0 truncate text-left text-[15px] font-normal leading-[1.45] text-[#6D6D72]"
                    >
                      <span class="font-medium">Requested by </span>
                      <span class="font-bold text-black">{{ queueRowRequester(index) }}</span>
                    </p>
                    <p
                      v-if="isMyQueueRow(index)"
                      class="mt-1 min-w-0 text-left text-[13px] font-medium leading-[1.35] text-[#8E8E93]"
                    >
                      Your request
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end gap-2 pt-0.5">
                <button
                  v-if="index === queueSnapshot?.currentIndex && canShowEndNowPlaying"
                  type="button"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF3B30] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[transform,background-color] active:scale-[0.96] active:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
                  aria-label="Stop this song for everyone"
                  @click="openEndSongDialog"
                >
                  <!-- Classic player stop: solid square on red (same red as Playing pill) -->
                  <svg
                    class="pointer-events-none h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <rect x="5" y="5" width="14" height="14" rx="1.5" fill="white" />
                  </svg>
                </button>
                <button
                  v-if="canShowRemoveQueueRow(index)"
                  type="button"
                  class="shrink-0 rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight text-[#FF3B30] transition-colors active:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
                  @click="onRemoveQueueRow(index)"
                >
                  Remove
                </button>
                <span
                  v-if="index === queueSnapshot?.currentIndex"
                  class="inline-flex items-center rounded-full bg-[#FF3B30] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                >
                  Playing
                </span>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
    </div>

    <div
      class="mb-[10dvh] shrink-0 border-t border-[#C6C6C8] bg-[#FAFAFA] px-3 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+1rem))]"
    >
      <button
        ref="addSongTriggerRef"
        type="button"
        class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] px-3 py-2 text-[17px] font-semibold leading-5 text-white shadow-sm transition-[background-color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:active:scale-100"
        :class="
          canOpenAddSongFlow
            ? 'bg-[#FF3B30] active:scale-[0.99] active:bg-[#D70015] focus-visible:outline-[#FF3B30]'
            : [
                'bg-[#C7C7CC]',
                canRequestEnqueue && atMaxMySongsInQueue ? 'cursor-pointer' : 'cursor-default',
              ]
        "
        :disabled="!canRequestEnqueue"
        :aria-label="
          atMaxMySongsInQueue
            ? 'Add my song — you already have two songs in the queue'
            : 'Add my song'
        "
        @click="onAddSongBarTap"
      >
        Add my song
      </button>
    </div>

    <dialog
      ref="guestNameDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-name-title"
      aria-modal="true"
      @close="onGuestNameDialogClose"
    >
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4"
      >
        <h2 id="guest-name-title" class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black">
          Your nickname
        </h2>
        <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)]">
          <p class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43]">
            The host will see this label when you request songs.
          </p>
          <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3">
            <label for="guest-display-name-input" class="block text-[13px] font-normal leading-4 text-[#6D6D72]">
              Nickname
            </label>
            <input
              id="guest-display-name-input"
              v-model="guestNameInput"
              type="text"
              autocomplete="nickname"
              maxlength="10"
              class="mt-2 min-h-[44px] w-full rounded-[8px] border border-[#C6C6C8] bg-[#FAFAFA] px-3 text-[17px] leading-[22px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
              @keydown.enter.prevent="submitGuestName"
            />
            <p v-if="guestNameError" class="mt-2 text-center text-[13px] leading-[1.38] text-[#FF3B30]" role="status">
              {{ guestNameError }}
            </p>
          </div>
          <div class="border-t border-[#C6C6C8]">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30]"
              @click="submitGuestName"
            >
              Continue
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#007AFF] shadow-[0_0.5px_0_rgba(0,0,0,0.12)] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
          @click="closeGuestNameModal"
        >
          Cancel
        </button>
      </div>
    </dialog>

    <dialog
      ref="addSongDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-add-song-title"
      aria-modal="true"
      @close="onAddSongDialogClose"
    >
      <!-- iOS alert-style sheet: grouped white actions + separate Cancel pill on system gray -->
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4"
      >
        <h2 id="guest-add-song-title" class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black">
          Add my song
        </h2>

        <div
          v-if="addSongStep === 1"
          class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)]"
        >
          <p id="guest-add-song-step1" class="px-4 pb-3 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43]">
            Find a video in the YouTube app or site, tap
            <span class="font-semibold text-black">Share</span>
            , then
            <span class="font-semibold text-black">Copy link</span>
            . When you’re ready, continue and paste that link here.
          </p>
          <div class="border-t border-[#C6C6C8]">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30]"
              @click="continueFromStep1"
            >
              Continue
            </button>
          </div>
        </div>

        <div v-else class="flex flex-col gap-2.5" aria-describedby="guest-add-song-step2-hint">
          <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)]">
            <p id="guest-add-song-step2-hint" class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43]">
              Paste the link you copied from YouTube (Share → Copy link).
            </p>
            <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3">
              <label for="guest-add-song-paste" class="block text-[13px] font-normal leading-4 text-[#6D6D72]">
                YouTube link
              </label>
              <input
                id="guest-add-song-paste"
                v-model="pasteInput"
                type="text"
                inputmode="url"
                autocomplete="off"
                maxlength="2048"
                class="mt-2 min-h-[44px] w-full rounded-[8px] border border-[#C6C6C8] bg-[#FAFAFA] px-3 text-[17px] leading-[22px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20"
                :disabled="!canRequestEnqueue || isEnqueueSubmitting"
                @keydown.enter.prevent="submitPasteEnqueue"
              />
              <p v-if="pasteValidationError" class="mt-2 text-center text-[13px] leading-[1.38] text-[#FF3B30]" role="status" aria-live="polite">
                {{ pasteValidationError }}
              </p>
            </div>
            <div class="border-t border-[#C6C6C8]">
              <button
                type="button"
                class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] disabled:cursor-not-allowed disabled:text-[#C7C7CC] disabled:active:bg-white"
                :disabled="!canRequestEnqueue || !pasteInput.trim() || isEnqueueSubmitting"
                @click="submitPasteEnqueue"
              >
                {{ isEnqueueSubmitting ? '…' : 'Enqueue' }}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#007AFF] shadow-[0_0.5px_0_rgba(0,0,0,0.12)] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
          @click="closeAddSongModal"
        >
          Cancel
        </button>
      </div>
    </dialog>

    <dialog
      ref="endSongDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-end-song-title"
      aria-modal="true"
    >
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4"
      >
        <h2
          id="guest-end-song-title"
          class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black"
        >
          End this song?
        </h2>
        <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)]">
          <p class="px-4 pb-3 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43]">
            This stops playback for everyone and continues like the song finished on its own.
          </p>
          <div class="border-t border-[#C6C6C8]">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30]"
              @click="confirmEndSong"
            >
              End
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#007AFF] shadow-[0_0.5px_0_rgba(0,0,0,0.12)] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
          @click="closeEndSongDialog"
        >
          Cancel
        </button>
      </div>
    </dialog>

    <PrivacyNoticeSheet ref="privacyNoticeSheet" @dismissed="onPrivacyNoticeDismissed" />
  </GuestShell>
</template>

<style scoped>
.enqueue-toast-enter-active,
.enqueue-toast-leave-active {
  transition: opacity 0.22s ease;
}
.enqueue-toast-enter-from,
.enqueue-toast-leave-to {
  opacity: 0;
}
</style>
