<template>
  <div
    v-if="!hostPlayerViewportOk"
    class="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50 px-6 py-10 text-center [padding-bottom:max(2.5rem,env(safe-area-inset-bottom,0px))] [padding-top:max(2.5rem,env(safe-area-inset-top,0px))]"
    role="status"
    aria-live="polite"
  >
    <div class="mx-auto max-w-md space-y-4">
      <p class="text-xl font-semibold tracking-tight text-slate-900">
        Use a larger screen
      </p>
      <p class="text-base leading-relaxed text-slate-600">
        The host view is built for a
        <strong class="font-semibold text-slate-800">laptop, desktop, or TV</strong>.
        Open this page on a bigger screen to run your session.
      </p>
      <p class="text-sm leading-relaxed text-slate-500">
        Guests can still use their phones with the join link.
      </p>
    </div>
  </div>

  <div v-else class="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
    <div
      v-if="showMigrationNotice"
      class="mb-2 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-base leading-relaxed text-amber-950 xl:text-[1.8rem] xl:leading-relaxed"
      role="status"
    >
      <p class="mb-4">
        Guest access has moved to
        <strong>Join</strong>
        links (<code class="rounded bg-amber-100 px-1 py-0.5 text-sm xl:text-[1.575rem]">/join/…</code>).
      </p>
      <button
        type="button"
        class="inline-flex min-h-11 min-w-[8rem] items-center justify-center rounded-md border border-amber-300 bg-amber-100/80 px-4 text-base font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 xl:min-h-[3.15rem] xl:px-6 xl:text-[1.8rem]"
        @click="dismissMigrationNotice"
      >
        Dismiss
      </button>
    </div>
    <div
      class="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden lg:grid lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,25vw)] lg:gap-0"
    >
      <section
        class="flex min-h-0 flex-[1.2] flex-col overflow-hidden rounded-md border border-slate-200 bg-white p-0 shadow-sm lg:h-full lg:min-h-0 lg:min-w-0"
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
        <div
          v-if="activeVideoId && !audioSessionUnlocked"
          class="flex shrink-0 justify-center px-6 py-6 sm:px-8 sm:py-8 xl:px-10 xl:py-10"
        >
          <button
            type="button"
            class="animate-start-singing-pulse m-2 min-h-[52px] rounded-full bg-red-600 px-8 py-3 text-lg font-semibold text-white shadow-md transition-colors hover:bg-red-700 active:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 sm:min-h-[56px] sm:text-xl xl:min-h-[5.04rem] xl:px-12 xl:py-4 xl:text-[2.25rem]"
            @click="startSinging"
          >
            Start Singing
          </button>
        </div>
      </section>

      <aside
        class="@container flex min-h-0 flex-1 flex-col overflow-hidden lg:h-full lg:min-h-0 lg:min-w-0 lg:w-full"
      >
        <div
          v-if="embedSetupError || skipMessage"
          class="shrink-0 border-b border-red-200 bg-red-50 p-3 text-sm leading-snug text-red-950 @min-[300px]:p-4 @min-[300px]:text-base @min-[300px]:leading-snug @min-[500px]:p-5 @min-[500px]:text-lg @min-[500px]:leading-snug"
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

        <GuestJoinQrPanel
          :session-id="hostSessionId"
          class="shrink-0 px-2 pt-2 @min-[300px]:px-3 @min-[300px]:pt-3 @min-[500px]:px-4 @min-[500px]:pt-4"
        />

        <div
          class="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 @min-[300px]:px-4 @min-[300px]:py-2.5 @min-[300px]:text-sm @min-[500px]:px-5 @min-[500px]:py-3 @min-[500px]:text-base"
          aria-live="polite"
        >
          <HandshakeStatusStrip
            class="@min-[300px]:[&_svg]:h-5 @min-[300px]:[&_svg]:w-5 @min-[500px]:[&_svg]:h-6 @min-[500px]:[&_svg]:w-6"
            :status="handshakeStatus"
            :status-label="handshakeStatusLabel"
            :error="handshakeError"
            :is-signaling-configured="isSignalingConfigured"
          />
        </div>

        <div
          class="flex min-h-0 flex-1 flex-col p-3 text-sm text-slate-700 @min-[300px]:p-4 @min-[300px]:text-base @min-[500px]:p-5 @min-[500px]:text-[1.0625rem]"
        >
          <h2
            class="shrink-0 pb-2 text-xs font-bold uppercase tracking-wide text-black @min-[300px]:pb-2.5 @min-[300px]:text-sm @min-[500px]:pb-3 @min-[500px]:text-base"
          >
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
              class="flex min-w-0 shrink-0 items-start justify-between gap-2 px-3 py-3 text-sm leading-snug @min-[300px]:gap-2.5 @min-[300px]:px-3.5 @min-[300px]:py-4 @min-[300px]:text-base @min-[300px]:leading-snug @min-[500px]:gap-3 @min-[500px]:px-4 @min-[500px]:py-5 @min-[500px]:text-[1.0625rem] @min-[500px]:leading-snug"
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
                    title="Guest-requested row (max two songs per guest)"
                    aria-hidden="true"
                  />
                </p>
                <p
                  v-if="queueSnapshot.requestedBys[index]"
                  class="mt-1 min-w-0 truncate text-left text-xs leading-[1.45] @min-[300px]:mt-1.5 @min-[300px]:text-sm @min-[300px]:leading-[1.45] @min-[500px]:mt-2 @min-[500px]:text-[1.0625rem] @min-[500px]:leading-[1.45]"
                >
                  <span class="font-medium text-slate-600">Requested by </span>
                  <span class="font-bold text-slate-900">{{ queueSnapshot.requestedBys[index] }}</span>
                </p>
              </div>
              <span
                v-if="index === queueSnapshot.currentIndex"
                class="shrink-0 rounded-md bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white @min-[300px]:px-2 @min-[300px]:py-1 @min-[300px]:text-sm @min-[500px]:px-2.5 @min-[500px]:text-base"
              >
                Playing
              </span>
            </li>
          </ol>
        </div>

        <footer
          class="mt-auto shrink-0 border-t border-slate-100 px-3 py-2 text-right text-xs text-slate-500 @min-[300px]:px-4 @min-[300px]:py-2 @min-[500px]:px-4 @min-[500px]:py-2.5 @min-[500px]:text-sm"
        >
          Made by KuyaJon with ❤️
        </footer>
      </aside>
    </div>
  </div>
  <PrivacyNoticeSheet v-if="hostPlayerViewportOk" ref="privacyNoticeSheet" />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

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

