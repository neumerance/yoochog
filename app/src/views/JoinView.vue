<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import logoUrl from '@/assets/images/logo/yoochoog.png'

import AppearanceToggle from '@/components/AppearanceToggle.vue'
import GuestShell from '@/components/GuestShell.vue'
import HostPlayerSplash from '@/components/HostPlayerSplash.vue'
import PrivacyNoticeSheet from '@/components/PrivacyNoticeSheet.vue'
import HandshakeStatusStrip from '@/components/HandshakeStatusStrip.vue'
import QueueSettingsPanel from '@/components/QueueSettingsPanel.vue'
import { useGuestPartyHandshake } from '@/composables/useGuestPartyHandshake'
import { useHostPlayerDarkMode } from '@/composables/useHostPlayerDarkMode'
import {
  readAssumeAdminEligible,
  saveAssumeAdminEligible,
} from '@/lib/guest/guestAssumeAdminSetting'
import {
  readGuestDisplayName,
  saveGuestDisplayName,
  validateGuestDisplayName,
} from '@/lib/guest/guestDisplayName'
import {
  buildEnqueueRejectedAlreadyHasRequest,
  countGuestRequestsInQueue,
} from '@/lib/host-queue/guestEnqueuePolicy'
import {
  GUEST_QUEUE_ROWS_CAP_MAX,
  GUEST_QUEUE_ROWS_CAP_MIN,
} from '@/lib/host-queue/guestQueueLimits'
import type { PlayerResolutionPreference } from '@/lib/host-queue/playerResolutionPreference'
import { getOrCreatePartyGuestRequesterId } from '@/lib/party/partyGuestRequesterId'
import { readPrivacyNoticeDismissed } from '@/lib/privacy/privacyNoticeDismissed'
import { guestSessionIdFromRouteParam } from '@/lib/party/guestSessionId'
import { extractYoutubeVideoId } from '@/lib/youtube/extractYoutubeVideoId'
import { fetchYoutubeVideoTitle } from '@/lib/youtube/fetchYoutubeVideoTitle'
import { searchYoutubeOnServer } from '@/lib/youtube/searchYoutubeOnServer'
import type { YoutubeSearchItem } from '@/lib/youtube/searchYoutubeOnServer'

const route = useRoute()
const routeSessionId = computed(() => guestSessionIdFromRouteParam(String(route.params.sessionId ?? '')))

/** Saved display name (re-read after save / when connecting). */
const guestDisplayName = ref<string | null>(null)

function refreshGuestDisplayName() {
  guestDisplayName.value = readGuestDisplayName()
}

const guestNameReady = computed(() => {
  const n = guestDisplayName.value?.trim()
  return !!(n && n.length > 0)
})

/** WebRTC handshake only runs after a valid nickname is saved — guests cannot join the session without one. */
const handshakeSessionId = computed(() => (guestNameReady.value ? routeSessionId.value : ''))

const {
  status: handshakeStatus,
  statusLabel,
  isSignalingConfigured,
  queueSnapshot,
  sessionAdminGuestIds,
  lastEnqueueError,
  lastChatError,
  lastQueueSettingsError,
  maxGuestQueueRowsPerGuest,
  audienceChatEnabled,
  playerResolutionPreference,
  hostAudioSessionUnlocked,
  audienceChatCooldownEndsAt,
  requestEnqueue,
  requestEndCurrentPlayback,
  requestPauseCurrentPlayback,
  requestRemoveRow,
  requestQueueSettingsUpdate,
  requestAudienceChat,
  requestAssumeAdmin,
  lastAssumeAdminResult,
  canRequestEnqueue,
} = useGuestPartyHandshake(handshakeSessionId)

const guestNameDialog = ref<HTMLDialogElement | null>(null)
const guestNameInput = ref('')
const guestNameError = ref<string | null>(null)

const privacyNoticeSheet = ref<InstanceType<typeof PrivacyNoticeSheet> | null>(null)

/** Shared with host PlayerView — same localStorage key. */
const { isDark: guestDarkMode } = useHostPlayerDarkMode()

/** Same intro splash as host PlayerView; privacy / nickname flow runs after it finishes. */
const showJoinSplash = ref(true)

const endSongDialog = ref<HTMLDialogElement | null>(null)
const addSongDialog = ref<HTMLDialogElement | null>(null)
const addSongTriggerRef = ref<HTMLButtonElement | null>(null)
const chatDialog = ref<HTMLDialogElement | null>(null)
const chatTriggerRef = ref<HTMLButtonElement | null>(null)
const chatInput = ref('')
const chatFieldError = ref<string | null>(null)
const assumeAdminEligible = ref(readAssumeAdminEligible())
watch(assumeAdminEligible, (on) => saveAssumeAdminEligible(on))

const assumeAdminSubmitting = ref(false)

const queueSettingsOpen = ref(false)
const queueSettingsSavePending = ref(false)
const queueSettingsTarget = ref<{
  maxGuestQueueRowsPerGuest: number
  audienceChatEnabled: boolean
  playerResolution: PlayerResolutionPreference
} | null>(null)

const nowMonotonic = ref(Date.now())
let chatCooldownTicker: number | null = null

