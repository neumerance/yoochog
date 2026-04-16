<template>
  <div
    v-if="sessionId.trim()"
    class="shrink-0 rounded border border-slate-200 bg-slate-50/90 p-1.5 text-slate-800"
  >
    <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
      <div class="min-w-0 flex-1">
        <h2 class="text-[11px] font-semibold leading-tight text-slate-800">Guests join here</h2>
        <p class="mt-0.5 text-[10px] leading-tight text-slate-600">
          Scan with the phone camera or a QR app to open the join page.
        </p>
      </div>
      <div class="flex shrink-0 justify-center sm:justify-end">
        <img
          v-if="qrDataUrl"
          :src="qrDataUrl"
          width="112"
          height="112"
          class="h-[112px] w-[112px] max-w-full bg-white"
          alt="QR code to join this sing-along session"
        />
        <p v-else-if="qrError" class="max-w-[112px] text-center text-[10px] leading-tight text-red-700">
          {{ qrError }}
        </p>
        <p v-else class="flex h-[112px] w-[112px] items-center justify-center text-[10px] text-slate-500" aria-live="polite">
          Preparing…
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
        width: 112,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
    } catch {
      qrDataUrl.value = null
      qrError.value = 'QR failed - refresh.'
    }
  },
  { immediate: true },
)
</script>
