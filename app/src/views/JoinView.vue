<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const sessionId = computed(() => String(route.params.sessionId ?? ''))
</script>

<template>
  <section class="max-w-2xl mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-slate-900 mb-3">Join</h1>
    <p class="text-slate-600 leading-relaxed">
      Placeholder for the guest experience. Session id from the URL:
      <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{{ sessionId }}</code>
    </p>
  </section>
</template>
