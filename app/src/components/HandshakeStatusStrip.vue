<script setup lang="ts">
import { computed } from 'vue'

import type { HandshakeUiState } from '@/lib/webrtc/handshakeStatus'

const props = defineProps<{
  status: HandshakeUiState
  statusLabel: string
  error: string | null
  isSignalingConfigured: boolean
}>()

const showGreen = computed(() => props.status === 'connected')
const showRedPulse = computed(
  () =>
    props.status === 'establishing_handshake' || props.status === 'connecting_signaling',
)
</script>

<template>
  <div>
    <template v-if="isSignalingConfigured">
      <div v-if="statusLabel || error" class="flex items-start gap-2">
        <span
          v-if="showRedPulse"
          class="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-red-500 animate-pulse"
          aria-hidden="true"
        />
        <span
          v-else-if="showGreen"
          class="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-green-500"
          aria-hidden="true"
        />
        <div class="min-w-0 flex-1">
          <p v-if="statusLabel">{{ statusLabel }}</p>
          <p v-if="error" class="mt-1 text-red-800">{{ error }}</p>
        </div>
      </div>
    </template>
    <p v-else class="text-slate-600">
      Real-time link is off until you set PubNub keys or
      <code class="rounded bg-slate-200 px-1">VITE_SIGNALING_URL</code> (see app README).
    </p>
  </div>
</template>
