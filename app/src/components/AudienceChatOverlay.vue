<template>
  <!--
    Issue #79: Sits above the video frame (host only). Top ~30% band; does not receive pointer events.
    Z-order: below the audio-unlock overlay (z-20) so "Press any key" stays tappable; above video.
    Reduced motion: shorter drift from host + fade-style keyframes here (see scoped CSS).
  -->
  <!--
    Highway = top 30% of the player, full width of the player stack (px-0; edge-to-edge with video).
    Lanes use flex-1 so 1–4 lines each get a fair vertical slice. Marquee clipped per lane (overflow-x-clip).
  -->
  <div
    class="pointer-events-none absolute inset-x-0 top-0 z-[15] box-border flex h-[30%] w-full flex-col overflow-hidden px-0 pb-[clamp(0.15rem,calc(0.1rem_+_0.35vmin_+_0.1vw),0.5rem)] pt-[clamp(0.35rem,calc(0.2rem_+_0.65vmin_+_0.15vw),0.85rem)]"
    aria-hidden="true"
  >
    <div
      class="flex min-h-0 w-full flex-1 flex-col gap-[clamp(0.12rem,calc(0.08rem_+_0.3vmin_+_0.08vw),0.4rem)]"
    >
      <div
        v-for="line in lines"
        :key="line.id"
        class="relative min-h-0 w-full flex-1 overflow-x-clip [container-type:inline-size]"
      >
        <!--
          Format: message - name (name plain white, 40% smaller than message → 0.6em).
          Animation uses 100cqw / -100% on this box so both move together.
        -->
        <div
          class="audience-chat-line absolute left-0 top-1/2 inline-flex w-max max-w-none flex-row flex-nowrap items-baseline whitespace-nowrap py-[0.08em] text-[length:clamp(0.6125rem,calc(2.975vmin_+_0.315vw),5.25rem)]"
          :style="lineStyle(line)"
          @animationend="emit('complete', line.id)"
        >
          <span
            class="font-extrabold leading-none tracking-wide text-yellow-300 [-webkit-text-stroke:0.05em_#000] [paint-order:stroke_fill] text-[1em]"
          >
            {{ line.text }}
          </span>
          <span class="font-normal leading-none tracking-normal text-white text-[0.6em]">
            {{ ' - ' + line.chatterName }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export type AudienceChatOverlayLine = {
  id: string
  text: string
  /** After " - "; plain white, 40% smaller than message (0.6em). */
  chatterName: string
  durationMs: number
  /** Chosen once on the host when the line is created. */
  fontFamily: string
}

defineProps<{
  lines: AudienceChatOverlayLine[]
}>()

const emit = defineEmits<{
  complete: [id: string]
}>()

function lineStyle(line: AudienceChatOverlayLine) {
  return {
    animationDuration: `${line.durationMs}ms`,
    fontFamily: line.fontFamily,
  }
}
</script>

<style scoped>
/*
  Spawn beyond the right edge of the lane (player width = 100cqw), exit past the left edge.
  `100%` in translateX refers to this element’s width (not the container).
*/
@keyframes audience-chat-drift {
  from {
    transform: translate3d(100cqw, -50%, 0);
  }
  to {
    transform: translate3d(-100%, -50%, 0);
  }
}

@keyframes audience-chat-fade {
  from {
    opacity: 0;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

.audience-chat-line {
  animation-name: audience-chat-drift;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .audience-chat-line {
    left: 50%;
    transform: translate(-50%, -50%);
    animation-name: audience-chat-fade;
    animation-timing-function: ease;
    will-change: opacity;
  }
}
</style>
