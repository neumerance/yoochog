<template>
  <div
    class="flex h-full w-full flex-col items-center justify-center gap-[clamp(0.75rem,0.5rem+1vmin,1.75rem)] bg-slate-900/95 px-[clamp(1rem,2vmin+0.75rem,3rem)] py-0 text-center text-slate-100"
  >
    <p
      class="max-w-[min(42rem,92%)] font-semibold tracking-tight text-[length:clamp(1.75rem,1.1rem+2.2vmin,4.5rem)]"
    >
      {{ title }}
    </p>
    <p
      class="max-w-[min(36rem,88%)] leading-relaxed text-slate-300 text-[length:clamp(1.125rem,0.7rem+1.35vmin,2.75rem)]"
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
