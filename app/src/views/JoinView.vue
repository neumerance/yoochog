<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import { useGuestPartyHandshake } from '@/composables/useGuestPartyHandshake'
import { guestSessionIdFromRouteParam } from '@/lib/signaling/guestSessionId'

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

const enqueueInput = ref('')

const nowPlayingId = computed(() => {
  const s = queueSnapshot.value
  if (!s || s.ids.length === 0 || s.currentIndex === null) {
    return null
  }
  return s.ids[s.currentIndex] ?? null
})

function submitEnqueue() {
  requestEnqueue(enqueueInput.value)
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
          class="flex items-start justify-between gap-2 px-3 py-3 text-base leading-snug"
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
          <span
            v-if="index === queueSnapshot?.currentIndex"
            class="shrink-0 rounded-md bg-red-600 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-white"
          >
            Playing
          </span>
        </li>
      </ol>
    </div>

    <div class="rounded-md border border-slate-200 bg-slate-50 p-4">
      <label for="guest-enqueue-id" class="block text-sm font-semibold text-slate-800">
        Request a video (YouTube id)
      </label>
      <p class="mt-1 text-sm text-slate-600">Paste an 11-character video id. The host decides what plays.</p>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id="guest-enqueue-id"
          v-model="enqueueInput"
          type="text"
          maxlength="64"
          autocomplete="off"
          placeholder="e.g. dQw4w9WgXcQ"
          class="min-h-11 w-full min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-base text-slate-900 shadow-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:bg-slate-100"
          :disabled="!canRequestEnqueue"
          @keydown.enter.prevent="submitEnqueue"
        />
        <button
          type="button"
          class="min-h-11 shrink-0 rounded-md bg-red-600 px-4 py-2 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          :disabled="!canRequestEnqueue || !enqueueInput.trim()"
          @click="submitEnqueue"
        >
          Request
        </button>
      </div>
    </div>
  </section>
</template>
