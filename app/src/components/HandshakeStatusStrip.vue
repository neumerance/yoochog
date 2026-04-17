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
          <div
            v-if="showGreen"
            class="mt-1.5 flex items-center gap-1.5 text-slate-700"
            role="status"
            aria-label="WebRTC peer connection connected"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-4 w-4 shrink-0 text-green-600"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"
              />
            </svg>
            <span class="font-medium">WebRTC</span>
          </div>
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
