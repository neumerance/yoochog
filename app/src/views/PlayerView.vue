<template>
  <div class="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-1 py-0.5 sm:px-2">
    <div
      class="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,25vw)] lg:gap-2"
    >
      <section
        class="flex min-h-0 flex-[1.2] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-1 shadow-sm sm:p-1.5 lg:h-full lg:min-h-0 lg:min-w-0"
      >
        <div
          class="relative min-h-[72px] w-full flex-1 overflow-hidden rounded bg-black lg:min-h-0"
        >
          <div
            v-show="activeVideoId"
            ref="playerContainer"
            class="absolute inset-0 h-full w-full min-h-0 min-w-0"
            aria-label="YouTube video player"
          />
          <HostPlaybackIdle v-if="idleVariant" :variant="idleVariant" class="absolute inset-0 z-10" />
        </div>
        <div v-if="activeVideoId && !audioSessionUnlocked" class="mt-1 flex shrink-0 justify-center">
          <button
            type="button"
            class="min-h-[40px] rounded-full bg-red-600 px-5 py-1.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-red-700 active:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
            @click="startSinging"
          >
            Start Singing
          </button>
        </div>
      </section>

      <aside
        class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-slate-200 bg-slate-50 lg:min-h-0 lg:min-w-0 lg:w-full"
      >
        <div
          v-if="embedSetupError || skipMessage"
          class="shrink-0 border-b border-red-200 bg-red-50 p-1.5 text-xs text-red-950"
          role="alert"
        >
          <p v-if="embedSetupError" class="font-medium leading-snug">{{ embedSetupError }}</p>
          <p
            v-if="skipMessage"
            class="leading-snug"
            :class="embedSetupError ? 'mt-1 border-t border-red-200/80 pt-1' : ''"
          >
            {{ skipMessage }}
          </p>
        </div>

        <GuestJoinQrPanel :session-id="hostSessionId" class="shrink-0 px-1.5 pt-1.5" />

        <div class="flex min-h-0 flex-1 flex-col p-1.5 text-xs text-slate-600">
          <p
            v-if="showHostSessionDebug"
            class="mb-1 shrink-0 font-mono text-[10px] text-slate-400 break-all"
            aria-hidden="true"
          >
            Host session: {{ hostSessionId }}
          </p>
          <p class="shrink-0 text-slate-500 leading-tight">
            {{ queueLength }} in queue
            <span v-if="idleVariant === 'ended'" class="block text-[10px] text-slate-400">
              End of list.
            </span>
            <span v-else-if="idleVariant === 'empty'" class="block text-[10px] text-slate-400">
              Empty.
            </span>
          </p>

          <div class="mt-1.5 shrink-0 space-y-0.5 border-b border-dashed border-slate-200 pb-1.5">
            <h2 class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Now</h2>
            <p v-if="nowPlayingId" class="font-mono text-[11px] leading-tight text-slate-800 break-all">
              {{ nowPlayingId }}
            </p>
            <p v-else class="text-[11px] text-slate-400">Nothing</p>
            <p v-if="nowPlayingId" class="text-[10px] text-slate-400">Title n/a</p>
          </div>

          <ol
            class="mt-1.5 flex min-h-0 flex-1 flex-col overflow-y-auto rounded border border-slate-200 bg-white divide-y divide-slate-100"
            aria-label="Playback queue"
          >
            <li
              v-for="(rowId, index) in queueSnapshot.ids"
              :key="`${index}-${rowId}`"
              :aria-current="index === queueSnapshot.currentIndex ? 'true' : undefined"
              class="flex items-start justify-between gap-1.5 px-1.5 py-1 text-[11px] leading-tight"
              :class="
                index === queueSnapshot.currentIndex
                  ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-400 text-slate-900'
                  : 'text-slate-700'
              "
            >
              <span class="min-w-0 break-all font-mono">
                <span class="mr-1 tabular-nums text-slate-400 select-none">{{ index + 1 }}.</span>
                {{ rowId }}
              </span>
              <span
                v-if="index === queueSnapshot.currentIndex"
                class="shrink-0 rounded bg-indigo-600 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
              >
                Play
              </span>
            </li>
          </ol>
        </div>

        <div class="shrink-0 space-y-0.5 border-t border-slate-200 bg-white p-1.5">
          <h2 class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Queue</h2>
          <p class="text-[11px] leading-snug text-slate-600">
            Order follows playback after Start Singing.
          </p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import GuestJoinQrPanel from '@/components/GuestJoinQrPanel.vue'
import HostPlaybackIdle from '@/components/HostPlaybackIdle.vue'
import { useHostSessionId } from '@/composables/useHostSessionId'
import { useYoutubePlayer } from '@/composables/useYoutubePlayer'
import { DEMO_HOST_QUEUE_IDS } from '@/constants/sampleVideo'
import { createHostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import { onPlaybackEnded, onPlaybackError } from '@/lib/playback/hostPlayback'

const { hostSessionId } = useHostSessionId()
const showHostSessionDebug = import.meta.env.DEV

const queue = createHostVideoQueue()
const queueTick = ref(0)

function bumpQueue() {
  queueTick.value++
}

queue.append([...DEMO_HOST_QUEUE_IDS])

const idleVariant = ref<'empty' | 'ended' | null>(null)
const skipMessage = ref<string | null>(null)
const embedSetupError = ref<string | null>(null)

const activeVideoId = computed(() => {
  queueTick.value
  return queue.currentVideoId()
})

const queueLength = computed(() => {
  queueTick.value
  return queue.length
})

const queueSnapshot = computed(() => {
  queueTick.value
  return queue.getSnapshot()
})

const nowPlayingId = computed(() => {
  const s = queueSnapshot.value
  if (s.ids.length === 0 || s.currentIndex === null) {
    return null
  }
  return s.ids[s.currentIndex] ?? null
})

watch(
  () => queueTick.value,
  () => {
    embedSetupError.value = null
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
    embedSetupError.value = null
  },
  onError: () => {
    handlePlaybackError()
  },
  onSetupError: () => {
    embedSetupError.value =
      'Could not load the YouTube player. Check your connection and try refreshing the page.'
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
