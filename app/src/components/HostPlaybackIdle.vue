<template>
  <div class="relative h-full min-h-0 min-w-0 w-full overflow-hidden bg-black">
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-[clamp(0.75rem,min(3.2vmin,3.5vw),4rem)] bg-slate-950/60 px-[clamp(0.75rem,min(5vmin,5vw),4rem)] py-[clamp(0.75rem,min(3vmin,3.5vw),3.5rem)] text-center"
      role="status"
      aria-live="polite"
    >
      <img
        :src="logoUrl"
        alt=""
        :class="idleLogoClass"
        decoding="async"
        aria-hidden="true"
      />
      <p
        v-if="props.variant === 'ended'"
        :class="idleCopyClass"
      >
        That's the whole set
      </p>
      <p
        :class="idleCopyClass"
      >
        <template v-if="props.variant === 'empty'">
          Scan the QR code, grab your go-to karaoke songs on YouTube, and
          <strong class="text-yellow-200">Enqueue</strong>
          to get the party <strong class="text-red-500">chogging!</strong>
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
import logoUrl from '@/assets/images/logo/yoochoog.png'

const props = defineProps<{
  variant: 'empty' | 'ended'
}>()

/** Viewport-locked scaling: no fixed rem caps so TV / ultrawide match phone proportions. */
const idleLogoClass =
  'pointer-events-none h-auto w-auto max-h-[min(62.4vmin,59.8vh)] max-w-[min(78vw,80.6vmin)] min-h-0 min-w-0 shrink-0 select-none object-contain object-center'

const idleCopyClass =
  'pointer-events-none max-w-[min(78vw,92vmin,96%)] font-extrabold leading-snug text-yellow-300 [-webkit-text-stroke:0.055em_#000] [paint-order:stroke_fill] text-[length:clamp(0.6125rem,calc(2.975vmin_+_0.315vw),5.25rem)] animate-press-key-cta'

</script>
