<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
const isPlayer = computed(() => route.name === 'player')

watch(
  isPlayer,
  (player) => {
    document.body.classList.toggle('player-route', player)
  },
  { immediate: true },
)

onUnmounted(() => {
  document.body.classList.remove('player-route')
})
</script>

<template>
  <div
    :class="[
      'flex flex-col',
      isPlayer ? 'h-dvh max-h-dvh min-h-0 overflow-hidden' : 'min-h-screen',
    ]"
  >
    <main
      :class="[
        'flex flex-1 flex-col min-h-0',
        isPlayer ? 'overflow-hidden' : '',
      ]"
    >
      <template v-if="isPlayer">
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RouterView />
        </div>
      </template>
      <RouterView v-else />
    </main>
  </div>
</template>
