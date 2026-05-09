<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { readAnalyticsConsent, saveAnalyticsConsent } from '@/lib/analytics/consent'
import { analyticsEnvFromImportMeta, getValidGtmContainerId, isAnalyticsEnvironmentEnabled } from '@/lib/analytics/env'
import { injectGoogleTagManagerOnce } from '@/lib/analytics/gtm'

const showBar = ref(false)
const envSnapshot = analyticsEnvFromImportMeta(import.meta.env)

function applyAcceptedAndInject(): void {
  const id = getValidGtmContainerId(envSnapshot.VITE_GTM_CONTAINER_ID)
  if (id) {
    injectGoogleTagManagerOnce(id)
  }
}

function onAccept(): void {
  if (!saveAnalyticsConsent('accepted')) {
    return
  }
  showBar.value = false
  applyAcceptedAndInject()
}

function onDecline(): void {
  if (!saveAnalyticsConsent('declined')) {
    return
  }
  showBar.value = false
}

onMounted(() => {
  if (!isAnalyticsEnvironmentEnabled(envSnapshot)) {
    return
  }
  const consent = readAnalyticsConsent()
  if (consent === 'accepted') {
    applyAcceptedAndInject()
    return
  }
  if (consent === 'undecided') {
    showBar.value = true
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="showBar"
      class="fixed inset-x-0 bottom-0 z-[210] flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pointer-events-none"
    >
      <div
        class="pointer-events-auto flex w-full max-w-2xl flex-col gap-3 rounded-[14px] bg-[#1C1C1E] px-4 py-3 text-[15px] leading-[1.35] text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:gap-4 sm:text-[16px]"
        role="region"
        aria-label="Optional analytics"
      >
        <p class="min-w-0 flex-1 text-[#F2F2F7]">
          Help improve Yoochog by allowing optional, anonymous usage analytics. You can decline; nothing
          is sent until you accept.
        </p>
        <div class="flex shrink-0 flex-row gap-2 sm:justify-end">
          <button
            type="button"
            class="rounded-[10px] border border-white/25 bg-transparent px-3 py-2 text-[15px] font-medium text-white sm:px-4"
            @click="onDecline"
          >
            Decline
          </button>
          <button
            type="button"
            class="rounded-[10px] bg-[#0A84FF] px-3 py-2 text-[15px] font-semibold text-white sm:px-4"
            @click="onAccept"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
