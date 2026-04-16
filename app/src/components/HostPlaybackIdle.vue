<template>
  <div
    class="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-900/95 p-6 text-center text-slate-100 sm:gap-5 sm:p-8"
  >
    <p class="text-2xl font-semibold tracking-tight sm:text-3xl">{{ title }}</p>
    <p class="max-w-lg text-lg leading-relaxed text-slate-300 sm:text-xl">{{ subtitle }}</p>
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
