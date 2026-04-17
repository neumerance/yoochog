<template>
  <div v-if="sessionId.trim()" class="shrink-0 p-3 text-indigo-950 sm:p-4 xl:p-6">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 xl:gap-6"
    >
      <div class="min-w-0 flex-1">
        <h2
          class="text-lg font-semibold leading-snug text-indigo-950 sm:text-xl xl:text-[2.25rem] xl:leading-snug"
        >
          Join in from your phone
        </h2>
        <p class="mt-2 text-base leading-relaxed text-indigo-900/90 xl:mt-3 xl:text-[1.8rem] xl:leading-relaxed">
          Scan with a phone camera or QR app—opens this sing-along in the browser, no signup.
        </p>
      </div>
      <div
        class="flex w-full min-w-0 shrink-0 flex-col items-stretch gap-3 sm:w-48 sm:shrink-0"
      >
        <img
          :src="logoUrl"
          alt="Yoochog"
          class="h-auto w-full max-h-32 object-contain object-center"
          decoding="async"
        />
        <div
          v-if="qrDataUrl"
          class="relative mx-auto inline-block h-48 w-48 max-w-full sm:mx-0"
        >
          <img
            :src="qrDataUrl"
            width="192"
            height="192"
            class="block h-48 w-48 max-w-full rounded-md bg-white"
            alt="QR code to join this sing-along from a phone"
          />
          <div
            class="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div class="rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-black/5">
              <img
                :src="logoUrl"
                alt=""
                class="h-11 w-11 object-contain"
                decoding="async"
              />
            </div>
          </div>
        </div>
        <p
          v-else-if="qrError"
          class="w-full text-center text-base leading-snug text-red-700 xl:text-[1.8rem] xl:leading-snug"
        >
          {{ qrError }}
        </p>
        <p
          v-else
          class="mx-auto flex h-48 w-48 max-w-full items-center justify-center text-base text-slate-500 xl:text-[1.8rem]"
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
