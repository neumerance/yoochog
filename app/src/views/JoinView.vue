<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useRoute } from 'vue-router'

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
  <section class="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
    <div>
      <h1 class="mb-2 text-2xl font-bold text-slate-900">Join</h1>
      <p class="text-slate-600">
        Session:
        <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{{ sessionId }}</code>
      </p>
    </div>

    <div
      class="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
      aria-live="polite"
    >
      <HandshakeStatusStrip
        :status="handshakeStatus"
        :status-label="statusLabel"
        :error="handshakeError"
        :is-signaling-configured="isSignalingConfigured"
      />
    </div>

    <div v-if="lastEnqueueError" class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
      {{ lastEnqueueError }}
    </div>

    <div class="flex flex-col gap-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div class="space-y-2">
        <h2 class="text-sm font-bold uppercase tracking-wide text-black">Now playing</h2>
        <p v-if="nowPlayingId" class="break-all font-mono text-xl font-bold leading-tight text-slate-900">
          {{ nowPlayingId }}
        </p>
        <p v-else class="text-xl font-semibold text-slate-400">Nothing queued</p>
        <p v-if="nowPlayingId" class="text-base font-medium text-slate-600">Title unavailable</p>
      </div>

      <ol
        class="flex max-h-[40vh] flex-col divide-y divide-slate-200 overflow-y-auto rounded border border-slate-100"
        aria-label="Playback queue"
      >
        <li
          v-for="(rowId, index) in queueSnapshot?.ids ?? []"
          :key="`${index}-${rowId}`"
          :aria-current="index === queueSnapshot?.currentIndex ? 'true' : undefined"
          class="flex flex-col gap-2 px-3 py-3 text-base leading-snug sm:flex-row sm:items-start sm:justify-between sm:gap-3"
          :class="
            index === queueSnapshot?.currentIndex
              ? 'bg-red-50 ring-2 ring-inset ring-red-400 text-slate-900'
              : 'text-slate-700'
          "
        >
          <span class="min-w-0 break-all font-mono">
            <span class="mr-2 tabular-nums text-slate-400 select-none">{{ index + 1 }}.</span>
            {{ rowId }}
          </span>
          <div class="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
            <a
              class="inline-flex min-h-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 underline-offset-2 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              :href="youtubeWatchUrl(rowId)"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open on YouTube
            </a>
            <span
              v-if="index === queueSnapshot?.currentIndex"
              class="inline-flex rounded-md bg-red-600 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-white"
            >
              Playing
            </span>
          </div>
        </li>
      </ol>

      <div class="border-t border-slate-200 pt-4">
        <button
          ref="addSongTriggerRef"
          type="button"
          class="min-h-11 w-full rounded-md bg-red-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
          :disabled="!canRequestEnqueue"
          @click="openAddSongModal"
        >
          Add my song
        </button>
      </div>
    </div>

    <dialog
      ref="addSongDialog"
      class="w-[calc(100%-2rem)] max-w-md rounded-lg border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-black/50"
      aria-labelledby="guest-add-song-title"
      aria-modal="true"
      @close="onAddSongDialogClose"
    >
      <div class="flex max-h-[min(90vh,32rem)] flex-col gap-4 p-4 sm:p-6">
        <h2 id="guest-add-song-title" class="text-lg font-bold text-slate-900">
          Add my song
        </h2>

        <div v-if="addSongStep === 1" class="flex flex-col gap-4">
          <p id="guest-add-song-step1" class="text-base text-slate-700">
            Find a video in the YouTube app or site, tap
            <span class="font-semibold">Share</span>
            , then
            <span class="font-semibold">Copy link</span>
            . When you’re ready, continue and paste that link here.
          </p>
          <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <a
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-center text-base font-semibold text-slate-900 underline-offset-2 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              href="https://www.youtube.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open YouTube
            </a>
            <button
              type="button"
              class="inline-flex min-h-11 flex-1 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-base font-semibold text-white hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
              @click="goToPasteStep"
            >
              Continue
            </button>
          </div>
        </div>

        <div v-else class="flex flex-col gap-3" aria-describedby="guest-add-song-step2-hint">
          <p id="guest-add-song-step2-hint" class="text-base text-slate-700">
            Paste the link you copied from YouTube (Share → Copy link).
          </p>
          <label for="guest-add-song-paste" class="text-sm font-semibold text-slate-800">
            YouTube link
          </label>
          <input
            id="guest-add-song-paste"
            v-model="pasteInput"
            type="text"
            inputmode="url"
            autocomplete="off"
            maxlength="2048"
            class="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
            :disabled="!canRequestEnqueue"
            @keydown.enter.prevent="submitPasteEnqueue"
          />
          <p v-if="pasteValidationError" class="text-sm text-red-700" role="status" aria-live="polite">
            {{ pasteValidationError }}
          </p>
          <button
            type="button"
            class="min-h-11 w-full rounded-md bg-red-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
            :disabled="!canRequestEnqueue || !pasteInput.trim()"
            @click="submitPasteEnqueue"
          >
            Enqueue
          </button>
        </div>

        <div class="flex justify-end border-t border-slate-100 pt-2">
          <button
            type="button"
            class="min-h-10 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            @click="closeAddSongModal"
          >
            Cancel
          </button>
        </div>
      </div>
    </dialog>
  </section>
</template>
