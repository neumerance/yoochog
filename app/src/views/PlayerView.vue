<template>
  <div class="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden px-2 py-1 sm:px-3">
    <div
      class="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden lg:grid lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,25vw)] lg:gap-3"
    >
      <section
        class="flex min-h-0 flex-[1.2] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-2 shadow-sm sm:p-3 lg:h-full lg:min-h-0 lg:min-w-0"
      >
        <div
          class="relative min-h-[120px] w-full flex-1 overflow-hidden rounded bg-black lg:min-h-0"
        >
          <div
            v-show="activeVideoId"
            ref="playerContainer"
            class="absolute inset-0 h-full w-full min-h-0 min-w-0"
            aria-label="YouTube video player"
          />
          <HostPlaybackIdle v-if="idleVariant" :variant="idleVariant" class="absolute inset-0 z-10" />
        </div>
        <div v-if="activeVideoId && !audioSessionUnlocked" class="mt-2 flex shrink-0 justify-center">
          <button
            type="button"
            class="min-h-[52px] rounded-full bg-red-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-red-700 active:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:min-h-[56px] sm:text-xl"
            @click="startSinging"
          >
            Start Singing
          </button>
        </div>
      </section>

      <aside class="flex min-h-0 flex-1 flex-col overflow-hidden lg:min-h-0 lg:min-w-0 lg:w-full">
        <div
          v-if="embedSetupError || skipMessage"
          class="shrink-0 border-b border-red-200 bg-red-50 p-3 text-base leading-snug text-red-950"
          role="alert"
        >
          <p v-if="embedSetupError" class="font-semibold">{{ embedSetupError }}</p>
          <p
            v-if="skipMessage"
            class="leading-snug"
            :class="embedSetupError ? 'mt-2 border-t border-red-200/80 pt-2' : ''"
          >
            {{ skipMessage }}
          </p>
        </div>

        <GuestJoinQrPanel :session-id="hostSessionId" class="shrink-0 px-2 pt-2 sm:px-3 sm:pt-3" />

        <div
          class="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 sm:px-4"
          aria-live="polite"
        >
          <HandshakeStatusStrip
            :status="handshakeStatus"
            :status-label="handshakeStatusLabel"
            :error="handshakeError"
            :is-signaling-configured="isSignalingConfigured"
          />
        </div>

        <div class="flex min-h-0 flex-1 flex-col p-3 text-base text-slate-700">
          <h2 class="shrink-0 pb-2 text-sm font-bold uppercase tracking-wide text-black sm:text-base">
            Now playing
          </h2>
          <ol
            class="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto divide-y divide-slate-200"
            aria-label="Playback queue"
          >
            <li
              v-for="(rowId, index) in queueSnapshot.ids"
              :key="`${index}-${rowId}`"
              :aria-current="index === queueSnapshot.currentIndex ? 'true' : undefined"
              class="flex min-w-0 shrink-0 items-start justify-between gap-2 px-3 py-3.5 text-base leading-snug"
              :class="
                index === queueSnapshot.currentIndex
                  ? 'bg-red-50 ring-2 ring-inset ring-red-400 text-slate-900'
                  : 'text-slate-700'
              "
            >
              <div class="min-w-0 flex-1">
                <p class="min-w-0 truncate text-left font-semibold leading-snug text-slate-900">
                  <span class="mr-2 tabular-nums font-normal text-slate-400 select-none">{{
                    index + 1
                  }}.</span>
                  {{ rowTitle(queueSnapshot.titles[index] ?? null) }}
                  <span
                    v-if="queueSnapshot.requesterGuestIds[index]"
                    class="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"
                    title="Guest-requested row (one song per guest)"
                    aria-hidden="true"
                  />
                </p>
                <p
                  v-if="queueSnapshot.requestedBys[index]"
                  class="mt-1.5 min-w-0 truncate text-left text-sm leading-[1.45] sm:text-base sm:leading-[1.45]"
                >
                  <span class="font-medium text-slate-600">Requested by </span>
                  <span class="font-bold text-slate-900">{{ queueSnapshot.requestedBys[index] }}</span>
                </p>
              </div>
              <span
                v-if="index === queueSnapshot.currentIndex"
                class="shrink-0 rounded-md bg-red-600 px-2 py-1 text-sm font-semibold uppercase tracking-wide text-white"
              >
                Playing
              </span>
            </li>
          </ol>
        </div>
      </aside>
    </div>
  </div>
  <PrivacyNoticeSheet ref="privacyNoticeSheet" />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import GuestJoinQrPanel from '@/components/GuestJoinQrPanel.vue'
