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
          <div
            v-if="activeVideoId && !audioSessionUnlocked"
            class="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-black/30 px-[clamp(1rem,2vw,2.5rem)] select-none"
            role="button"
            tabindex="0"
            aria-label="Press any key or tap to start singing"
            @click="startSinging"
            @keydown.enter.prevent="startSinging"
            @keydown.space.prevent="startSinging"
          >
            <p
              class="pointer-events-none max-w-[min(42rem,96%)] text-center font-extrabold uppercase leading-tight tracking-wide text-yellow-300 [-webkit-text-stroke:2px_#000] [paint-order:stroke_fill] text-[length:clamp(1.125rem,0.55rem+2.2vmin,2.75rem)] animate-press-key-cta"
            >
              Press any key to start singing
            </p>
          </div>
        </div>
      </section>

      <aside
        :class="[
          '@container flex min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-950 lg:h-full lg:min-h-0 lg:max-h-full lg:min-w-0 lg:w-full',
          hostDarkMode && 'dark',
        ]"
      >
        <!-- Scrolls internally so the footer stays visible at the bottom of this column. -->
        <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            v-if="embedSetupError || skipMessage"
            class="shrink-0 border-b border-red-200 bg-red-50 p-[clamp(0.65rem,1.75cqi,1.25rem)] leading-snug text-red-950 text-[length:clamp(1.0625rem,0.45rem+2.8cqi,2.125rem)] dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
            role="alert"
          >
            <p v-if="embedSetupError" class="font-semibold">{{ embedSetupError }}</p>
            <p
              v-if="skipMessage"
              class="leading-snug"
              :class="
                embedSetupError ? 'mt-2 border-t border-red-200/80 pt-2 dark:border-red-800/60' : ''
              "
            >
              {{ skipMessage }}
            </p>
          </div>

          <GuestJoinQrPanel
            :session-id="hostSessionId"
            class="shrink-0 px-[clamp(0.35rem,1.15cqi,1.5rem)] pt-[clamp(0.35rem,1.15cqi,1.5rem)]"
          />

          <div
            class="shrink-0 border-b border-slate-200 bg-slate-50 px-[clamp(0.5rem,1.5cqi,1.75rem)] py-[clamp(0.4rem,1.25cqi,1.25rem)] text-slate-800 text-[length:clamp(1rem,0.4rem+2.5cqi,1.875rem)] dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
            aria-live="polite"
          >
            <HandshakeStatusStrip
              class="[&_span[aria-hidden=true]]:h-[clamp(0.65rem,1.5cqi,1rem)] [&_span[aria-hidden=true]]:min-h-[clamp(0.65rem,1.5cqi,1rem)] [&_span[aria-hidden=true]]:w-[clamp(0.65rem,1.5cqi,1rem)] [&_span[aria-hidden=true]]:min-w-[clamp(0.65rem,1.5cqi,1rem)] [&_svg]:h-[clamp(1rem,2.2cqi,1.75rem)] [&_svg]:w-[clamp(1rem,2.2cqi,1.75rem)]"
              :status="handshakeStatus"
              :status-label="handshakeStatusLabel"
              :is-signaling-configured="isSignalingConfigured"
            />
          </div>

          <div
            class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-[clamp(0.65rem,1.75cqi,1.25rem)] text-slate-700 text-[length:clamp(1.0625rem,0.45rem+3cqi,2.125rem)] dark:text-slate-300"
          >
            <h2
              v-if="activeVideoId"
              class="shrink-0 pb-[clamp(0.35rem,1cqi,0.75rem)] font-bold uppercase tracking-wide text-black text-[length:clamp(0.9375rem,0.35rem+2.4cqi,1.875rem)] dark:text-white"
            >
              Now playing
            </h2>
            <ol
              class="flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain divide-y divide-slate-200 dark:divide-slate-700"
              aria-label="Playback queue"
            >
            <li
              v-for="(rowId, index) in queueSnapshot.ids"
              :key="`${index}-${rowId}`"
              :aria-current="index === queueSnapshot.currentIndex ? 'true' : undefined"
              class="flex min-w-0 shrink-0 items-start justify-between gap-[clamp(0.35rem,1cqi,0.75rem)] px-[clamp(0.65rem,1.5cqi,1.5rem)] py-[clamp(0.4rem,1.25cqi,1.25rem)] leading-snug text-[length:clamp(1.0625rem,0.45rem+3cqi,2.125rem)]"
              :class="
                index === queueSnapshot.currentIndex
                  ? 'bg-red-50 ring-2 ring-inset ring-red-400 text-slate-900 dark:bg-red-950/45 dark:ring-red-500 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-300'
              "
            >
              <div class="min-w-0 flex-1">
                <p
                  class="min-w-0 truncate text-left font-semibold leading-snug text-slate-900 dark:text-slate-100"
                >
                  <span
                    class="mr-2 tabular-nums font-normal text-slate-400 select-none dark:text-slate-500"
                  >{{ index + 1 }}.</span>
                  {{ rowTitle(queueSnapshot.titles[index] ?? null) }}
                  <span
                    v-if="queueSnapshot.requesterGuestIds[index]"
                    class="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                    title="Guest-requested row (max two songs per guest)"
                    aria-hidden="true"
                  />
                </p>
                <p
                  v-if="queueSnapshot.requestedBys[index]"
                  class="mt-[clamp(0.2rem,0.6cqi,0.5rem)] min-w-0 truncate text-left leading-[1.45] text-[length:clamp(0.9375rem,0.35rem+2.2cqi,1.625rem)]"
                >
                  <span class="font-medium text-slate-600 dark:text-slate-400">Requested by </span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{
                    queueSnapshot.requestedBys[index]
                  }}</span>
                </p>
              </div>
              <span
                v-if="index === queueSnapshot.currentIndex"
                class="shrink-0 rounded-md bg-red-600 px-[clamp(0.35rem,1cqi,0.75rem)] py-[clamp(0.15rem,0.5cqi,0.35rem)] font-semibold uppercase tracking-wide text-white text-[length:clamp(0.875rem,0.3rem+2cqi,1.375rem)]"
              >
                Playing
              </span>
            </li>
          </ol>
          </div>
        </div>

        <footer
          class="mt-auto shrink-0 border-t border-slate-100 bg-white px-[clamp(0.5rem,1.5cqi,1.25rem)] py-[clamp(0.35rem,1cqi,0.75rem)] text-[length:clamp(0.875rem,0.3rem+1.8cqi,1.25rem)] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
        >
          <div
            class="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-2"
          >
            <p class="m-0 min-w-0 shrink text-left">Made by KuyaJon with ❤️</p>
            <AppearanceToggle />
          </div>
        </footer>
      </aside>
    </div>
  </div>
  <HostPlayerSplash v-if="showHostSplash" @complete="onHostSplashComplete" />
  <PrivacyNoticeSheet v-if="hostPlayerViewportOk" ref="privacyNoticeSheet" />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import AppearanceToggle from '@/components/AppearanceToggle.vue'
