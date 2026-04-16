<template>
  <div class="max-w-7xl w-full mx-auto px-2 py-2 sm:px-3 flex flex-col flex-1 min-h-0">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 lg:flex-1 lg:min-h-0">
      <section
        class="lg:col-span-8 rounded-md border border-slate-200 bg-white shadow-sm flex flex-col p-2 min-h-0 lg:min-h-[min(85vh,100%)]"
      >
        <div class="w-full aspect-video min-h-[200px] relative bg-black rounded overflow-hidden shrink-0">
          <div
            ref="playerContainer"
            class="absolute inset-0 h-full w-full min-h-0 min-w-0"
            aria-label="YouTube video player"
          />
        </div>
        <div v-if="!audioSessionUnlocked" class="mt-2 shrink-0 flex justify-center">
          <button
            type="button"
            class="min-h-[44px] px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            @click="startSinging"
          >
            Start Singing
          </button>
        </div>
      </section>

      <aside
        class="lg:col-span-4 flex flex-col min-h-0 rounded-md border border-slate-200 bg-slate-50 overflow-hidden lg:min-h-[min(85vh,100%)]"
      >
        <div class="flex-1 p-2 text-sm text-slate-500 border-b border-dashed border-slate-200 min-h-0">
          <p>Reserved for future side panels (metadata, notes, etc.).</p>
        </div>
        <div class="mt-auto p-2 bg-white border-t border-slate-200 space-y-1.5">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</h2>
          <ul class="list-disc list-inside space-y-1 text-sm text-slate-700">
            <li>Example: Building a desk — woodworking intro</li>
            <li>Example: Jazz lo-fi set (placeholder title)</li>
            <li>Example: City drone tour — night lights</li>
          </ul>
          <p class="text-sm text-slate-600 pt-1.5 border-t border-slate-100">
            <span class="font-medium text-slate-800">User:</span> Avery (placeholder)
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

import { useYoutubePlayer } from '@/composables/useYoutubePlayer'
import { SAMPLE_YOUTUBE_VIDEO_ID } from '@/constants/sampleVideo'

const playerContainer = ref<HTMLElement | null>(null)
/** After one tap, queue-driven `loadVideoById` stays unmuted via the composable (no per-song controls). */
const audioSessionUnlocked = ref(false)

const { player, isReady } = useYoutubePlayer(playerContainer, {
  videoId: SAMPLE_YOUTUBE_VIDEO_ID,
  autoplay: true,
  audioSessionUnlocked,
})

function startSinging() {
  audioSessionUnlocked.value = true
}

/** Restart from the beginning when “Start Singing” unlocks audio (covers click before `isReady`). */
watch([isReady, audioSessionUnlocked], () => {
  if (!isReady.value || !audioSessionUnlocked.value || !player.value) {
    return
  }
  try {
    player.value.seekTo(0, true)
    player.value.playVideo()
  } catch {
    // Player may be torn down.
  }
})
</script>
