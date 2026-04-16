<template>
  <div
    v-if="sessionId.trim()"
    class="mt-3 shrink-0 rounded-md border border-slate-200 bg-slate-50/80 p-3 text-slate-800"
  >
    <h2 class="text-sm font-semibold text-slate-800">Invite guests on their phone</h2>
    <p class="mt-1 text-xs text-slate-600 leading-snug">
      Scan this code with your phone's camera or a QR app. It opens the join page for this sing-along
      session.
    </p>
    <div class="mt-3 flex justify-center">
      <img
        v-if="qrDataUrl"
        :src="qrDataUrl"
        width="200"
        height="200"
        class="h-[200px] w-[200px] max-w-full bg-white"
        alt="QR code to join this sing-along session"
      />
      <p v-else-if="qrError" class="text-xs text-red-700 text-center">{{ qrError }}</p>
      <p v-else class="text-xs text-slate-500" aria-live="polite">Preparing QR code…</p>
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
        width: 200,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch {
      qrDataUrl.value = null
      qrError.value = 'Could not create the QR code. Try refreshing the page.'
    }
  },
  { immediate: true },
)
</script>