onMounted(() => {
  refreshGuestDisplayName()
  chatCooldownTicker = window.setInterval(() => {
    nowMonotonic.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (chatCooldownTicker !== null) {
    window.clearInterval(chatCooldownTicker)
    chatCooldownTicker = null
  }
})

const audienceChatCooldownSecondsLeft = computed(() => {
  void nowMonotonic.value
  void audienceChatCooldownEndsAt.value
  const end = audienceChatCooldownEndsAt.value
  if (!end) {
    return 0
  }
  return Math.max(0, Math.ceil((end - Date.now()) / 1000))
})
const addSongStep = ref<1 | 2>(1)
/** Step 2 sub-flow: server search vs direct video URL. */
const addSongStep2Tab = ref<'search' | 'paste'>('search')
const pasteInput = ref('')
const pasteValidationError = ref<string | null>(null)
const isEnqueueSubmitting = ref(false)
const youtubeSearchQuery = ref('')
const youtubeSearchResults = ref<YoutubeSearchItem[]>([])
const youtubeSearchNextPage = ref<string | null>(null)
const youtubeSearchError = ref<string | null>(null)
const youtubeSearchLoading = ref(false)

/** True when the name dialog was opened from “Add my song”; after save, open that flow. */
const openAddSongAfterGuestName = ref(false)

/** Rows in the snapshot owned by this tab’s guest id (including now playing). */
const mySongsInQueueCount = computed(() => {
  const s = queueSnapshot.value
  const sid = routeSessionId.value
  if (!s?.ids?.length || !sid) {
    return 0
  }
  const mine = getOrCreatePartyGuestRequesterId(sid)
  return countGuestRequestsInQueue(mine, s)
})

/** Matches host `resolveGuestEnqueueRequest` per-guest cap. */
const atMaxMySongsInQueue = computed(
  () => mySongsInQueueCount.value >= maxGuestQueueRowsPerGuest.value,
)

/** True when connected and policy allows opening the add-song flow (under per-guest row cap). */
const canOpenAddSongFlow = computed(
  () => canRequestEnqueue.value && !atMaxMySongsInQueue.value,
)

function queueRowTitle(index: number): string {
  const s = queueSnapshot.value
  if (!s) {
    return 'Unknown title'
  }
  const t = s.titles[index]
  return t ?? 'Unknown title'
}

function queueRowRequester(index: number): string | null {
  const s = queueSnapshot.value
  if (!s) {
    return null
  }
  return s.requestedBys[index] ?? null
}

function isMyQueueRow(index: number): boolean {
  const s = queueSnapshot.value
  if (!s || !routeSessionId.value) {
    return false
  }
  const mine = getOrCreatePartyGuestRequesterId(routeSessionId.value)
  return s.requesterGuestIds[index] === mine
}

/** Session admins: first identifying guest on the host and anyone granted via shared password. */
const isSessionAdmin = computed(() => {
  const sid = routeSessionId.value
  if (!sid) {
    return false
  }
  const mine = getOrCreatePartyGuestRequesterId(sid)
  return sessionAdminGuestIds.value.includes(mine)
})

const canOfferAssumeAdmin = computed(
  () =>
    isSignalingConfigured.value
    && assumeAdminEligible.value
    && canRequestEnqueue.value
    && !isSessionAdmin.value,
)

watch(lastAssumeAdminResult, (r) => {
  if (!r) {
    return
  }
  assumeAdminSubmitting.value = false
})

function onAssumeAdminSubmit(password: string) {
  const sid = routeSessionId.value
  if (!sid || assumeAdminSubmitting.value) {
    return
  }
  assumeAdminSubmitting.value = true
  requestAssumeAdmin(password, getOrCreatePartyGuestRequesterId(sid))
}

/** Queue panel: assume-admin row when connected but not yet a session admin. */
const showAssumeAdminSectionInPanel = computed(
  () => !isSessionAdmin.value && isSignalingConfigured.value,
)

const guestDisplayNameLabel = computed(() => {
  const n = guestDisplayName.value?.trim()
  return n && n.length > 0 ? n : 'Guest'
})

const guestAvatarInitials = computed(() => {
  const n = guestDisplayName.value?.trim()
  if (!n) {
    return 'G'
  }
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]![0]
    const b = parts[1]![0]
    if (a && b) {
      return (a + b).toUpperCase()
    }
  }
  return n.slice(0, 2).toUpperCase()
})

watch(handshakeStatus, (s) => {
  if (s === 'connected') {
    refreshGuestDisplayName()
  }
})

/** Explains why the session is idle when the join link is valid but nickname is not set yet. */
const joinHandshakeStatusLabel = computed(() => {
  if (!guestNameReady.value && routeSessionId.value) {
    return 'Set your nickname to connect…'
  }
  return statusLabel.value
})

/**
 * Stop current track: **session admin** (any now-playing row) **or** **owner** of that row only.
 * Host: `resolveSessionAdminEndPlaybackRequest`.
 */
const canShowEndNowPlaying = computed(() => {
  if (!canRequestEnqueue.value) {
    return false
  }
  const s = queueSnapshot.value
  if (!s || s.currentIndex === null || s.ids.length === 0) {
    return false
  }
  if (isSessionAdmin.value) {
    return true
  }
  return isMyQueueRow(s.currentIndex)
})

/**
 * “Pause” on join: host re-locks the room to “Click here to start singing” (same allow-list as end).
 * Only shown when the host snapshot says the room is audibly live (`hostAudioSessionUnlocked`).
 */
const canShowGuestRelockForRoom = computed(
  () => canShowEndNowPlaying.value && hostAudioSessionUnlocked.value,
)

/**
 * Remove a future (non-current) row: **session admin** (any row) **or** **owner** of that row.
 * Now-playing row uses “End for everyone” instead.
 */
function canShowRemoveQueueRow(index: number): boolean {
  if (!canRequestEnqueue.value) {
    return false
  }
  const s = queueSnapshot.value
  if (!s || s.currentIndex === null) {
    return false
  }
  if (index === s.currentIndex) {
    return false
  }
  if (isSessionAdmin.value) {
    return true
  }
  return isMyQueueRow(index)
}

function openEndSongDialog() {
  endSongDialog.value?.showModal()
  void nextTick(() => {
    endSongDialog.value?.querySelector<HTMLElement>('button, [href]')?.focus()
  })
}

function closeEndSongDialog() {
  endSongDialog.value?.close()
}

function confirmEndSong() {
  const sid = routeSessionId.value
  if (!sid) {
    closeEndSongDialog()
    return
  }
  requestEndCurrentPlayback(getOrCreatePartyGuestRequesterId(sid))
  closeEndSongDialog()
}

function onGuestRelockForRoom() {
  const sid = routeSessionId.value
  if (!sid) {
    return
  }
  requestPauseCurrentPlayback(getOrCreatePartyGuestRequesterId(sid))
}