import PrivacyNoticeSheet from '@/components/PrivacyNoticeSheet.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import HostPlaybackIdle from '@/components/HostPlaybackIdle.vue'
import { useHostPartySession } from '@/composables/useHostPartySession'
import { useHostSessionId } from '@/composables/useHostSessionId'
import { useYoutubePlayer } from '@/composables/useYoutubePlayer'
import { createHostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import { loadHostQueue, saveHostQueue } from '@/lib/host-queue/hostQueuePersistence'
import { readPrivacyNoticeDismissed } from '@/lib/privacy/privacyNoticeDismissed'
import { onPlaybackEnded, onPlaybackError } from '@/lib/playback/hostPlayback'

const privacyNoticeSheet = ref<InstanceType<typeof PrivacyNoticeSheet> | null>(null)

const { hostSessionId } = useHostSessionId()

const queue = createHostVideoQueue()
const queueTick = ref(0)
/** Bumps only when the current playback row changes (advance/skip), not on enqueue — avoids restarting the iframe on append. */
const playerSyncTick = ref(0)
const idleVariant = ref<'empty' | 'ended' | null>(null)
/** After each new now-playing row, host taps again to unlock audio (next singer can prepare). */
const audioSessionUnlocked = ref(false)
/** Reset when advancing tracks so the next “Start Singing” seek+play runs once per song. */
const didSeekOnFirstUnlock = ref(false)

function bumpQueue() {
  queueTick.value++
  const id = hostSessionId.value
  if (id) {
    saveHostQueue(id, queue.getSnapshot())
  }
}

function applyNaturalPlaybackEnd() {
  const action = onPlaybackEnded(queue.hasNext())
  if (action.kind === 'advance') {
    idleVariant.value = null
    // Lock session before queue/video id updates so loadVideoById sees muted state (avoid flush ordering).
    audioSessionUnlocked.value = false
    didSeekOnFirstUnlock.value = false
    queue.advance()
    playerSyncTick.value++
    bumpQueue()
    return
  }
  queue.clear()
  bumpQueue()
  idleVariant.value = 'ended'
}

watch(
  () => hostSessionId.value,
  (id) => {
    if (!id) {
      return
    }
    const snap = loadHostQueue(id)
    if (snap) {
      queue.applySnapshot(snap)
      queueTick.value++
    }
  },
  { immediate: true },
)

const {
  status: handshakeStatus,
  statusLabel: handshakeStatusLabel,
  error: handshakeError,
  isSignalingConfigured,
} = useHostPartySession(hostSessionId, queue, queueTick, bumpQueue, applyNaturalPlaybackEnd)
const skipMessage = ref<string | null>(null)
const embedSetupError = ref<string | null>(null)

const activeVideoId = computed(() => {
  queueTick.value
  return queue.currentVideoId()
})

const queueSnapshot = computed(() => {
  queueTick.value
  return queue.getSnapshot()
})

function rowTitle(title: string | null): string {
  return title ?? 'Unknown title'
}

watch(
  () => queueTick.value,
  () => {
    embedSetupError.value = null
    if (queue.isEmpty()) {
      idleVariant.value = 'empty'
    } else if (idleVariant.value === 'empty' || idleVariant.value === 'ended') {
      idleVariant.value = null
    }
  },
  { immediate: true },
)

const playerContainer = ref<HTMLElement | null>(null)

const { player, isReady } = useYoutubePlayer(playerContainer, {
  videoId: activeVideoId,
  playbackSequence: playerSyncTick,
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
  applyNaturalPlaybackEnd()
}

function handlePlaybackError() {
  const action = onPlaybackError(queue.hasNext())
  if (action.kind === 'advance') {
    skipMessage.value = 'That one hid from us — skipping ahead.'
    idleVariant.value = null
    audioSessionUnlocked.value = false
    didSeekOnFirstUnlock.value = false
    queue.advance()
    playerSyncTick.value++
    bumpQueue()
    return
  }
  skipMessage.value = 'That one hid from us — no encore for that clip.'
  queue.clear()
  bumpQueue()
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

onMounted(() => {
  if (!readPrivacyNoticeDismissed()) {
    void nextTick(() => privacyNoticeSheet.value?.open())
  }
})
</script>
