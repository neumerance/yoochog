<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'

import { savePrivacyNoticeDismissed } from '@/lib/privacy/privacyNoticeDismissed'

const emit = defineEmits<{
  /** Fired after the user dismisses the sheet (Agree, backdrop, or Escape). */
  dismissed: []
}>()

const isOpen = ref(false)
const agreeButtonRef = ref<HTMLButtonElement | null>(null)

let removeEscapeListener: (() => void) | null = null

function dismiss() {
  savePrivacyNoticeDismissed()
  isOpen.value = false
  emit('dismissed')
}

function open() {
  isOpen.value = true
  void nextTick(() => agreeButtonRef.value?.focus())
}

watch(isOpen, (open) => {
  removeEscapeListener?.()
  removeEscapeListener = null
  if (!open) {
    return
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      dismiss()
    }
  }
  document.addEventListener('keydown', onKey)
  removeEscapeListener = () => document.removeEventListener('keydown', onKey)
})

onUnmounted(() => {
  removeEscapeListener?.()
})

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      id="privacy-notice-dialog"
      class="fixed inset-0 z-[220] flex h-full max-h-full w-full max-w-none items-center justify-center border-0 bg-black/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-labelledby="privacy-notice-title"
      aria-modal="true"
      tabindex="-1"
      @click.self="dismiss"
    >
      <div
        class="flex max-h-[min(90dvh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-[14px] bg-[#F2F2F7] px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] text-black shadow-[0_1px_4px_rgba(0,0,0,0.12)] sm:px-3 sm:pt-4"
      >
        <div class="min-h-0 flex-1 overflow-y-auto px-1 sm:px-2">
          <h2
            id="privacy-notice-title"
            class="text-center text-[17px] font-semibold leading-[22px] tracking-[-0.41px] text-black"
          >
            Privacy & your data
          </h2>
          <div class="mt-3 space-y-3 text-[15px] leading-[1.4] text-[#3C3C43] sm:text-[16px] sm:leading-[1.45]">
            <p>
              Yoochog saves helpful information—such as your guest display name, your jukebox / karaoke
              session details, and what’s in the song queue—<strong
                class="font-semibold text-black"
              >only in this browser on this device</strong>.
              It isn’t stored in a Yoochog account for you, and it doesn’t sync to your other phones or
              computers.
            </p>
            <p>
              If you <strong class="font-semibold text-black">clear this site’s data</strong> or
              <strong class="font-semibold text-black">clear your browser’s stored data</strong>, that
              saved information—including session and queue details—<strong class="font-semibold text-black"
                >will be removed</strong
              >. You may need to join again, or the list may refresh once you reconnect to the session.
            </p>
          </div>
        </div>
        <div class="mt-4 shrink-0 border-t border-[#C6C6C8] pt-3">
          <button
            ref="agreeButtonRef"
            type="button"
            class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-[#FF3B30] px-4 text-[17px] font-semibold leading-[22px] text-white shadow-sm transition-colors active:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
            @click="dismiss"
          >
            Agree
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
