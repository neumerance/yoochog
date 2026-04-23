<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import {
  dismissPlayerHelpTipForSession,
  pickActivePlayerHelpTip,
  readDismissedPlayerHelpTipIds,
  resolvePlayerHelpTipMessage,
  type PlayerHelpTipContext,
} from '@/lib/playerHelpTips'

const props = defineProps<{
  context: PlayerHelpTipContext
}>()

/** Session dismissals — refreshed when tip is dismissed. */
const dismissed = ref<Set<string>>(new Set())

onMounted(() => {
  dismissed.value = readDismissedPlayerHelpTipIds()
})

const activeTip = computed(() => pickActivePlayerHelpTip(props.context, dismissed.value))
const activeTipMessage = computed(() => {
  const t = activeTip.value
  if (!t) {
    return ''
  }
  return resolvePlayerHelpTipMessage(t, props.context)
})

function applyDismissId(id: string) {
  dismissPlayerHelpTipForSession(id)
  dismissed.value = readDismissedPlayerHelpTipIds()
}

function onDismiss() {
  const id = activeTip.value?.id
  if (!id) {
    return
  }
  applyDismissId(id)
}
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-300 ease-out motion-reduce:transition-none"
    leave-active-class="transition-opacity duration-200 ease-in motion-reduce:transition-none"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-if="activeTip"
      class="pointer-events-none absolute bottom-0 right-0 z-[30] flex max-w-[min(48vw,26.25rem)] items-end justify-end p-[clamp(0.35rem,calc(0.2rem_+_0.65vmin_+_0.15vw),0.85rem)] [padding-bottom:max(0.35rem,calc(0.2rem_+_0.65vmin_+_0.15vw),env(safe-area-inset-bottom,0px))]"
      role="status"
      aria-live="polite"
    >
      <div
        class="pointer-events-auto flex max-w-full cursor-pointer items-start gap-[clamp(0.2rem,calc(0.12rem_+_0.35vmin_+_0.1vw),0.45rem)] rounded-md border border-white/15 bg-slate-950/78 px-[clamp(0.35rem,calc(0.22rem_+_0.55vmin_+_0.14vw),0.65rem)] py-[clamp(0.28rem,calc(0.18rem_+_0.45vmin_+_0.12vw),0.5rem)] shadow-lg backdrop-blur-[2px] supports-[backdrop-filter]:bg-slate-950/65"
        role="group"
        aria-label="Player help; click the card or the close control to hide this tip for the session"
        @click="onDismiss"
      >
        <div
          class="min-w-0 flex-1 text-left font-medium leading-snug text-slate-100/95 text-[length:clamp(0.66rem,calc(0.24rem_+_1.32vmin_+_0.216vw),1.62rem)]"
        >
          <p class="m-0">{{ activeTipMessage }}</p>
          <a
            v-if="activeTip.action"
            :href="activeTip.action.href"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-[0.35em] inline-flex max-w-full items-center font-semibold text-sky-300/95 underline decoration-sky-400/50 underline-offset-[0.12em] transition-colors hover:text-sky-200 hover:decoration-sky-300/80 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300/70"
            @click.stop
          >
            {{ activeTip.action.label }}
          </a>
        </div>
        <button
          type="button"
          class="mt-[0.06em] inline-flex size-[clamp(1.38rem,calc(0.66rem_+_1.8vmin_+_0.42vw),1.98rem)] shrink-0 items-center justify-center rounded text-slate-300/90 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50"
          aria-label="Dismiss tip"
          @click.stop="onDismiss"
        >
          <span class="sr-only">Dismiss tip</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            class="size-[0.85em] opacity-80"
            aria-hidden="true"
          >
            <path
              d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"
            />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
