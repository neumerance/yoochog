<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'

const route = useRoute()
/** Player + guest join: fixed viewport, no document scroll */
const viewportLocked = computed(() => route.name === 'player' || route.name === 'join')

watch(
  viewportLocked,
  (locked) => {
    document.body.classList.toggle('viewport-locked', locked)
  },
  { immediate: true },
)

onUnmounted(() => {
  document.body.classList.remove('viewport-locked')
})
</script>

<template>
  <div
    :class="[
      'flex flex-col',
      viewportLocked ? 'h-dvh max-h-dvh min-h-0 overflow-hidden' : 'min-h-screen',
    ]"
  >
    <main
      :class="[
        'flex flex-1 flex-col min-h-0',
        viewportLocked ? 'overflow-hidden' : '',
      ]"
    >
      <template v-if="viewportLocked">
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <RouterView />
        </div>
      </template>
      <RouterView v-else />
    </main>
  </div>
</template>
