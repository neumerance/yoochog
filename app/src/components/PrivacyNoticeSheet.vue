<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'

import { savePrivacyNoticeDismissed } from '@/lib/privacy/privacyNoticeDismissed'

const dialogRef = useTemplateRef('dialogRef')
const gotItButtonRef = useTemplateRef('gotItButtonRef')

function onDialogClose() {
  savePrivacyNoticeDismissed()
}

function dismiss() {
  dialogRef.value?.close()
}

function open() {
  dialogRef.value?.showModal()
  void nextTick(() => gotItButtonRef.value?.focus())
}

defineExpose({ open })
</script>

<template>
  <dialog
    id="privacy-notice-dialog"
    ref="dialogRef"
    class="fixed inset-0 z-[220] m-0 box-border h-full max-h-full w-full max-w-none border-0 bg-transparent p-0 [&::backdrop]:bg-black/40 [&::backdrop]:backdrop-blur-[2px]"
    aria-labelledby="privacy-notice-title"
    aria-modal="true"
    @click.self="dismiss"
    @close="onDialogClose"
  >
    <div
      class="absolute inset-x-0 bottom-0 mx-auto flex max-h-[min(90dvh,36rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[#F2F2F7] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-4 text-black shadow-[0_-4px_24px_rgba(0,0,0,0.12)] sm:pt-5"
      @click.stop
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
            Yoochog saves helpful information—such as your guest display name, party session details,
            and what’s in the song queue—<strong class="font-semibold text-black">only in this browser on this device</strong>.
            It isn’t stored in a Yoochog account for you, and it doesn’t sync to your other phones or
            computers.
          </p>
          <p>
            If you <strong class="font-semibold text-black">clear this site’s data</strong> or
            <strong class="font-semibold text-black">clear your browser’s stored data</strong>, that
            saved information—including session and queue details—<strong class="font-semibold text-black"
              >will be removed</strong
            >. You may need to join again, or the list may refresh once you reconnect to the party.
          </p>
        </div>
      </div>
      <div class="mt-4 shrink-0 border-t border-[#C6C6C8] pt-3">
        <button
          ref="gotItButtonRef"
          type="button"
          class="flex min-h-[44px] w-full items-center justify-center rounded-[10px] bg-[#FF3B30] px-4 text-[17px] font-semibold leading-[22px] text-white shadow-sm transition-colors active:bg-[#D70015] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF3B30]"
          @click="dismiss"
        >
          Got it
        </button>
      </div>
    </div>
  </dialog>
</template>