function onRemoveQueueRow(index: number) {
  const sid = routeSessionId.value
  if (!sid) {
    return
  }
  requestRemoveRow(index, getOrCreatePartyGuestRequesterId(sid))
}

function onAddSongBarTap() {
  if (!canRequestEnqueue.value) {
    return
  }
  if (atMaxMySongsInQueue.value) {
    window.alert(
      buildEnqueueRejectedAlreadyHasRequest(maxGuestQueueRowsPerGuest.value),
    )
    return
  }
  openAddSongModal()
}

function tryOpenGuestNameModalIfNeeded() {
  if (readGuestDisplayName()) {
    return
  }
  openAddSongAfterGuestName.value = false
  guestNameInput.value = ''
  guestNameError.value = null
  guestNameDialog.value?.showModal()
  void nextTick(() => document.getElementById('guest-display-name-input')?.focus())
}

function openAddSongModal() {
  if (!readGuestDisplayName()) {
    openAddSongAfterGuestName.value = true
    guestNameInput.value = ''
    guestNameError.value = null
    guestNameDialog.value?.showModal()
    void nextTick(() => document.getElementById('guest-display-name-input')?.focus())
    return
  }
  openAddSongModalAfterName()
}

function openAddSongModalAfterName() {
  addSongStep.value = 1
  pasteInput.value = ''
  pasteValidationError.value = null
  addSongDialog.value?.showModal()
  void nextTick(() => {
    const root = addSongDialog.value
    root?.querySelector<HTMLElement>('button, [href]')?.focus()
  })
}

function submitGuestName() {
  guestNameError.value = null
  const v = validateGuestDisplayName(guestNameInput.value)
  if (!v) {
    guestNameError.value = 'Enter a nickname (1–10 characters).'
    return
  }
  if (!saveGuestDisplayName(v)) {
    guestNameError.value = 'Could not save. Check browser storage settings.'
    return
  }
  const openAddSong = openAddSongAfterGuestName.value
  openAddSongAfterGuestName.value = false
  refreshGuestDisplayName()
  guestNameDialog.value?.close()
  if (openAddSong) {
    openAddSongModalAfterName()
  }
}

function onGuestNameDialogClose() {
  guestNameInput.value = ''
  guestNameError.value = null
  openAddSongAfterGuestName.value = false
}

function onPrivacyNoticeDismissed() {
  void nextTick(() => tryOpenGuestNameModalIfNeeded())
}

function onJoinSplashComplete() {
  showJoinSplash.value = false
  if (!readPrivacyNoticeDismissed()) {
    void nextTick(() => privacyNoticeSheet.value?.open())
  } else {
    void nextTick(() => tryOpenGuestNameModalIfNeeded())
  }
}

function closeAddSongModal() {
  addSongDialog.value?.close()
}

function onAddSongDialogClose() {
  addSongStep.value = 1
  addSongStep2Tab.value = 'search'
  pasteInput.value = ''
  pasteValidationError.value = null
  youtubeSearchQuery.value = ''
  youtubeSearchResults.value = []
  youtubeSearchNextPage.value = null
  youtubeSearchError.value = null
  youtubeSearchLoading.value = false
  void nextTick(() => addSongTriggerRef.value?.focus())
}

function focusAddSongStep2Field() {
  if (addSongStep2Tab.value === 'search') {
    document.getElementById('guest-add-song-search-q')?.focus()
  } else {
    document.getElementById('guest-add-song-paste')?.focus()
  }
}

function goToPasteStep() {
  addSongStep.value = 2
  void nextTick(() => focusAddSongStep2Field())
}

function setAddSongStep2Tab(tab: 'search' | 'paste') {
  addSongStep2Tab.value = tab
  if (addSongStep.value === 2) {
    void nextTick(() => focusAddSongStep2Field())
  }
}

function validateGuestAndCapForEnqueue(): string | null {
  const guestName = readGuestDisplayName()
  if (!guestName) {
    return 'Set your display name before adding a song.'
  }
  if (atMaxMySongsInQueue.value) {
    return buildEnqueueRejectedAlreadyHasRequest(maxGuestQueueRowsPerGuest.value)
  }
  return null
}

/** After `validateGuestAndCapForEnqueue()` succeeds, `guestName` is non-null. */
function commitGuestSongRequest(videoId: string, title: string | null) {
  const guestName = readGuestDisplayName()!
  const requesterId = getOrCreatePartyGuestRequesterId(routeSessionId.value)
  requestEnqueue(videoId, title, guestName, requesterId)
  closeAddSongModal()
}

async function runYoutubeSearch(append: boolean) {
  if (youtubeSearchLoading.value) {
    return
  }
  const pageToken = append ? youtubeSearchNextPage.value : null
  if (append && !pageToken) {
    return
  }
  youtubeSearchError.value = null
  if (!append) {
    youtubeSearchNextPage.value = null
    youtubeSearchResults.value = []
  }
  youtubeSearchLoading.value = true
  try {
    const r = await searchYoutubeOnServer(youtubeSearchQuery.value, pageToken ? { pageToken } : undefined)
    if (!r.ok) {
      youtubeSearchError.value = r.message
      return
    }
    if (append) {
      const seen = new Set(youtubeSearchResults.value.map((i) => i.videoId))
      for (const row of r.data.items) {
        if (!seen.has(row.videoId)) {
          seen.add(row.videoId)
          youtubeSearchResults.value.push(row)
        }
      }
    } else {
      youtubeSearchResults.value = r.data.items
    }
    youtubeSearchNextPage.value = r.data.nextPageToken ?? null
  } finally {
    youtubeSearchLoading.value = false
  }
}

function submitYoutubeSearch() {
  void runYoutubeSearch(false)
}

function loadMoreYoutubeSearch() {
  void runYoutubeSearch(true)
}

async function enqueueFromSearchSelection(item: YoutubeSearchItem) {
  youtubeSearchError.value = null
  pasteValidationError.value = null
  const err = validateGuestAndCapForEnqueue()
  if (err) {
    youtubeSearchError.value = err
    return
  }
  if (isEnqueueSubmitting.value) {
    return
  }
  isEnqueueSubmitting.value = true
  try {
    commitGuestSongRequest(item.videoId, item.title)
  } finally {
    isEnqueueSubmitting.value = false
  }
}

