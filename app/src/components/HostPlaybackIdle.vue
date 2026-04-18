<template>
  <div class="relative h-full min-h-0 min-w-0 w-full overflow-hidden bg-black">
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-[clamp(0.65rem,0.45rem+1vmin,1.25rem)] bg-slate-950/60 px-[clamp(1rem,2vmin+0.75rem,3rem)] py-[clamp(1rem,2vmin,2rem)] text-center"
      role="status"
      aria-live="polite"
    >
      <img
        :src="logoUrl"
        alt=""
        class="pointer-events-none h-auto w-auto max-h-[min(84vmin,27rem)] max-w-[min(216%,42rem)] min-h-0 min-w-0 shrink-0 select-none object-contain object-center"
        decoding="async"
        aria-hidden="true"
      />
      <p
        v-if="props.variant === 'ended'"
        class="pointer-events-none max-w-[min(42rem,96%)] font-extrabold uppercase leading-tight tracking-wide text-yellow-300 [-webkit-text-stroke:2px_#000] [paint-order:stroke_fill] text-[length:clamp(1.125rem,0.55rem+2.2vmin,2.75rem)] animate-press-key-cta"
      >
        That's the whole set
      </p>
      <p
        class="pointer-events-none max-w-[min(42rem,96%)] font-extrabold uppercase leading-tight tracking-wide text-yellow-300 [-webkit-text-stroke:2px_#000] [paint-order:stroke_fill] text-[length:clamp(1.125rem,0.55rem+2.2vmin,2.75rem)] animate-press-key-cta"
      >
        <template v-if="props.variant === 'empty'">
          Scan the QR code, grab your go-to karaoke songs on YouTube, and
          <strong class="text-yellow-200">Enqueue</strong>
          to get the party rolling.
        </template>
        <template v-else>
          The queue is clear. Guests can add more anytime from the join page:
          <strong class="text-yellow-200">Add my song</strong>
          → paste a YouTube link →
          <strong class="text-yellow-200">Enqueue</strong>.
        </template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import logoUrl from '@/assets/images/logo/logo.png'

const props = defineProps<{
  variant: 'empty' | 'ended'
}>()

</script>
