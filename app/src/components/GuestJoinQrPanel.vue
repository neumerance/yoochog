<template>
  <div
    v-if="sessionId.trim()"
    class="shrink-0 p-[clamp(0.65rem,calc(0.4rem_+_1.1vmin_+_0.35vw),1.75rem)]"
  >
    <div
      class="flex flex-col gap-[clamp(0.75rem,calc(0.45rem_+_1.35vmin_+_0.35vw),1.5rem)] text-left @min-[720px]:flex-row @min-[720px]:items-start @min-[720px]:justify-between @min-[720px]:gap-[clamp(1rem,calc(0.55rem_+_1.65vmin_+_0.45vw),2.5rem)]"
    >
      <div class="flex min-w-0 w-full flex-col items-start gap-[clamp(0.5rem,calc(0.3rem_+_1vmin_+_0.25vw),1rem)] @min-[720px]:flex-1">
        <img
          :src="logoUrl"
          alt="Yoochog"
          class="h-auto max-h-[min(28vmin,13rem)] w-auto max-w-[min(100%,min(52vmin,78vw),26rem)] shrink-0 self-start object-contain object-left"
          decoding="async"
        />
        <h2
          class="w-full font-semibold leading-tight text-indigo-950 text-[length:clamp(0.825rem,calc(0.363rem_+_1.815vmin_+_0.231vw),3.3rem)] dark:text-indigo-100"
        >
          Join in from your phone
        </h2>
        <p
          class="w-full leading-relaxed text-indigo-900/90 text-[length:clamp(0.66rem,calc(0.297rem_+_1.551vmin_+_0.198vw),2.31rem)] dark:text-slate-300"
        >
          Scan with a phone camera or QR app—opens this sing-along in the browser, no signup.
        </p>
      </div>
      <div
        class="flex w-full min-w-0 shrink-0 flex-col items-center gap-[clamp(0.65rem,calc(0.4rem_+_1.1vmin_+_0.35vw),1.25rem)] @min-[720px]:w-[min(27rem,min(88vmin,72vw))] @min-[720px]:shrink-0"
      >
        <div
          v-if="qrDataUrl"
          class="relative mx-auto inline-block aspect-square w-[clamp(10rem,min(100%,calc(12vmin_+_9vw)),36rem)] max-w-full"
        >
          <img
            :src="qrDataUrl"
            :width="qrBitmapSize"
            :height="qrBitmapSize"
            class="block h-full w-full rounded-md bg-white object-contain"
            alt="QR code to join this sing-along from a phone"
          />
          <div
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div
              class="rounded-lg bg-white p-[clamp(0.2rem,calc(0.12rem_+_0.45vmin_+_0.12vw),0.5rem)] shadow-sm ring-1 ring-black/5"
            >
              <img
                :src="logoUrl"
                alt=""
                class="object-contain h-[clamp(2rem,calc(1rem_+_3.25vmin_+_0.5vw),4.5rem)] w-[clamp(2rem,calc(1rem_+_3.25vmin_+_0.5vw),4.5rem)]"
                decoding="async"
              />
            </div>
          </div>
        </div>
        <p
          v-else-if="qrError"
          class="w-full text-center leading-snug text-red-700 text-[length:clamp(1rem,calc(0.45rem_+_2.35vmin_+_0.3vw),3.5rem)]"
        >
          {{ qrError }}
        </p>
        <p
          v-else
          class="flex aspect-square w-[clamp(10rem,min(100%,calc(12vmin_+_9vw)),36rem)] max-w-full items-center justify-center text-center text-slate-500 text-[length:clamp(1rem,calc(0.45rem_+_2.35vmin_+_0.3vw),3.25rem)] dark:text-slate-400"
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

import logoUrl from '@/assets/images/logo/logo.png'
import { buildGuestJoinUrlFromEnv } from '@/lib/join-url/buildGuestJoinUrl'

/** Large enough for fluid QR display on wide TVs (bitmap is square; CSS scales down). */
const qrBitmapSize = 512

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
        width: qrBitmapSize,
        margin: 2,
        /* High correction so the center logo overlay still scans */
        errorCorrectionLevel: 'H',
      })
    } catch {
      qrDataUrl.value = null
      qrError.value = 'QR failed - refresh the page.'
    }
  },
  { immediate: true },
)
</script>