async function submitPasteEnqueue() {
  pasteValidationError.value = null
  const err = validateGuestAndCapForEnqueue()
  if (err) {
    pasteValidationError.value = err
    return
  }
  const id = extractYoutubeVideoId(pasteInput.value)
  if (!id) {
    pasteValidationError.value = "That doesn't look like a valid video URL or ID."
    return
  }
  if (isEnqueueSubmitting.value) {
    return
  }
  isEnqueueSubmitting.value = true
  try {
    const title = await fetchYoutubeVideoTitle(id)
    commitGuestSongRequest(id, title)
  } finally {
    isEnqueueSubmitting.value = false
  }
}

function openChatModal() {
  if (!canRequestEnqueue.value) {
    return
  }
  chatInput.value = ''
  chatFieldError.value = null
  chatDialog.value?.showModal()
  void nextTick(() => document.getElementById('guest-chat-input')?.focus())
}

function closeChatModal() {
  chatDialog.value?.close()
}

function onChatDialogClose() {
  chatInput.value = ''
  chatFieldError.value = null
  void nextTick(() => {
    const chatBtn = chatTriggerRef.value
    if (chatBtn) {
      chatBtn.focus()
      return
    }
    addSongTriggerRef.value?.focus()
  })
}

function submitChat() {
  chatFieldError.value = null
  const r = requestAudienceChat(chatInput.value)
  if (!r.ok) {
    chatFieldError.value = r.reason
    return
  }
  closeChatModal()
}

const canSubmitAudienceChat = computed(() => {
  if (!canRequestEnqueue.value) {
    return false
  }
  if (audienceChatCooldownSecondsLeft.value > 0) {
    return false
  }
  return chatInput.value.trim().length > 0
})

const addSongAtCapAria = computed(() => {
  const n = maxGuestQueueRowsPerGuest.value
  const word = n === 1 ? 'one song' : `${n} songs`
  return `Add my song — you already have ${word} in the queue`
})

function openQueueSettings() {
  if (!canRequestEnqueue.value || !isSignalingConfigured.value) {
    return
  }
  queueSettingsOpen.value = true
}

function onQueueSettingsSave(payload: {
  maxGuestQueueRowsPerGuest: number
  audienceChatEnabled: boolean
  playerResolution: PlayerResolutionPreference
}) {
  if (!isSessionAdmin.value) {
    return
  }
  const sid = routeSessionId.value
  if (!sid) {
    return
  }
  const v = Math.min(
    GUEST_QUEUE_ROWS_CAP_MAX,
    Math.max(GUEST_QUEUE_ROWS_CAP_MIN, Math.round(Number(payload.maxGuestQueueRowsPerGuest))),
  )
  const chat = payload.audienceChatEnabled
  const res = payload.playerResolution
  if (
    v === maxGuestQueueRowsPerGuest.value
    && chat === audienceChatEnabled.value
    && res === playerResolutionPreference.value
  ) {
    queueSettingsOpen.value = false
    return
  }
  queueSettingsTarget.value = {
    maxGuestQueueRowsPerGuest: v,
    audienceChatEnabled: chat,
    playerResolution: res,
  }
  queueSettingsSavePending.value = true
  requestQueueSettingsUpdate(
    { maxGuestQueueRowsPerGuest: v, audienceChatEnabled: chat, playerResolution: res },
    getOrCreatePartyGuestRequesterId(sid),
  )
}

watch(
  [maxGuestQueueRowsPerGuest, audienceChatEnabled, playerResolutionPreference],
  () => {
    if (!queueSettingsSavePending.value || queueSettingsTarget.value === null) {
      return
    }
    const t = queueSettingsTarget.value
    if (
      maxGuestQueueRowsPerGuest.value === t.maxGuestQueueRowsPerGuest
      && audienceChatEnabled.value === t.audienceChatEnabled
      && playerResolutionPreference.value === t.playerResolution
    ) {
      queueSettingsSavePending.value = false
      queueSettingsTarget.value = null
      queueSettingsOpen.value = false
    }
  },
)

watch(audienceChatEnabled, (on) => {
  if (!on) {
    closeChatModal()
  }
})

watch(lastQueueSettingsError, (e) => {
  if (e) {
    queueSettingsSavePending.value = false
  }
})
</script>

