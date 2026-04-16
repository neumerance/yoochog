<template>
  <div class="max-w-7xl mx-auto px-4 py-6 space-y-4">
    <div>
      <h1 class="text-xl font-semibold text-slate-900">Player</h1>
      <p class="text-sm text-slate-500 mt-1">
        Two-column playlist layout preview — embedded player in the primary column; queue sync and sign-in are
        not wired yet.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 lg:min-h-[70vh]">
      <section
        class="lg:col-span-8 rounded-lg border border-slate-200 bg-white shadow-sm min-h-[40vh] flex flex-col p-4"
      >
        <div class="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Primary area</div>
        <div class="w-full aspect-video min-h-[240px] relative bg-black rounded-md overflow-hidden">
          <div
            ref="playerContainer"
            class="absolute inset-0 h-full w-full min-h-0 min-w-0"
            aria-label="YouTube video player"
          />
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <p class="text-xs text-slate-500">
            Sample video until an app-managed queue is available.
          </p>
          <button
            v-if="!audioSessionUnlocked"
            type="button"
            class="text-xs font-medium text-sky-700 hover:text-sky-800 underline underline-offset-2"
            @click="audioSessionUnlocked = true"
          >
            Enable sound (once per session)
          </button>
        </div>
      </section>

      <aside
        class="lg:col-span-4 flex flex-col min-h-[50vh] lg:min-h-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden"
      >
        <div class="flex-1 p-4 text-sm text-slate-500 border-b border-dashed border-slate-200 min-h-[6rem]">
          <p>Reserved for future side panels (metadata, notes, etc.).</p>
        </div>
        <div class="mt-auto p-4 bg-white border-t border-slate-200 space-y-3">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</h2>
          <ul class="list-disc list-inside space-y-1.5 text-sm text-slate-700">
            <li>Example: Building a desk — woodworking intro</li>
            <li>Example: Jazz lo-fi set (placeholder title)</li>
            <li>Example: City drone tour — night lights</li>
          </ul>
          <p class="text-sm text-slate-600 pt-2 border-t border-slate-100">
            <span class="font-medium text-slate-800">User:</span> Avery (placeholder)
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import { useYoutubePlayer } from '@/composables/useYoutubePlayer'
import { SAMPLE_YOUTUBE_VIDEO_ID } from '@/constants/sampleVideo'

const playerContainer = ref<HTMLElement | null>(null)
/** After one tap, queue-driven `loadVideoById` stays unmuted via the composable (no per-song controls). */
const audioSessionUnlocked = ref(false)

useYoutubePlayer(playerContainer, {
  videoId: SAMPLE_YOUTUBE_VIDEO_ID,
  autoplay: true,
  audioSessionUnlocked,
})
</script>
