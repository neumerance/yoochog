<template>
  <div
    v-if="!hostPlayerViewportOk"
    class="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto bg-slate-50 px-6 py-10 text-center [padding-bottom:max(2.5rem,env(safe-area-inset-bottom,0px))] [padding-top:max(2.5rem,env(safe-area-inset-top,0px))]"
    role="status"
    aria-live="polite"
  >
    <div class="mx-auto flex w-full max-w-md flex-col items-center space-y-5">
      <img
        :src="logoUrl"
        alt=""
        class="h-auto w-full max-w-[min(19.5rem,100%)] shrink-0 select-none object-contain self-center"
        decoding="async"
        aria-hidden="true"
      />
      <!-- One tall TV icon: height follows the full text block (title + both paragraphs) -->
      <div class="flex w-full items-stretch gap-4 text-left">
        <div
          class="flex h-full min-h-[6rem] w-[min(32vmin,8rem)] shrink-0 items-center justify-center self-stretch py-0.5"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.25"
            stroke="currentColor"
            class="h-full w-auto max-w-full object-contain text-slate-800"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect x="3" y="4" width="18" height="12" rx="1.5" fill="none" />
            <path stroke-linecap="round" d="M12 16v3.5M8.5 21.25h7" fill="none" />
          </svg>
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <p class="text-xl font-semibold leading-tight tracking-tight text-slate-900">
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
          <!--
            Pointer shield: block taps to the embed so the host does not get YouTube’s full HUD
            (playerVars are still needed; interaction or Topic music embeds can ignore/surface chrome).
            Stays under idle (z-10), chat, audio-unlock (z-20), and help tips (z-30) so those stay usable.
            See https://developers.google.com/youtube/player_parameters — playerVars in useYoutubePlayer.
          -->
          <div
            v-if="showHostVideoPointerShield"
            class="pointer-events-auto absolute inset-0 z-[4] touch-none"
            aria-hidden="true"
          />
          <HostPlaybackIdle v-if="idleVariant" :variant="idleVariant" class="absolute inset-0 z-10" />
          <AudienceChatOverlay
            v-if="audienceChatLines.length > 0"
            :lines="audienceChatLines"
            @complete="removeAudienceChatLine"
          />
          <PlayerHelpTips :context="playerHelpTipsContext" />
          <div
            v-if="activeVideoId && !audioSessionUnlocked"
            class="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-black/30 px-[clamp(0.75rem,min(5vmin,5vw),4rem)] select-none"
            role="button"
            tabindex="-1"
            aria-label="Click here to start singing"
            @click="startSinging"
          >
            <!-- Same viewport-fluid type scale as HostPlaybackIdle copy (TV / ultrawide). -->
            <p
              class="pointer-events-none max-w-[min(78vw,92vmin,96%)] text-center font-extrabold uppercase leading-tight tracking-wide text-yellow-300 [-webkit-text-stroke:0.055em_#000] [paint-order:stroke_fill] text-[length:clamp(0.6125rem,calc(2.975vmin_+_0.315vw),5.25rem)] animate-press-key-cta"
            >
              Click here to start singing
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
            class="shrink-0 border-b border-red-200 bg-red-50 p-[clamp(0.65rem,calc(0.4rem_+_1.1vmin_+_0.35vw),1.25rem)] leading-snug text-red-950 text-[length:clamp(1.0625rem,calc(0.45rem_+_2.5vmin_+_0.35vw),3.5rem)] dark:border-red-900/50 dark:bg-red-950/35 dark:text-red-100"
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
            class="shrink-0 px-[clamp(0.35rem,calc(0.2rem_+_0.85vmin_+_0.2vw),1.5rem)] pt-[clamp(0.35rem,calc(0.2rem_+_0.85vmin_+_0.2vw),1.5rem)]"
          />

          <div
            class="shrink-0 border-b border-slate-200 bg-slate-50 px-[clamp(0.325rem,calc(0.2275rem_+_0.65vmin_+_0.195vw),1.1375rem)] py-[clamp(0.26rem,calc(0.195rem_+_0.5525vmin_+_0.1625vw),0.8125rem)] text-slate-800 text-[length:clamp(0.65rem,calc(0.26rem_+_1.43vmin_+_0.195vw),1.95rem)] dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-200"
            aria-live="polite"
          >
            <HandshakeStatusStrip
              class="[&_span[aria-hidden=true]]:h-[clamp(0.63375rem,calc(0.43875rem_+_0.975vmin_+_0.24375vw),1.21875rem)] [&_span[aria-hidden=true]]:min-h-[clamp(0.63375rem,calc(0.43875rem_+_0.975vmin_+_0.24375vw),1.21875rem)] [&_span[aria-hidden=true]]:w-[clamp(0.63375rem,calc(0.43875rem_+_0.975vmin_+_0.24375vw),1.21875rem)] [&_span[aria-hidden=true]]:min-w-[clamp(0.63375rem,calc(0.43875rem_+_0.975vmin_+_0.24375vw),1.21875rem)] [&_svg]:h-[clamp(0.975rem,calc(0.53625rem_+_1.4625vmin_+_0.34125vw),2.19375rem)] [&_svg]:w-[clamp(0.975rem,calc(0.53625rem_+_1.4625vmin_+_0.34125vw),2.19375rem)]"
              :status="handshakeStatus"
              :status-label="handshakeStatusLabel"
              :is-signaling-configured="isSignalingConfigured"
            />
          </div>

          <div
            class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-[clamp(0.3185rem,calc(0.196rem_+_0.539vmin_+_0.1715vw),0.6125rem)] text-slate-700 text-[length:clamp(0.520625rem,calc(0.2205rem_+_1.2985vmin_+_0.1715vw),1.715rem)] dark:text-slate-300"
          >
            <h2
              v-if="activeVideoId"
              class="shrink-0 pb-[clamp(0.1715rem,calc(0.1225rem_+_0.3675vmin_+_0.098vw),0.3675rem)] font-bold uppercase tracking-wide text-black text-[length:clamp(0.459375rem,calc(0.1715rem_+_1.078vmin_+_0.147vw),1.47rem)] dark:text-white"
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
              class="flex min-w-0 shrink-0 items-start justify-between gap-[clamp(0.1715rem,calc(0.1225rem_+_0.3675vmin_+_0.098vw),0.3675rem)] px-[clamp(0.3185rem,calc(0.196rem_+_0.49vmin_+_0.1715vw),0.735rem)] py-[clamp(0.196rem,calc(0.147rem_+_0.4165vmin_+_0.1225vw),0.6125rem)] leading-snug text-[length:clamp(0.520625rem,calc(0.2205rem_+_1.2985vmin_+_0.1715vw),1.715rem)]"
              :class="
                index === queueSnapshot.currentIndex
                  ? 'bg-red-50 ring-[0.98px] ring-inset ring-red-400 text-slate-900 dark:bg-red-950/45 dark:ring-red-500 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-300'
              "
            >
              <div class="min-w-0 flex-1">
                <p
                  class="min-w-0 truncate text-left font-semibold leading-snug text-slate-900 dark:text-slate-100"
                >
                  <span
                    class="mr-[0.245rem] tabular-nums font-normal text-slate-400 select-none dark:text-slate-500"
                  >{{ index + 1 }}.</span>
                  {{ rowTitle(queueSnapshot.titles[index] ?? null) }}
                  <span
                    v-if="queueSnapshot.requesterGuestIds[index]"
                    class="ml-[0.18375rem] inline-block size-[0.18375rem] shrink-0 rounded-full bg-slate-400 dark:bg-slate-500"
                    :title="hostGuestRowCapHint"
                    aria-hidden="true"
                  />
                </p>
                <p
                  v-if="queueSnapshot.requestedBys[index]"
                  class="mt-[clamp(0.098rem,calc(0.0735rem_+_0.2205vmin_+_0.0588vw),0.245rem)] min-w-0 truncate text-left leading-[1.45] text-[length:clamp(0.459375rem,calc(0.1715rem_+_0.98vmin_+_0.1372vw),1.3475rem)]"
                >
                  <span class="font-medium text-slate-600 dark:text-slate-400">Requested by </span>
                  <span class="font-bold text-slate-900 dark:text-slate-100">{{
                    queueSnapshot.requestedBys[index]
                  }}</span>
                </p>
              </div>
              <span
                v-if="index === queueSnapshot.currentIndex"
                class="shrink-0 rounded-md bg-red-600 px-[clamp(0.1715rem,calc(0.1225rem_+_0.3675vmin_+_0.098vw),0.3675rem)] py-[clamp(0.0735rem,calc(0.049rem_+_0.196vmin_+_0.0588vw),0.1715rem)] font-semibold uppercase tracking-wide text-white text-[length:clamp(0.42875rem,calc(0.147rem_+_0.9065vmin_+_0.1372vw),1.225rem)]"
              >
                Playing
              </span>
            </li>
          </ol>
          </div>
        </div>

        <footer
          class="mt-auto shrink-0 border-t border-slate-100 bg-white px-[clamp(0.4rem,calc(0.28rem_+_0.8vmin_+_0.24vw),1rem)] py-[clamp(0.28rem,calc(0.2rem_+_0.6vmin_+_0.16vw),0.6rem)] text-[length:clamp(0.7rem,calc(0.24rem_+_1.32vmin_+_0.2vw),1.8rem)] text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
        >
          <div
            class="flex w-full min-w-0 flex-wrap items-center justify-between gap-x-[0.6rem] gap-y-[0.4rem]"
          >
            <p class="m-0 min-w-0 shrink text-left">Made by KuyaJon with ❤️</p>
            <AppearanceToggle compact />
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
import AudienceChatOverlay from '@/components/AudienceChatOverlay.vue'
import GuestJoinQrPanel from '@/components/GuestJoinQrPanel.vue'
import HostPlayerSplash from '@/components/HostPlayerSplash.vue'
import PrivacyNoticeSheet from '@/components/PrivacyNoticeSheet.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import HostPlaybackIdle from '@/components/HostPlaybackIdle.vue'
import PlayerHelpTips from '@/components/PlayerHelpTips.vue'
import { useHostPlayerDarkMode } from '@/composables/useHostPlayerDarkMode'
import { useHostPartySession } from '@/composables/useHostPartySession'
import { useHostSessionId } from '@/composables/useHostSessionId'
import { useYoutubePlayer } from '@/composables/useYoutubePlayer'
import { createHostVideoQueue } from '@/lib/host-queue/hostVideoQueue'
import { loadHostQueue, saveHostQueue } from '@/lib/host-queue/hostQueuePersistence'
import { readPrivacyNoticeDismissed } from '@/lib/privacy/privacyNoticeDismissed'
import { runAdblockProbe } from '@/lib/adblockProbe'
import { onPlaybackEnded, onPlaybackError } from '@/lib/playback/hostPlayback'
import { shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd } from '@/lib/playback/youtubeEndGate'
import type { PlayerHelpTipContext } from '@/lib/playerHelpTips'

