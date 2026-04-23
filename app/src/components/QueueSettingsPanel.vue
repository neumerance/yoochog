<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { useHostPlayerDarkMode } from '@/composables/useHostPlayerDarkMode'
import {
  GUEST_QUEUE_ROWS_CAP_MAX,
  GUEST_QUEUE_ROWS_CAP_MIN,
} from '@/lib/host-queue/guestQueueLimits'

/** Same persistence as Join / Player: panel is teleported to `body`, so it must set `.dark` itself. */
const { isDark } = useHostPlayerDarkMode()

const props = defineProps<{
  modelValue: boolean
  /** Effective cap from the host (drives the draft on open and after sync). */
  maxFromHost: number
  /** Host toggle: guests can send short messages to the TV overlay. */
  chatEnabledFromHost: boolean
  isSaving: boolean
  lastError: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'save', value: { maxGuestQueueRowsPerGuest: number; audienceChatEnabled: boolean }): void
}>()

const draft = ref(GUEST_QUEUE_ROWS_CAP_MIN)
const draftChatEnabled = ref(true)
const isOpen = computed({
  get: () => props.modelValue,
  set: (v) => {
    emit('update:modelValue', v)
  },
})

watch(
  () => [props.modelValue, props.maxFromHost, props.chatEnabledFromHost] as const,
  ([open, max, chat]) => {
    if (open) {
      draft.value = max
      draftChatEnabled.value = chat
    }
  },
  { immediate: true },
)

function onCancel() {
  if (props.isSaving) {
    return
  }
  isOpen.value = false
}

function onSave() {
  if (props.isSaving) {
    return
  }
  emit('save', {
    maxGuestQueueRowsPerGuest: draft.value,
    audienceChatEnabled: draftChatEnabled.value,
  })
}

function toggleDraftChat() {
  if (props.isSaving) {
    return
  }
  draftChatEnabled.value = !draftChatEnabled.value
}

function clampDraft(n: number) {
  return Math.min(
    GUEST_QUEUE_ROWS_CAP_MAX,
    Math.max(GUEST_QUEUE_ROWS_CAP_MIN, Math.round(n)),
  )
}

function increment() {
  if (props.isSaving) {
    return
  }
  draft.value = clampDraft(draft.value + 1)
}

function decrement() {
  if (props.isSaving) {
    return
  }
  draft.value = clampDraft(draft.value - 1)
}