const route = useRoute()
const router = useRouter()

/** Host UI is intended for laptop / TV; narrow viewports get a message instead. Matches Tailwind `xl` (1280px). */
function readHostPlayerViewportOk(): boolean {
  if (typeof window === 'undefined') {
    return true
  }
  return window.matchMedia('(min-width: 1280px)').matches
}

const hostPlayerViewportOk = ref(readHostPlayerViewportOk())

let stopHostViewportListener: (() => void) | null = null

const showMigrationNotice = ref(route.query.migrated === 'client')

watch(
  () => route.query.migrated,
  (migrated) => {
    if (migrated === 'client') {
      showMigrationNotice.value = true
    }
  },
)

function dismissMigrationNotice() {
  showMigrationNotice.value = false
  if (route.query.migrated === 'client') {
    router.replace({ path: '/', query: {} })
  }
}

const privacyNoticeSheet = ref<InstanceType<typeof PrivacyNoticeSheet> | null>(null)

const { hostSessionId } = useHostSessionId()

const queue = createHostVideoQueue()
const queueTick = ref(0)
/** Bumps only when the current playback row changes (advance/skip), not on enqueue — avoids restarting the iframe on append. */
const playerSyncTick = ref(0)
const idleVariant = ref<'empty' | 'ended' | null>(null)
/**
 * False until the host taps “Start Singing” (browser autoplay policy). Stays true when the queue
 * advances to the next track after a natural end, embed error skip, or guest “end song” (same as
 * natural end). Reset when the queue is empty after the last song ends or errors, or on first paint
 * with a persisted queue (initial ref is false).
 */
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
    didSeekOnFirstUnlock.value = false
    queue.advance()
    playerSyncTick.value++
    bumpQueue()
    return
  }
  queue.clear()
  bumpQueue()
  idleVariant.value = 'ended'
  audioSessionUnlocked.value = false
  didSeekOnFirstUnlock.value = false
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
  audioSessionUnlocked.value = false
  didSeekOnFirstUnlock.value = false
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
  if (hostPlayerViewportOk.value && !readPrivacyNoticeDismissed()) {
    void nextTick(() => privacyNoticeSheet.value?.open())
  }

  const mq = window.matchMedia('(min-width: 1280px)')
  const onViewportChange = () => {
    hostPlayerViewportOk.value = mq.matches
  }
  mq.addEventListener('change', onViewportChange)
  stopHostViewportListener = () => mq.removeEventListener('change', onViewportChange)
})

onBeforeUnmount(() => {
  stopHostViewportListener?.()
  stopHostViewportListener = null
})
</script>
