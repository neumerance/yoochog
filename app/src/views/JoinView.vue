<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'

import logoUrl from '@/assets/images/logo/yoohchog-logo-v1.png'

import GuestShell from '@/components/GuestShell.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import { useGuestPartyHandshake } from '@/composables/useGuestPartyHandshake'
import {
  readGuestDisplayName,
  saveGuestDisplayName,
  validateGuestDisplayName,
} from '@/lib/guest/guestDisplayName'
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
  lastEnqueueError,
  requestEnqueue,
  canRequestEnqueue,
} = useGuestPartyHandshake(sessionId)

const guestNameDialog = ref<HTMLDialogElement | null>(null)
const guestNameInput = ref('')
const guestNameError = ref<string | null>(null)

const addSongDialog = ref<HTMLDialogElement | null>(null)
const addSongTriggerRef = ref<HTMLButtonElement | null>(null)
const addSongStep = ref<1 | 2>(1)
const pasteInput = ref('')
const pasteValidationError = ref<string | null>(null)
const isEnqueueSubmitting = ref(false)

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}

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

function openAddSongModal() {
  if (!readGuestDisplayName()) {
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
    guestNameError.value = 'Enter a name (1–64 characters).'
    return
  }
  if (!saveGuestDisplayName(v)) {
    guestNameError.value = 'Could not save. Check browser storage settings.'
    return
  }
  guestNameDialog.value?.close()
  openAddSongModalAfterName()
}

function closeGuestNameModal() {
  guestNameDialog.value?.close()
}

function onGuestNameDialogClose() {
  guestNameInput.value = ''
  guestNameError.value = null
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

const YOUTUBE_OPEN_URL = 'https://www.youtube.com'

function goToPasteStep() {
  addSongStep.value = 2
  void nextTick(() => document.getElementById('guest-add-song-paste')?.focus())
}

/** Opens YouTube in a new tab and advances to the paste-link step. */
function continueFromStep1() {
  window.open(YOUTUBE_OPEN_URL, '_blank', 'noopener,noreferrer')
  goToPasteStep()
}

async function submitPasteEnqueue() {
  pasteValidationError.value = null
  const guestName = readGuestDisplayName()
  if (!guestName) {
    pasteValidationError.value = 'Set your display name before adding a song.'
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
    requestEnqueue(id, title, guestName)
    closeAddSongModal()
  } finally {
    isEnqueueSubmitting.value = false
  }
}
</script>

<template>
  <GuestShell
    class="gap-5 bg-[#F2F2F7] pb-8 text-[17px] leading-[1.29] antialiased [font-family:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,'Helvetica_Neue',sans-serif] min-h-[100dvh]"
  >
    <header class="flex justify-center pb-2 pt-1">
      <img
        :src="logoUrl"
        alt="Yoochog"
        class="h-14 w-auto max-w-[min(100%,16rem)] object-contain object-center"
        decoding="async"
      />
    </header>

    <!-- Grouped “cell”: connection status -->
    <div
      class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)]"
      aria-live="polite"
    >
      <div class="px-4 py-3 text-[15px] leading-snug text-[#3C3C43]">
        <HandshakeStatusStrip
          :status="handshakeStatus"
          :status-label="statusLabel"
          :error="handshakeError"
          :is-signaling-configured="isSignalingConfigured"
        />
      </div>
    </div>

    <div
      v-if="lastEnqueueError"
      class="rounded-[10px] border border-[#FFD2CC] bg-[#FFF4F2] px-4 py-3 text-[15px] leading-snug text-[#C93400]"
      role="status"
    >
      {{ lastEnqueueError }}
    </div>

    <div>
      <h2 class="px-1 pb-1 pt-0 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#6D6D72]">
        Queue
      </h2>
      <div
        class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)]"
      >
        <div
          v-if="!(queueSnapshot?.ids?.length)"
          class="px-4 py-2.5"
        >
          <p class="text-[17px] leading-snug text-[#C7C7CC]">
            Nothing queued
          </p>
        </div>

        <ol
          v-else
          class="flex max-h-[min(38vh,20rem)] flex-col overflow-y-auto overscroll-contain"
          aria-label="Playback queue"
        >
          <li
            v-for="(rowId, index) in queueSnapshot?.ids ?? []"
            :key="`${index}-${rowId}`"
            :aria-current="index === queueSnapshot?.currentIndex ? 'true' : undefined"
            class="flex min-h-[44px] border-b border-[#C6C6C8] px-4 py-2 last:border-b-0"
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
                    <p class="truncate text-[17px] font-normal leading-[1.25] tracking-[-0.01em] text-black">
                      {{ queueRowTitle(index) }}
                    </p>
                    <p
                      v-if="queueRowRequester(index)"
                      class="mt-0.5 truncate text-[13px] leading-4 text-[#8E8E93]"
                    >
                      Requested by {{ queueRowRequester(index) }}
                    </p>
                    <p class="mt-0.5 truncate font-mono text-[11px] leading-4 text-[#C7C7CC]">
                      {{ rowId }}
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex shrink-0 items-center gap-2 pt-0.5">
                <span
                  v-if="index === queueSnapshot?.currentIndex"
                  class="inline-flex items-center rounded-full bg-[#FF3B30] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                >
                  Playing
                </span>
                <a
                  class="text-[15px] font-normal leading-5 text-[#007AFF] hover:opacity-80 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#007AFF]"
                  :href="youtubeWatchUrl(rowId)"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  YouTube
                </a>
              </div>
            </div>
          </li>
        </ol>

        <div class="border-t border-[#C6C6C8] bg-[#FAFAFA] p-3">
          <button
            ref="addSongTriggerRef"
            type="button"
            class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-[#FF3B30] px-3 py-2 text-[17px] font-semibold leading-5 text-white shadow-sm transition-[background-color,transform] active:scale-[0.99] active:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30] disabled:cursor-not-allowed disabled:bg-[#C7C7CC] disabled:active:scale-100"
            :disabled="!canRequestEnqueue"
            @click="openAddSongModal"
          >
            Add my song
          </button>
        </div>
      </div>
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
          Your name
        </h2>
        <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)]">
          <p class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43]">
            The host will see this label when you request songs.
          </p>
          <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3">
            <label for="guest-display-name-input" class="block text-[13px] font-normal leading-4 text-[#6D6D72]">
              Display name
            </label>
            <input
              id="guest-display-name-input"
              v-model="guestNameInput"
              type="text"
              autocomplete="name"
              maxlength="64"
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
  </GuestShell>
</template>
