<template>
  <div
    class="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-900/95 p-4 text-center text-slate-100"
  >
    <p class="text-lg font-semibold tracking-tight">{{ title }}</p>
    <p class="text-sm text-slate-300 max-w-sm">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant: 'empty' | 'ended'
}>()

const title = computed(() =>
  props.variant === 'empty' ? 'Nothing queued yet' : "That's the whole set",
)

const subtitle = computed(() =>
  props.variant === 'empty'
    ? 'Add a song when you’re ready — we’ll wait here.'
    : 'The queue has finished. Add more when you’re ready.',
)
</script>
