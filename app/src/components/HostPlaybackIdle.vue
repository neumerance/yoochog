<template>
  <div class="relative h-full min-h-0 min-w-0 w-full overflow-hidden bg-black">
    <div
      class="pointer-events-none absolute inset-0 flex items-center justify-center"
      aria-hidden="true"
    >
      <img
        :src="logoUrl"
        alt=""
        class="h-auto w-auto max-h-[50%] max-w-[50%] min-h-0 min-w-0 select-none object-contain object-center"
        decoding="async"
      />
    </div>
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-[clamp(0.65rem,0.45rem+1.2vmin,1.5rem)] bg-slate-950/60 px-[clamp(1rem,2vmin+0.75rem,3rem)] py-[clamp(1rem,2vmin,2rem)] text-center text-slate-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.65)]"
      role="status"
      aria-live="polite"
    >
      <p
        class="max-w-[min(36rem,92%)] font-semibold tracking-tight text-[length:clamp(1.25rem,0.85rem+1.5vmin,2.25rem)]"
      >
        {{ headline }}
      </p>
      <p
        class="max-w-[min(34rem,90%)] leading-relaxed text-slate-200 text-[length:clamp(1rem,0.65rem+1.1vmin,1.75rem)]"
      >
        <template v-if="props.variant === 'empty'">
          Use the join link or QR code in the panel beside this player. Guests tap
          <strong class="font-semibold text-white">Add my song</strong>, paste a YouTube link, then
          <strong class="font-semibold text-white">Enqueue</strong>
          to fill the queue.
        </template>
        <template v-else>
          The queue is clear. Guests can add more anytime from the join page:
          <strong class="font-semibold text-white">Add my song</strong>
          → paste a YouTube link →
          <strong class="font-semibold text-white">Enqueue</strong>.
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import logoUrl from '@/assets/images/logo/logo.png'

const props = defineProps<{
  variant: 'empty' | 'ended'
}>()

const headline = computed(() =>
  props.variant === 'empty' ? 'Nothing queued yet' : "That's the whole set",
)

</script>
