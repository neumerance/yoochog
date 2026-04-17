<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'

import logoUrl from '@/assets/images/logo/yoohchog-logo-v1.png'

import GuestShell from '@/components/GuestShell.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import { useGuestPartyHandshake } from '@/composables/useGuestPartyHandshake'
import { guestSessionIdFromRouteParam } from '@/lib/signaling/guestSessionId'
import { extractYoutubeVideoId } from '@/lib/youtube/extractYoutubeVideoId'

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

const addSongDialog = ref<HTMLDialogElement | null>(null)
const addSongTriggerRef = ref<HTMLButtonElement | null>(null)
const addSongStep = ref<1 | 2>(1)
const pasteInput = ref('')
const pasteValidationError = ref<string | null>(null)

const nowPlayingId = computed(() => {
  const s = queueSnapshot.value
  if (!s || s.ids.length === 0 || s.currentIndex === null) {
    return null
  }
  return s.ids[s.currentIndex] ?? null
})

function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`
}

function openAddSongModal() {
  addSongStep.value = 1
  pasteInput.value = ''
  pasteValidationError.value = null
  addSongDialog.value?.showModal()
  void nextTick(() => {
    const root = addSongDialog.value
    root?.querySelector<HTMLElement>('button, [href]')?.focus()
  })
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

function submitPasteEnqueue() {
  pasteValidationError.value = null
  const id = extractYoutubeVideoId(pasteInput.value)
  if (!id) {
    pasteValidationError.value = "That doesn't look like a valid YouTube link."
    return
  }
  requestEnqueue(id)
  closeAddSongModal()
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
                    <p class="break-words text-[17px] font-normal leading-[1.25] tracking-[-0.01em] text-black">
                      {{ rowId }}
                    </p>
                    <p
                      v-if="index === queueSnapshot?.currentIndex && nowPlayingId"
                      class="mt-0.5 text-[13px] leading-4 text-[#8E8E93]"
                    >
                      Title unavailable
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
      ref="addSongDialog"
      class="w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-[14px] border-0 bg-[#F2F2F7] p-0 text-black shadow-2xl backdrop:bg-black/45"
      aria-labelledby="guest-add-song-title"
      aria-modal="true"
      @close="onAddSongDialogClose"
    >
      <div
        class="flex max-h-[min(90vh,32rem)] flex-col gap-4 px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:px-6 sm:pt-6 sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
      >
        <h2 id="guest-add-song-title" class="text-center text-[17px] font-semibold leading-snug text-black">
          Add my song
        </h2>

        <div
          v-if="addSongStep === 1"
          class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15)]"
        >
          <div class="px-4 py-4">
            <p id="guest-add-song-step1" class="text-[15px] leading-relaxed text-[#3C3C43]">
              Find a video in the YouTube app or site, tap
              <span class="font-semibold text-black">Share</span>
              , then
              <span class="font-semibold text-black">Copy link</span>
              . When you’re ready, continue and paste that link here.
            </p>
          </div>
          <div class="flex flex-col gap-px bg-[#C6C6C8] p-0">
            <a
              class="flex min-h-[44px] items-center justify-center bg-white px-4 text-center text-[17px] font-normal text-[#007AFF] active:bg-[#E5E5EA]"
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open YouTube
            </a>
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold text-[#FF3B30] active:bg-[#E5E5EA]"
              @click="goToPasteStep"
            >
              Continue
            </button>
          </div>
        </div>

        <div v-else class="flex flex-col gap-4" aria-describedby="guest-add-song-step2-hint">
          <div class="overflow-hidden rounded-[10px] bg-white px-4 py-4 shadow-[0_0.5px_0_rgba(0,0,0,0.15)]">
            <p id="guest-add-song-step2-hint" class="text-[15px] leading-relaxed text-[#3C3C43]">
              Paste the link you copied from YouTube (Share → Copy link).
            </p>
            <label for="guest-add-song-paste" class="mt-4 block text-[13px] font-semibold uppercase tracking-wide text-[#6D6D72]">
              YouTube link
            </label>
            <input
              id="guest-add-song-paste"
              v-model="pasteInput"
              type="text"
              inputmode="url"
              autocomplete="off"
              maxlength="2048"
              class="mt-2 min-h-[44px] w-full rounded-[10px] border border-[#C6C6C8] bg-white px-3 text-[17px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/25"
              :disabled="!canRequestEnqueue"
              @keydown.enter.prevent="submitPasteEnqueue"
            />
            <p v-if="pasteValidationError" class="mt-2 text-[15px] text-[#FF3B30]" role="status" aria-live="polite">
              {{ pasteValidationError }}
            </p>
          </div>
          <button
            type="button"
            class="flex min-h-[50px] w-full items-center justify-center rounded-[12px] bg-[#FF3B30] px-4 text-[17px] font-semibold text-white shadow-sm transition-colors active:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30] disabled:cursor-not-allowed disabled:bg-[#C7C7CC]"
            :disabled="!canRequestEnqueue || !pasteInput.trim()"
            @click="submitPasteEnqueue"
          >
            Enqueue
          </button>
        </div>

        <div class="flex justify-center border-t border-[#C6C6C8] pt-2">
          <button
            type="button"
            class="min-h-[44px] w-full rounded-[10px] px-4 text-[17px] font-semibold text-[#007AFF] hover:bg-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
            @click="closeAddSongModal"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  </GuestShell>
</template>
