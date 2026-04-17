<template>
  <div
    class="flex h-full w-full flex-col items-center justify-center gap-0 bg-slate-900/95 p-0 text-center text-slate-100"
  >
    <p class="text-2xl font-semibold tracking-tight sm:text-3xl xl:text-[3.375rem] xl:tracking-tight">
      {{ title }}
    </p>
    <p
      class="max-w-lg text-lg leading-relaxed text-slate-300 sm:text-xl xl:max-w-2xl xl:text-[2.25rem] xl:leading-relaxed"
    >
      {{ subtitle }}
    </p>
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