import logoUrl from '@/assets/images/logo/logo.png'

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
 * False until the host clicks the semi-transparent unlock overlay (pointer only; no keyboard
 * shortcut) to unlock audio (browser autoplay policy). The raw iframe is not the target — a
 * pointer shield sits above it. Stays true when the queue advances to the next track after a
 * natural end, embed error skip, or guest “end song” (same as natural end). Reset when the queue is
 * empty after the last song ends or errors, or on first paint with a persisted queue (initial ref
 * is false).
 */
const audioSessionUnlocked = ref(false)
/**
 * True while the room’s **transport** is intentionally held paused (host sidebar or guest request).
 * Prevents queue advance on ENDED while §D “hold” is active; kept in sync with `pauseVideo` / `playVideo`.
 */
const userPlaybackHoldActive = ref(false)
/**
 * After `true`, re-unlock skips `seekTo(0)` for the same queue row. Reset on track advance, empty
 * queue, or **guest re-lock** so the next “start singing” matches **first load** (muted preview,
 * then click → from the start with sound).
 */
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
    userPlaybackHoldActive.value = false
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
  userPlaybackHoldActive.value = false
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
  audienceChatLines,
  removeAudienceChatLine,
  maxGuestQueueRowsPerGuest,
} = useHostPartySession(
  hostSessionId,
  queue,
  queueTick,
  bumpQueue,
  audioSessionUnlocked,
  applyNaturalPlaybackEnd,
  () => {
    audioSessionUnlocked.value = false
    didSeekOnFirstUnlock.value = false
  },
)
const skipMessage = ref<string | null>(null)
const embedSetupError = ref<string | null>(null)

