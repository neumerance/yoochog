<template>
  <div v-if="sessionId.trim()" class="shrink-0 p-3 text-indigo-950 sm:p-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div class="min-w-0 flex-1">
        <h2 class="text-lg font-semibold leading-snug text-indigo-950 sm:text-xl">Join in from your phone</h2>
        <p class="mt-2 text-base leading-relaxed text-indigo-900/90">
          Scan with a phone camera or QR app—opens this sing-along in the browser, no signup.
        </p>
      </div>
      <div class="flex shrink-0 justify-center sm:justify-end">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          width="192"
          height="192"
          class="h-48 w-48 max-w-full rounded-md bg-white"
          alt="QR code to join this sing-along from a phone"
        />
        <p v-else-if="qrError" class="max-w-[12rem] text-center text-base leading-snug text-red-700">
          {{ qrError }}
        </p>
        <p
          v-else
          class="flex h-48 w-48 items-center justify-center text-base text-slate-500"
          aria-live="polite"
        >
          Preparing QR…
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCode from 'qrcode'
import { computed, ref, watch } from 'vue'

import { buildGuestJoinUrlFromEnv } from '@/lib/join-url/buildGuestJoinUrl'

const props = defineProps<{
  sessionId: string
}>()

const guestJoinUrl = computed(() => {
  const id = props.sessionId.trim()
  if (!id) {
    return ''
  }
  return buildGuestJoinUrlFromEnv(id)
})

const qrDataUrl = ref<string | null>(null)
const qrError = ref<string | null>(null)

watch(
  guestJoinUrl,
  async (url) => {
    if (!url) {
      qrDataUrl.value = null
      qrError.value = null
      return
    }
    qrError.value = null
    try {
      qrDataUrl.value = await QRCode.toDataURL(url, {
        width: 192,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch {
      qrDataUrl.value = null
      qrError.value = 'QR failed - refresh the page.'
    }
  },
  { immediate: true },
)
</script>
