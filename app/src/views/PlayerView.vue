<template>
  <div class="max-w-7xl w-full mx-auto px-2 py-2 sm:px-3 flex flex-col flex-1 min-h-0">
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 lg:flex-1 lg:min-h-0">
      <section
        class="lg:col-span-8 rounded-md border border-slate-200 bg-white shadow-sm flex flex-col p-2 min-h-0 lg:min-h-[min(85vh,100%)]"
      >
        <div class="w-full aspect-video min-h-[200px] relative bg-black rounded overflow-hidden shrink-0">
          <div
            v-show="activeVideoId"
            ref="playerContainer"
            class="absolute inset-0 h-full w-full min-h-0 min-w-0"
            aria-label="YouTube video player"
          />
          <HostPlaybackIdle v-if="idleVariant" :variant="idleVariant" class="absolute inset-0 z-10" />
          <div
            v-if="skipMessage"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[90%] rounded-md bg-amber-50/95 border border-amber-200 px-3 py-2 text-sm text-amber-900 text-center shadow"
            role="status"
          >
            {{ skipMessage }}
          </div>
        </div>
        <div v-if="activeVideoId && !audioSessionUnlocked" class="mt-2 shrink-0 flex justify-center">
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
        <div class="flex-1 p-2 text-sm text-slate-600 border-b border-dashed border-slate-200 min-h-0 space-y-2">
          <p class="text-slate-500">
            {{ queueSummary.length }} song(s) in the queue
            <span v-if="idleVariant === 'ended'" class="block text-xs text-slate-400 mt-1">
              Playback finished — end of the list.
            </span>
            <span v-else-if="idleVariant === 'empty'" class="block text-xs text-slate-400 mt-1">
              Queue is empty.
            </span>
          </p>
          <p v-if="queueSummary.current" class="text-xs font-mono text-slate-700 break-all">
            Now: {{ queueSummary.current }}
          </p>
        </div>
        <div class="mt-auto p-2 bg-white border-t border-slate-200 space-y-1.5">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</h2>
          <p class="text-sm text-slate-600">
            Order matches playback after the first “Start Singing” tap.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import HostPlaybackIdle from '@/components/HostPlaybackIdle.vue'
import { useYoutubePlayer } from '@/composables/useYoutubePlayer'
import { DEMO_HOST_QUEUE_IDS } from '@/constants/sampleVideo'
import { createHostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import { onPlaybackEnded, onPlaybackError } from '@/lib/playback/hostPlayback'

const queue = createHostVideoQueue()
const queueTick = ref(0)

function bumpQueue() {
  queueTick.value++
}

queue.append([...DEMO_HOST_QUEUE_IDS])

const idleVariant = ref<'empty' | 'ended' | null>(null)
const skipMessage = ref<string | null>(null)

const activeVideoId = computed(() => {
  queueTick.value
  return queue.currentVideoId()
})

const queueSummary = computed(() => {
  queueTick.value
  return { length: queue.length, current: queue.currentVideoId() }
})

watch(
  () => queueTick.value,
  () => {
    if (queue.isEmpty()) {
      idleVariant.value = 'empty'
    } else if (idleVariant.value === 'empty') {
      idleVariant.value = null
    }
  },
  { immediate: true },
)

const playerContainer = ref<HTMLElement | null>(null)
/** After one tap, queue-driven `loadVideoById` stays unmuted via the composable (no per-song controls). */
const audioSessionUnlocked = ref(false)

const { player, isReady } = useYoutubePlayer(playerContainer, {
  videoId: activeVideoId,
  playbackSequence: queueTick,
  autoplay: true,
  audioSessionUnlocked,
  onEnded: handlePlaybackEnded,
  onPlaying: () => {
    skipMessage.value = null
  },
  onError: () => {
    handlePlaybackError()
  },
})

function handlePlaybackEnded() {
  const action = onPlaybackEnded(queue.hasNext())
  if (action.kind === 'advance') {
    idleVariant.value = null
    queue.advance()
    bumpQueue()
    return
  }
  idleVariant.value = 'ended'
}

function handlePlaybackError() {
  const action = onPlaybackError(queue.hasNext())
  if (action.kind === 'advance') {
    skipMessage.value = 'That one hid from us — skipping ahead.'
    idleVariant.value = null
    queue.advance()
    bumpQueue()
    return
  }
  skipMessage.value = 'That one hid from us — no encore for that clip.'
  idleVariant.value = 'ended'
  window.setTimeout(() => {
    skipMessage.value = null
  }, 4500)
}

watch(idleVariant, (v) => {
  if (v !== 'ended') {
    return
  }
  try {
    player.value?.pauseVideo()
  } catch {
    // Player may be torn down.
  }
})

function startSinging() {
  audioSessionUnlocked.value = true
}

/** Restart from the beginning when “Start Singing” unlocks audio (covers click before `isReady`). */
const didSeekOnFirstUnlock = ref(false)
watch([isReady, audioSessionUnlocked], () => {
  if (!isReady.value || !audioSessionUnlocked.value || !player.value) {
    return
  }
  if (didSeekOnFirstUnlock.value) {
    return
  }
  try {
    player.value.seekTo(0, true)
    player.value.playVideo()
  } catch {
    // Player may be torn down.
  }
  didSeekOnFirstUnlock.value = true
})
</script>