import GuestJoinQrPanel from '@/components/GuestJoinQrPanel.vue'
import HostPlayerSplash from '@/components/HostPlayerSplash.vue'
import PrivacyNoticeSheet from '@/components/PrivacyNoticeSheet.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import HostPlaybackIdle from '@/components/HostPlaybackIdle.vue'
import { useHostPlayerDarkMode } from '@/composables/useHostPlayerDarkMode'
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

/** Full-screen logo splash on first paint when the host viewport is wide enough. */
const showHostSplash = ref(readHostPlayerViewportOk())

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

function onHostSplashComplete() {
  showHostSplash.value = false
  if (!readPrivacyNoticeDismissed()) {
    void nextTick(() => privacyNoticeSheet.value?.open())
  }
}

const { hostSessionId } = useHostSessionId()

const { isDark: hostDarkMode } = useHostPlayerDarkMode()

const queue = createHostVideoQueue()
const queueTick = ref(0)
/** Bumps only when the current playback row changes (advance/skip), not on enqueue — avoids restarting the iframe on append. */
const playerSyncTick = ref(0)
const idleVariant = ref<'empty' | 'ended' | null>(null)
/**
 * False until the host uses a gesture (any key or tap on the player) to unlock audio (browser
 * autoplay policy). Stays true when the queue advances to the next track after a natural end,
 * embed error skip, or guest “end song” (same as natural end). Reset when the queue is empty
 * after the last song ends or errors, or on first paint with a persisted queue (initial ref is
 * false).
 */
const audioSessionUnlocked = ref(false)
/** Reset when advancing tracks so the next unlock seek+play runs once per song. */
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

let stopUnlockKeyListener: (() => void) | null = null

watch(
  [activeVideoId, audioSessionUnlocked],
  () => {
    stopUnlockKeyListener?.()
    stopUnlockKeyListener = null
    if (!activeVideoId.value || audioSessionUnlocked.value) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Alt' || e.key === 'Shift') {
        return
      }
      startSinging()
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown, true)
    stopUnlockKeyListener = () => window.removeEventListener('keydown', onKeyDown, true)
  },
  { immediate: true },
)

/** Restart from the beginning when audio unlocks (covers gesture before `isReady`). */
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
  if (!hostPlayerViewportOk.value && !readPrivacyNoticeDismissed()) {
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
  stopUnlockKeyListener?.()
  stopUnlockKeyListener = null
  stopHostViewportListener?.()
  stopHostViewportListener = null
})
</script>