<template>
  <GuestShell
    :class="[
      'flex h-full min-h-0 w-full flex-1 flex-col gap-0 overflow-hidden !pb-0 bg-[#F2F2F7] text-[17px] leading-[1.29] antialiased dark:bg-slate-950 dark:text-slate-100 [font-family:-apple-system,BlinkMacSystemFont,Segoe_UI,Roboto,Helvetica_Neue,sans-serif]',
      guestDarkMode && 'dark',
    ]"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden">
    <header class="flex shrink-0 justify-center pb-2 pt-1">
      <img
        :src="logoUrl"
        alt="Yoochog"
        class="h-14 w-auto max-w-[min(100%,16rem)] object-contain object-center"
        decoding="async"
      />
    </header>

    <!-- Connection status (left); you / avatar / name (right when connected) -->
    <div
      class="shrink-0 overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)] dark:bg-slate-900 dark:shadow-black/40"
      aria-live="polite"
    >
      <div class="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-3">
        <div class="flex min-w-0 flex-1 items-center gap-3 overflow-hidden">
          <div
            class="min-w-0 flex-1 overflow-hidden text-[15px] leading-snug text-[#3C3C43] dark:text-slate-300"
          >
            <HandshakeStatusStrip
              :status="handshakeStatus"
              :status-label="joinHandshakeStatusLabel"
              :is-signaling-configured="isSignalingConfigured"
            />
          </div>
          <div
            v-if="handshakeStatus === 'connected'"
            class="flex min-w-0 shrink-0 items-center gap-2 border-l border-[#C6C6C8] pl-3 dark:border-slate-600"
            role="region"
            :aria-label="isSessionAdmin ? 'You are the session admin' : 'Your display name'"
          >
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold leading-none text-white tabular-nums"
              :class="
                isSessionAdmin
                  ? 'bg-[#FF3B30] shadow-[0_1px_2px_rgba(255,59,48,0.35)] ring-2 ring-[#FF3B30]/20 ring-offset-1 ring-offset-white dark:ring-offset-slate-900'
                  : 'bg-[#007AFF] shadow-[0_1px_2px_rgba(0,122,255,0.25)]'
              "
              aria-hidden="true"
            >
              {{ guestAvatarInitials }}
            </div>
            <div class="min-w-0 max-w-[11rem]">
              <p class="truncate text-[15px] font-semibold leading-tight tracking-[-0.01em] text-black dark:text-white">
                {{ guestDisplayNameLabel }}<span
                  v-if="isSessionAdmin"
                  class="font-medium text-[#6D6D72] dark:text-slate-400"
                >
                  — Admin</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Transition name="enqueue-toast">
      <div
        v-if="lastEnqueueError"
        class="overflow-hidden rounded-[12px] bg-white px-4 py-3 text-center text-[15px] font-normal leading-[1.38] tracking-[-0.24px] text-[#3C3C43] shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)] dark:bg-slate-900 dark:text-slate-300 dark:shadow-black/40"
        role="status"
        aria-live="polite"
      >
        {{ lastEnqueueError }}
      </div>
    </Transition>

    <Transition name="enqueue-toast">
      <div
        v-if="lastChatError"
        class="overflow-hidden rounded-[12px] bg-white px-4 py-3 text-center text-[15px] font-normal leading-[1.38] tracking-[-0.24px] text-[#3C3C43] shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)] dark:bg-slate-900 dark:text-slate-300 dark:shadow-black/40"
        role="status"
        aria-live="polite"
      >
        {{ lastChatError }}
      </div>
    </Transition>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div
        class="flex shrink-0 items-center justify-between gap-2 px-1 pb-1 pt-0"
      >
        <h2 class="m-0 text-[12px] font-semibold uppercase tracking-[0.02em] text-[#6D6D72] dark:text-slate-400">
          Queue
        </h2>
        <div class="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
          <AppearanceToggle compact />
          <button
            v-if="canRequestEnqueue && isSignalingConfigured"
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6D6D72] transition-colors active:bg-black/5 dark:text-slate-400 dark:active:bg-white/5"
            aria-label="Open queue settings"
            @click="openQueueSettings"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.22-.08-.49 0-.61.22l-2 3.46c-.12.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.74 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5z"
              />
            </svg>
          </button>
        </div>
      </div>
      <div
        class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.15),0_0.5px_3px_rgba(0,0,0,0.08)] dark:bg-slate-900 dark:shadow-black/40"
      >
        <div
          v-if="!(queueSnapshot?.ids?.length)"
          class="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center"
          role="status"
          aria-label="Queue is empty"
        >
          <img
            :src="logoUrl"
            alt="Yoochog"
            class="h-auto max-h-[7.5rem] w-auto max-w-[min(100%,14rem)] object-contain object-center"
            decoding="async"
          />
          <p
            class="max-w-[17rem] text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black dark:text-white"
          >
            Nothing in the jukebox yet
          </p>
          <p
            class="max-w-[18rem] text-[13px] font-normal leading-[1.38] text-[#8E8E93] dark:text-slate-400"
          >
            Tap <span class="font-semibold text-[#6D6D72] dark:text-slate-300">Add my song</span> below, search YouTube for
            your track, then enqueue—it shows up here for the room.
          </p>
        </div>

        <ol
          v-else
          class="ios-scroll flex min-h-0 w-full min-w-0 flex-1 flex-col"
          aria-label="Playback queue"
        >
          <li
            v-for="(rowId, index) in queueSnapshot?.ids ?? []"
            :key="`${index}-${rowId}`"
            :aria-current="index === queueSnapshot?.currentIndex ? 'true' : undefined"
            class="flex min-h-[44px] min-w-0 w-full shrink-0 border-b border-[#C6C6C8] px-4 py-3.5 last:border-b-0 dark:border-slate-700"
            :class="
              index === queueSnapshot?.currentIndex
                ? 'bg-[rgba(255,59,48,0.08)] dark:bg-red-950/40'
                : 'bg-white dark:bg-slate-900'
            "
          >
            <div class="flex w-full min-w-0 items-start gap-2">
              <div class="min-w-0 flex-1 pt-0.5">
                <div class="flex items-start gap-2">
                  <span class="w-5 shrink-0 pt-0.5 text-right text-[13px] tabular-nums leading-5 text-[#8E8E93] select-none dark:text-slate-500">{{ index + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <p
                      class="min-w-0 truncate text-left text-[17px] font-normal leading-[1.35] tracking-[-0.01em] text-black dark:text-slate-100"
                    >
                      {{ queueRowTitle(index) }}
                    </p>
                    <p
                      v-if="queueRowRequester(index)"
                      class="mt-1.5 min-w-0 truncate text-left text-[15px] font-normal leading-[1.45] text-[#6D6D72] dark:text-slate-400"
                    >
                      <span class="font-medium">Requested by </span>
                      <span class="font-bold text-black dark:text-slate-100">{{ queueRowRequester(index) }}</span>
                    </p>
                    <p
                      v-if="isMyQueueRow(index)"
                      class="mt-1 min-w-0 text-left text-[13px] font-medium leading-[1.35] text-[#8E8E93] dark:text-slate-500"
                    >
                      Your request
                    </p>
                  </div>
                </div>
              </div>
              <div class="flex shrink-0 items-center justify-end gap-2 pt-0.5">
                <button
                  v-if="index === queueSnapshot?.currentIndex && canShowGuestRelockForRoom"
                  type="button"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF9500] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[transform,background-color] active:scale-[0.96] active:bg-[#E68600] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF9500]"
                  aria-label="Return the room to preview without full sound; the host can tap to start the song from the beginning with sound"
                  @click="onGuestRelockForRoom"
                >
                  <svg
                    class="pointer-events-none h-[16.8px] w-[13.2px] shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.1 3.5h4.8v17H5.1V3.5M14 3.5h4.8v17h-4.8V3.5z"
                      fill="white"
                    />
                  </svg>
                </button>
                <button
                  v-if="index === queueSnapshot?.currentIndex && canShowEndNowPlaying"
                  type="button"
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF3B30] shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[transform,background-color] active:scale-[0.96] active:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
                  aria-label="Stop this song for everyone"
                  @click="openEndSongDialog"
                >
                  <!-- Classic player stop: solid square on red -->
                  <svg
                    class="pointer-events-none h-[14px] w-[14px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <rect x="5" y="5" width="14" height="14" rx="1.5" fill="white" />
                  </svg>
                </button>
                <button
                  v-if="canShowRemoveQueueRow(index)"
                  type="button"
                  class="shrink-0 rounded-lg px-2 py-1.5 text-[13px] font-semibold leading-tight text-[#FF3B30] transition-colors active:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
                  @click="onRemoveQueueRow(index)"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        </ol>
      </div>
    </div>
    </div>

    <div
      class="mb-[10dvh] shrink-0 border-t border-[#C6C6C8] bg-[#FAFAFA] px-3 pt-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom,0px)+1rem))] dark:border-slate-700 dark:bg-slate-900"
    >
      <div class="flex flex-col gap-2">
        <button
          ref="addSongTriggerRef"
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] px-3 py-2 text-[17px] font-semibold leading-5 text-white shadow-sm transition-[background-color,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:active:scale-100"
          :class="
            canOpenAddSongFlow
              ? 'bg-[#FF3B30] active:scale-[0.99] active:bg-[#D70015] focus-visible:outline-[#FF3B30]'
              : [
                  'bg-[#C7C7CC]',
                  canRequestEnqueue && atMaxMySongsInQueue ? 'cursor-pointer' : 'cursor-default',
                ]
          "
          :disabled="!canRequestEnqueue"
          :aria-label="atMaxMySongsInQueue ? addSongAtCapAria : 'Add my song'"
          @click="onAddSongBarTap"
        >
          Add my song
        </button>
        <button
          v-if="audienceChatEnabled"
          ref="chatTriggerRef"
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-[#007AFF] px-3 py-2 text-[17px] font-semibold leading-5 text-white shadow-sm transition-[background-color,transform] active:scale-[0.99] active:bg-[#0051D5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-not-allowed disabled:bg-[#C7C7CC] disabled:active:scale-100"
          :disabled="!canRequestEnqueue"
          aria-label="Chat — send a short message to the host screen"
          @click="openChatModal"
        >
          Chat
        </button>
      </div>
    </div>

    <dialog
      ref="guestNameDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none dark:text-slate-100 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-name-title"
      aria-modal="true"
      @cancel.prevent
      @close="onGuestNameDialogClose"
    >
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4 dark:bg-slate-950 dark:shadow-black/40"
      >
        <h2 id="guest-name-title" class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black dark:text-white">
          Your nickname
        </h2>
        <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-black/40">
          <p class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43] dark:text-slate-300">
            The host will see this label when you request songs.
          </p>
          <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3 dark:border-slate-700">
            <label for="guest-display-name-input" class="block text-[13px] font-normal leading-4 text-[#6D6D72] dark:text-slate-400">
              Nickname
            </label>
            <input
              id="guest-display-name-input"
              v-model="guestNameInput"
              type="text"
              autocomplete="nickname"
              maxlength="10"
              class="mt-2 min-h-[44px] w-full rounded-[8px] border border-[#C6C6C8] bg-[#FAFAFA] px-3 text-[17px] leading-[22px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
              @keydown.enter.prevent="submitGuestName"
            />
            <p v-if="guestNameError" class="mt-2 text-center text-[13px] leading-[1.38] text-[#FF3B30] dark:text-red-400" role="status">
              {{ guestNameError }}
            </p>
          </div>
          <div class="border-t border-[#C6C6C8] dark:border-slate-700">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] dark:bg-slate-900 dark:active:bg-slate-800"
              @click="submitGuestName"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </dialog>

    <dialog
      ref="addSongDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none dark:text-slate-100 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-add-song-title"
      aria-modal="true"
      @close="onAddSongDialogClose"
    >
      <!-- iOS alert-style sheet: grouped white actions + separate Cancel pill on system gray -->
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4 dark:bg-slate-950 dark:shadow-black/40"
      >
        <h2 id="guest-add-song-title" class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black dark:text-white">
          Add my song
        </h2>

        <div
          v-if="addSongStep === 1"
          class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-black/40"
        >
          <p id="guest-add-song-step1" class="px-4 pb-3 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43] dark:text-slate-300">
            Next, <span class="font-semibold text-black dark:text-slate-100">search</span> for a song or artist and pick a
            result to add it to the queue.
          </p>
          <div class="border-t border-[#C6C6C8] dark:border-slate-700">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] dark:bg-slate-900 dark:active:bg-slate-800"
              @click="goToPasteStep"
            >
              Continue
            </button>
          </div>
        </div>

        <div v-else class="flex flex-col gap-2.5">
          <div
            class="flex overflow-hidden rounded-[10px] bg-[#E5E5EA] p-0.5 dark:bg-slate-800"
            role="tablist"
            aria-label="How to add your song"
          >
            <button
              type="button"
              role="tab"
              class="min-h-[40px] flex-1 rounded-[8px] px-2 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF]"
              :class="
                addSongStep2Tab === 'search'
                  ? 'bg-white text-black shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'bg-transparent text-[#6D6D72] dark:text-slate-400'
              "
              :aria-selected="addSongStep2Tab === 'search'"
              aria-controls="guest-add-song-panel-search"
              id="guest-add-song-tab-search"
              @click="setAddSongStep2Tab('search')"
            >
              Search
            </button>
            <button
              type="button"
              role="tab"
              class="min-h-[40px] flex-1 rounded-[8px] px-1.5 text-[12px] font-semibold leading-snug transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] sm:px-2 sm:text-[13px]"
              :class="
                addSongStep2Tab === 'paste'
                  ? 'bg-white text-black shadow-sm dark:bg-slate-900 dark:text-slate-100'
                  : 'bg-transparent text-[#6D6D72] dark:text-slate-400'
              "
              :aria-selected="addSongStep2Tab === 'paste'"
              aria-controls="guest-add-song-panel-paste"
              id="guest-add-song-tab-paste"
              @click="setAddSongStep2Tab('paste')"
            >
              Video URL
            </button>
          </div>

          <div
            v-show="addSongStep2Tab === 'search'"
            id="guest-add-song-panel-search"
            role="tabpanel"
            aria-labelledby="guest-add-song-tab-search"
            class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-black/40"
          >
            <p class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43] dark:text-slate-300">
              Type a song or artist, then search. Pick a result to add it to the queue.
            </p>
            <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3 dark:border-slate-700">
              <label for="guest-add-song-search-q" class="block text-[13px] font-normal leading-4 text-[#6D6D72] dark:text-slate-400">
                Search YouTube
              </label>
              <input
                id="guest-add-song-search-q"
                v-model="youtubeSearchQuery"
                type="search"
                autocomplete="off"
                maxlength="200"
                enterkeyhint="search"
                class="mt-2 min-h-[44px] w-full rounded-[8px] border border-[#C6C6C8] bg-[#FAFAFA] px-3 text-[17px] leading-[22px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
                :disabled="!canRequestEnqueue || youtubeSearchLoading"
                @keydown.enter.prevent="submitYoutubeSearch"
              />
              <p v-if="youtubeSearchError" class="mt-2 text-center text-[13px] leading-[1.38] text-[#FF3B30] dark:text-red-400" role="status" aria-live="polite">
                {{ youtubeSearchError }}
              </p>
            </div>
            <div class="border-t border-[#C6C6C8] dark:border-slate-700">
              <button
                type="button"
                class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] disabled:cursor-not-allowed disabled:text-[#C7C7CC] disabled:active:bg-white dark:bg-slate-900 dark:active:bg-slate-800 dark:disabled:bg-slate-900"
                :disabled="!canRequestEnqueue || !youtubeSearchQuery.trim() || youtubeSearchLoading"
                @click="submitYoutubeSearch"
              >
                {{ youtubeSearchLoading ? '…' : 'Search' }}
              </button>
            </div>
            <ul
              v-if="youtubeSearchResults.length > 0"
              class="max-h-[40vh] divide-y divide-[#C6C6C8] overflow-y-auto border-t border-[#C6C6C8] dark:divide-slate-700 dark:border-slate-700"
              aria-label="Search results"
            >
              <li v-for="(row, idx) in youtubeSearchResults" :key="`${row.videoId}-${idx}`">
                <button
                  type="button"
                  class="flex w-full min-h-[48px] flex-col items-start gap-0.5 px-4 py-3 text-left active:bg-black/5 dark:active:bg-white/5 disabled:opacity-50"
                  :disabled="!canRequestEnqueue || isEnqueueSubmitting"
                  @click="enqueueFromSearchSelection(row)"
                >
                  <span class="line-clamp-2 text-[15px] font-medium leading-snug text-black dark:text-slate-100">{{ row.title }}</span>
                  <span class="text-[11px] font-normal text-[#8E8E93] dark:text-slate-500">{{ row.videoId }}</span>
                </button>
              </li>
            </ul>
            <div v-if="youtubeSearchNextPage" class="border-t border-[#C6C6C8] dark:border-slate-700">
              <button
                type="button"
                class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[15px] font-semibold leading-[22px] text-[#007AFF] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#007AFF] disabled:cursor-not-allowed disabled:text-[#C7C7CC] dark:bg-slate-900 dark:active:bg-slate-800"
                :disabled="!canRequestEnqueue || youtubeSearchLoading"
                @click="loadMoreYoutubeSearch"
              >
                {{ youtubeSearchLoading ? '…' : 'Load more' }}
              </button>
            </div>
          </div>

          <div
            v-show="addSongStep2Tab === 'paste'"
            id="guest-add-song-panel-paste"
            role="tabpanel"
            aria-labelledby="guest-add-song-tab-paste"
            class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-black/40"
            aria-describedby="guest-add-song-step2-hint"
          >
            <p id="guest-add-song-step2-hint" class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43] dark:text-slate-300">
              Enter a YouTube watch URL or an 11-character video ID.
            </p>
            <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3 dark:border-slate-700">
              <label for="guest-add-song-paste" class="block text-[13px] font-normal leading-4 text-[#6D6D72] dark:text-slate-400">
                Video URL or ID
              </label>
              <input
                id="guest-add-song-paste"
                v-model="pasteInput"
                type="text"
                inputmode="url"
                autocomplete="off"
                maxlength="2048"
                class="mt-2 min-h-[44px] w-full rounded-[8px] border border-[#C6C6C8] bg-[#FAFAFA] px-3 text-[17px] leading-[22px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
                :disabled="!canRequestEnqueue || isEnqueueSubmitting"
                @keydown.enter.prevent="submitPasteEnqueue"
              />
              <p v-if="pasteValidationError" class="mt-2 text-center text-[13px] leading-[1.38] text-[#FF3B30] dark:text-red-400" role="status" aria-live="polite">
                {{ pasteValidationError }}
              </p>
            </div>
            <div class="border-t border-[#C6C6C8] dark:border-slate-700">
              <button
                type="button"
                class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] disabled:cursor-not-allowed disabled:text-[#C7C7CC] disabled:active:bg-white dark:bg-slate-900 dark:active:bg-slate-800 dark:disabled:bg-slate-900"
                :disabled="!canRequestEnqueue || !pasteInput.trim() || isEnqueueSubmitting"
                @click="submitPasteEnqueue"
              >
                {{ isEnqueueSubmitting ? '…' : 'Enqueue' }}
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#007AFF] shadow-[0_0.5px_0_rgba(0,0,0,0.12)] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] dark:bg-slate-800 dark:text-[#3D8FFF] dark:shadow-black/40 dark:active:bg-slate-700"
          @click="closeAddSongModal"
        >
          Cancel
        </button>
      </div>
    </dialog>

    <dialog
      ref="chatDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none dark:text-slate-100 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-chat-title"
      aria-modal="true"
      @close="onChatDialogClose"
    >
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4 dark:bg-slate-950 dark:shadow-black/40"
      >
        <h2
          id="guest-chat-title"
          class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black dark:text-white"
        >
          Chat
        </h2>
        <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-black/40">
          <p class="px-4 pb-2 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43] dark:text-slate-300">
            Cheer from your phone, show up on the TV. Keep it short: 5 words, 30 characters.
            <span class="mt-1 block font-bold text-[#0039C7] dark:text-[#3D8FFF]">
              We’re all here to have fun—be nice.
            </span>
          </p>
          <div class="border-t border-[#C6C6C8] px-4 pb-1 pt-3 dark:border-slate-700">
            <label for="guest-chat-input" class="block text-[13px] font-normal leading-4 text-[#6D6D72] dark:text-slate-400">
              Message
            </label>
            <input
              id="guest-chat-input"
              v-model="chatInput"
              type="text"
              maxlength="40"
              autocomplete="off"
              class="mt-2 min-h-[44px] w-full rounded-[8px] border border-[#C6C6C8] bg-[#FAFAFA] px-3 text-[17px] leading-[22px] text-black placeholder:text-[#C7C7CC] focus:border-[#007AFF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
              :disabled="!canRequestEnqueue"
              @keydown.enter.prevent="submitChat"
            />
            <p
              v-if="audienceChatCooldownSecondsLeft > 0"
              class="mt-2 text-center text-[13px] leading-[1.38] text-[#8E8E93] dark:text-slate-400"
              role="status"
            >
              You can send again in {{ audienceChatCooldownSecondsLeft }}s.
            </p>
            <p v-if="chatFieldError" class="mt-2 text-center text-[13px] leading-[1.38] text-[#FF3B30] dark:text-red-400" role="status">
              {{ chatFieldError }}
            </p>
          </div>
          <div class="border-t border-[#C6C6C8] dark:border-slate-700">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] disabled:cursor-not-allowed disabled:text-[#C7C7CC] disabled:active:bg-white dark:bg-slate-900 dark:active:bg-slate-800 dark:disabled:bg-slate-900"
              :disabled="!canSubmitAudienceChat"
              @click="submitChat"
            >
              Send
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#007AFF] shadow-[0_0.5px_0_rgba(0,0,0,0.12)] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] dark:bg-slate-800 dark:text-[#3D8FFF] dark:shadow-black/40 dark:active:bg-slate-700"
          @click="closeChatModal"
        >
          Cancel
        </button>
      </div>
    </dialog>

    <dialog
      ref="endSongDialog"
      class="fixed left-1/2 top-1/2 z-[200] m-0 max-h-[min(90dvh,32rem)] w-[min(100%-1.5rem,20rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] border-0 bg-transparent p-0 text-black shadow-none dark:text-slate-100 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
      aria-labelledby="guest-end-song-title"
      aria-modal="true"
    >
      <div
        class="flex max-h-[min(90dvh,32rem)] flex-col gap-2.5 rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4 dark:bg-slate-950 dark:shadow-black/40"
      >
        <h2
          id="guest-end-song-title"
          class="px-2 text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black dark:text-white"
        >
          End this song?
        </h2>
        <div class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12)] dark:bg-slate-900 dark:shadow-black/40">
          <p class="px-4 pb-3 pt-3.5 text-center text-[13px] leading-[1.38] text-[#3C3C43] dark:text-slate-300">
            This stops playback for everyone and continues like the song finished on its own.
          </p>
          <div class="border-t border-[#C6C6C8] dark:border-slate-700">
            <button
              type="button"
              class="flex min-h-[44px] w-full items-center justify-center bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#FF3B30] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF3B30] dark:bg-slate-900 dark:active:bg-slate-800"
              @click="confirmEndSong"
            >
              End
            </button>
          </div>
        </div>
        <button
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-white px-4 text-[17px] font-semibold leading-[22px] text-[#007AFF] shadow-[0_0.5px_0_rgba(0,0,0,0.12)] active:bg-[#E5E5EA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] dark:bg-slate-800 dark:text-[#3D8FFF] dark:shadow-black/40 dark:active:bg-slate-700"
          @click="closeEndSongDialog"
        >
          Cancel
        </button>
      </div>
    </dialog>

    <QueueSettingsPanel
      v-model="queueSettingsOpen"
      v-model:assume-admin-eligible="assumeAdminEligible"
      :max-from-host="maxGuestQueueRowsPerGuest"
      :chat-enabled-from-host="audienceChatEnabled"
      :player-resolution-from-host="playerResolutionPreference"
      :is-saving="queueSettingsSavePending"
      :last-error="lastQueueSettingsError"
      :is-session-admin="isSessionAdmin"
      :show-assume-admin-section="showAssumeAdminSectionInPanel"
      :can-show-become-admin-button="canOfferAssumeAdmin"
      :last-assume-admin-result="lastAssumeAdminResult"
      :assume-admin-submitting="assumeAdminSubmitting"
      @save="onQueueSettingsSave"
      @assume-admin-submit="onAssumeAdminSubmit"
    />
    <HostPlayerSplash v-if="showJoinSplash" @complete="onJoinSplashComplete" />
    <PrivacyNoticeSheet ref="privacyNoticeSheet" @dismissed="onPrivacyNoticeDismissed" />
  </GuestShell>
</template>

<style scoped>
.enqueue-toast-enter-active,
.enqueue-toast-leave-active {
  transition: opacity 0.22s ease;
}
.enqueue-toast-enter-from,
.enqueue-toast-leave-to {
  opacity: 0;
}
</style>