/** Host-only bait probe; help tip suggests Adblock Plus when `'none'`. */
const adblockStatus = ref<'pending' | 'none' | 'active'>('pending')

const activeVideoId = computed(() => {
  queueTick.value
  return queue.currentVideoId()
})

/** True while the embed is the playing surface (not idle empty/ended) — full-area shield blocks YouTube’s native HUD. */
const showHostVideoPointerShield = computed(
  () => Boolean(activeVideoId.value) && idleVariant.value === null,
)

const queueSnapshot = computed(() => {
  queueTick.value
  return queue.getSnapshot()
})

const playerHelpTipsContext = computed<PlayerHelpTipContext>(() => {
  queueTick.value
  return {
    adblockStatus: adblockStatus.value,
    isSignalingConfigured: isSignalingConfigured.value,
    activeVideoId: activeVideoId.value ?? null,
    audioSessionUnlocked: audioSessionUnlocked.value,
    idleVariant: idleVariant.value,
    queueLength: queueSnapshot.value.ids.length,
    embedSetupError: embedSetupError.value,
    maxGuestQueueRowsPerGuest: maxGuestQueueRowsPerGuest.value,
  }
})

const hostGuestRowCapHint = computed(() => {
  const n = maxGuestQueueRowsPerGuest.value
  if (n === 1) {
    return 'Guest-requested row (up to one song per guest at a time, including the one playing).'
  }
  return `Guest-requested row (up to ${n} songs per guest, including the one that’s playing).`
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
  /**
   * Host chromeless embed — https://developers.google.com/youtube/player_parameters
   * (YouTube may change which parameters are honored over time.)
   * - disablekb, fs, iv_load_policy, modestbranding, rel, controls: see inline keys below
   */
  playerVars: {
    controls: 0,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    modestbranding: 1,
    rel: 0,
  },
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
  if (
    !shouldAllowNaturalQueueAdvanceOnHostPlaybackEnd({
      audioSessionUnlocked: audioSessionUnlocked.value,
      userPlaybackHoldActive: userPlaybackHoldActive.value,
    })
  ) {
    return
  }
  applyNaturalPlaybackEnd()
}

function handlePlaybackError() {
  const action = onPlaybackError(queue.hasNext())
  if (action.kind === 'advance') {
    skipMessage.value = 'That one hid from us — skipping ahead.'
    idleVariant.value = null
    didSeekOnFirstUnlock.value = false
    userPlaybackHoldActive.value = false
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
  userPlaybackHoldActive.value = false
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
  // Browsers (notably Firefox) only honor unmute/play for cross-origin media when the IFrame API
  // call runs in the same user-activation turn as the click. A Vue ref update + watch runs later
  // in a microtask and the gesture is gone — playback stays paused with a visible play button.
  // Apply unmute/seek/play synchronously when the player is already ready.
  if (isReady.value && player.value) {
    try {
      const p = player.value
      p.unMute()
      p.setVolume(100)
      if (!didSeekOnFirstUnlock.value) {
        p.seekTo(0, true)
      }
      p.playVideo()
      didSeekOnFirstUnlock.value = true
    } catch {
      // Deferred watch can retry when the embed is in a bad moment.
    }
  }
  audioSessionUnlocked.value = true
}

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

  void runAdblockProbe().then((likelyBlocked) => {
    adblockStatus.value = likelyBlocked ? 'active' : 'none'
  })

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
