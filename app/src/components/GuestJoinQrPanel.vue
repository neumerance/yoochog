<template>
  <div v-if="sessionId.trim()" class="shrink-0 p-3 @min-[300px]:p-4 @min-[500px]:p-5">
    <div
      class="flex flex-col gap-4 text-left @min-[500px]:gap-5 @min-[720px]:flex-row @min-[720px]:items-start @min-[720px]:justify-between @min-[720px]:gap-6 @min-[840px]:gap-8"
    >
      <div class="flex min-w-0 w-full flex-col items-start gap-3 @min-[720px]:flex-1">
        <img
          :src="logoUrl"
          alt="Yoochog"
          class="h-auto max-h-24 w-auto max-w-[12rem] shrink-0 self-start object-contain object-left @min-[500px]:max-h-28 @min-[500px]:max-w-[14rem]"
          decoding="async"
        />
        <h2
          class="w-full text-lg font-semibold leading-snug text-indigo-950 @min-[300px]:text-xl @min-[500px]:text-2xl"
        >
          Join in from your phone
        </h2>
        <p
          class="w-full text-sm leading-relaxed text-indigo-900/90 @min-[300px]:text-base @min-[500px]:text-[1.0625rem]"
        >
          Scan with a phone camera or QR app—opens this sing-along in the browser, no signup.
        </p>
      </div>
      <div
        class="flex w-full min-w-0 shrink-0 flex-col items-center gap-3 @min-[500px]:gap-4 @min-[720px]:w-[20.8rem] @min-[720px]:shrink-0 @min-[840px]:w-[20.8rem]"
      >
        <div
          v-if="qrDataUrl"
          class="relative mx-auto inline-block aspect-square w-[clamp(11.05rem,min(90%,47cqi),20.8rem)] max-w-full"
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
              class="rounded-lg bg-white p-1 shadow-sm ring-1 ring-black/5 @min-[500px]:p-1.5"
            >
              <img
                :src="logoUrl"
                alt=""
                class="h-[clamp(2.6rem,11.7cqi,3.575rem)] w-[clamp(2.6rem,11.7cqi,3.575rem)] object-contain"
                decoding="async"
              />
            </div>
          </div>
        </div>
        <p
          v-else-if="qrError"
          class="w-full text-center text-sm leading-snug text-red-700 @min-[300px]:text-base @min-[500px]:text-lg"
        >
          {{ qrError }}
        </p>
        <p
          v-else
          class="flex aspect-square w-[clamp(11.05rem,min(90%,47cqi),20.8rem)] max-w-full items-center justify-center text-center text-sm text-slate-500 @min-[300px]:text-base"
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

import logoUrl from '@/assets/images/logo/yoohchog-logo-v1.png'
import { buildGuestJoinUrlFromEnv } from '@/lib/join-url/buildGuestJoinUrl'

/** Bitmap edge length; ~1.3× prior 384px for larger on-screen QR. */
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
