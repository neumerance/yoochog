<template>
  <Transition name="host-splash-root" @after-leave="emit('complete')">
    <div
      v-if="layerVisible"
      class="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white px-[clamp(0.75rem,min(5vmin,5vw),4rem)]"
      role="presentation"
      aria-hidden="true"
    >
      <!-- Same viewport-fluid bounds as HostPlaybackIdle logo (TV / ultrawide). -->
      <img
        :src="logoUrl"
        alt=""
        class="host-splash-logo h-auto w-auto min-h-0 min-w-0 max-h-[min(62.4vmin,59.8vh)] max-w-[min(78vw,80.6vmin,100%)] shrink-0 select-none object-contain object-center"
        decoding="async"
      />
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import logoUrl from '@/assets/images/logo/yoochoog.png'

const emit = defineEmits<{
  complete: []
}>()

const layerVisible = ref(true)

let dismissTimer: number | null = null

function clearDismissTimer() {
  if (dismissTimer !== null) {
    window.clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

onMounted(() => {
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const introMs = reduced ? 0 : 850
  const holdMs = reduced ? 200 : 1500
  const totalBeforeExit = introMs + holdMs

  dismissTimer = window.setTimeout(() => {
    dismissTimer = null
    layerVisible.value = false
  }, totalBeforeExit)
})

onBeforeUnmount(() => {
  clearDismissTimer()
})
</script>

<style scoped>
.host-splash-logo {
  animation: host-splash-logo-in 850ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@media (prefers-reduced-motion: reduce) {
  .host-splash-logo {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
