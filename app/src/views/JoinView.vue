<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useGuestPartyHandshake } from '@/composables/useGuestPartyHandshake'
import { guestSessionIdFromRouteParam } from '@/lib/signaling/guestSessionId'

const route = useRoute()
const sessionId = computed(() => guestSessionIdFromRouteParam(String(route.params.sessionId ?? '')))

const { statusLabel, error: handshakeError, isSignalingConfigured } = useGuestPartyHandshake(sessionId)
</script>

<template>
  <section class="mx-auto max-w-2xl px-4 py-10">
    <h1 class="mb-3 text-2xl font-bold text-slate-900">Join</h1>
    <p class="leading-relaxed text-slate-600">
      Placeholder for the guest experience. Session id from the URL:
      <code class="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{{ sessionId }}</code>
    </p>

    <div
      class="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
      aria-live="polite"
    >
      <template v-if="isSignalingConfigured">
        <p v-if="statusLabel">{{ statusLabel }}</p>
        <p v-if="handshakeError" class="mt-1 text-red-800">{{ handshakeError }}</p>
      </template>
      <p v-else class="text-slate-600">
        Real-time link is off until you set PubNub keys or
        <code class="rounded bg-slate-200 px-1">VITE_SIGNALING_URL</code> (see app README).
      </p>
    </div>
  </section>
</template>