const canDecrement = computed(() => draft.value > GUEST_QUEUE_ROWS_CAP_MIN)
const canIncrement = computed(() => draft.value < GUEST_QUEUE_ROWS_CAP_MAX)
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transform-gpu transition-transform ease-out duration-300 will-change-transform motion-reduce:duration-0"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform-gpu transition-transform ease-in duration-300 will-change-transform motion-reduce:duration-0"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isOpen"
        :class="{ dark: isDark }"
        class="pointer-events-auto fixed inset-0 z-[250] flex w-full max-w-none flex-col bg-[#F2F2F7] text-[17px] leading-[1.29] text-black antialiased [padding-top:max(0.5rem,env(safe-area-inset-top,0px))] [padding-bottom:max(0.5rem,env(safe-area-inset-bottom,0px))] [padding-left:max(1rem,env(safe-area-inset-left,0px))] [padding-right:max(1rem,env(safe-area-inset-right,0px))] dark:bg-slate-950 dark:text-slate-100 sm:pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-settings-title"
      >
        <div
          class="ios-queue-settings flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin] [-ms-overflow-style:none] [&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0"
        >
            <header class="shrink-0">
              <h1
                id="queue-settings-title"
                class="m-0 text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-black dark:text-white"
              >
                Queue settings
              </h1>
              <p
                class="m-0 mt-2.5 text-[0.8125rem] font-normal leading-[1.4] text-[#6D6D72] dark:text-slate-500"
              >
                These limits apply to all guests. Only you can change them while you’re the session
                admin.
              </p>
            </header>

            <p
              v-if="lastError"
              class="mb-0 mt-3 shrink-0 rounded-[10px] bg-red-100 px-3 py-2.5 text-[0.8125rem] font-normal leading-snug text-red-800 dark:bg-red-950/50 dark:text-red-200"
              role="status"
            >
              {{ lastError }}
            </p>

            <div class="mt-4 min-h-0 shrink-0">
              <p
                class="m-0 mb-1.5 px-1 text-[0.8125rem] font-normal leading-normal text-[#6D6D72] dark:text-slate-500"
                role="text"
              >
                GUEST
              </p>
              <div
                class="overflow-hidden rounded-[10px] bg-white shadow-[0_0.5px_0_rgba(0,0,0,0.12),0_0.5px_3px_rgba(0,0,0,0.08)] ring-1 ring-[#C6C6C8] dark:bg-slate-900 dark:shadow-black/40 dark:ring-slate-700"
              >
                <div
                  class="flex min-h-11 items-center justify-between gap-2 py-1 pl-4 pr-3"
                >
                  <span
                    id="queue-max-songs-label"
                    class="min-w-0 flex-1 pr-2 text-[1.0625rem] font-normal leading-tight text-black dark:text-slate-100"
                  >Max songs per guest</span>
                  <div
                    class="flex shrink-0 items-center gap-2.5"
                  >
                    <span
                      class="min-w-6 text-right text-[1.0625rem] font-normal tabular-nums text-[#3C3C43] dark:text-slate-300"
                      aria-live="polite"
                    >{{ draft }}</span>
                    <div
                      class="inline-flex h-8 overflow-hidden rounded-[0.3rem] bg-[#E5E5EA] dark:bg-slate-600/90"
                      role="group"
                      aria-labelledby="queue-max-songs-label"
                    >
                      <button
                        type="button"
                        class="flex h-8 w-9 items-center justify-center text-[1.1rem] font-medium leading-none text-[#007AFF] active:bg-black/5 disabled:opacity-35 dark:text-sky-400 dark:active:bg-white/10"
                        :disabled="isSaving || !canDecrement"
                        aria-label="Decrease max songs"
                        @click="decrement"
                      >
                        −
                      </button>
                      <div
                        class="w-px shrink-0 self-stretch bg-[#C6C6C8] dark:bg-slate-500"
                        aria-hidden="true"
                      />
                      <button
                        type="button"
                        class="flex h-8 w-9 items-center justify-center text-[1.1rem] font-medium leading-none text-[#007AFF] active:bg-black/5 disabled:opacity-35 dark:text-sky-400 dark:active:bg-white/10"
                        :disabled="isSaving || !canIncrement"
                        aria-label="Increase max songs"
                        @click="increment"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                <div
                  class="flex min-h-11 items-center justify-between gap-3 border-t border-[#C6C6C8] py-1 pl-4 pr-3 dark:border-slate-600"
                >
                  <span
                    id="queue-audience-chat-label"
                    class="min-w-0 flex-1 pr-2 text-[1.0625rem] font-normal leading-tight text-black dark:text-slate-100"
                  >Audience chat</span>
                  <button
                    type="button"
                    class="relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full p-[2px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007AFF] disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:outline-sky-400"
                    :class="draftChatEnabled ? 'bg-[#34C759]' : 'bg-[#E5E5EA] dark:bg-slate-600'"
                    :disabled="isSaving"
                    role="switch"
                    :aria-checked="draftChatEnabled"
                    aria-labelledby="queue-audience-chat-label"
                    @click="toggleDraftChat"
                  >
                    <span
                      class="pointer-events-none block h-[27px] w-[27px] translate-x-0 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-out will-change-transform dark:bg-slate-100"
                      :class="draftChatEnabled ? 'translate-x-5' : 'translate-x-0'"
                    />
                  </button>
                </div>
              </div>
              <p
                class="m-0 mt-2 px-1.5 text-[0.8125rem] font-normal leading-[1.35] text-[#6D6D72] dark:text-slate-500"
                role="note"
              >
                Counts a guest’s <strong class="font-semibold text-[#3C3C43] dark:text-slate-400">now playing</strong> and <strong class="font-semibold text-[#3C3C43] dark:text-slate-400">upcoming</strong> requests. Use between {{ GUEST_QUEUE_ROWS_CAP_MIN }} and {{ GUEST_QUEUE_ROWS_CAP_MAX }}.
              </p>
            </div>

            <p
              v-if="isSaving"
              class="m-0 mt-3 text-center text-[0.8125rem] text-[#6D6D72] dark:text-slate-500"
            >
              Saving…
            </p>

            <div
              class="mt-auto shrink-0 border-t border-[#C6C6C8] pt-3 dark:border-slate-600"
            >
              <div class="flex w-full gap-2">
                <button
                  type="button"
                  class="min-h-11 min-w-0 flex-1 touch-manipulation rounded-[0.75rem] bg-[#E5E5EA] py-2.5 text-[1.0625rem] font-semibold text-black active:bg-[#D1D1D6] dark:bg-slate-600 dark:text-white dark:active:bg-slate-500"
                  :disabled="isSaving"
                  @click="onCancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="min-h-11 min-w-0 flex-1 touch-manipulation rounded-[0.75rem] bg-[#007AFF] py-2.5 text-[1.0625rem] font-semibold text-white active:bg-[#0062CC] dark:bg-sky-500 dark:active:bg-sky-600"
                  :disabled="isSaving"
                  @click="onSave"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
      </div>
    </Transition>
  </Teleport>
</template>
