<script setup lang="ts">
import { computed } from 'vue'

import type { HandshakeUiState } from '@/lib/realtime/handshakeStatus'

const props = defineProps<{
  status: HandshakeUiState
  statusLabel: string
  isSignalingConfigured: boolean
}>()

const showGreen = computed(() => props.status === 'connected')

const showConnectingPulse = computed(
  () =>
    props.status === 'connecting_signaling' ||
    props.status === 'establishing_handshake' ||
    props.status === 'reconnecting',
)

/**
 * Failed, or idle when the label is the default “Offline” (not a join-only override like “Set your nickname…”).
 */
const showOfflineBlip = computed(
  () =>
    props.status === 'failed' ||
    (props.status === 'idle' && props.statusLabel === 'Offline'),
)
</script>

<template>
  <div class="min-w-0 max-w-full">
    <template v-if="isSignalingConfigured">
      <div v-if="statusLabel" class="flex min-w-0 items-center gap-[0.325rem]">
        <span
          v-if="showConnectingPulse"
          class="inline-block size-[0.40625rem] shrink-0 rounded-full bg-amber-500 animate-pulse"
          aria-hidden="true"
        />
        <span
          v-else-if="showGreen"
          class="inline-block size-[0.40625rem] shrink-0 rounded-full bg-green-500"
          aria-hidden="true"
        />
        <span v-else-if="showOfflineBlip" class="relative inline-flex size-[0.40625rem] shrink-0" aria-hidden="true">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"
          />
          <span class="relative inline-flex size-[0.40625rem] rounded-full bg-red-500" />
        </span>
        <div class="min-w-0 flex-1">
          <p role="status">
            <template v-if="showConnectingPulse">
              <span class="inline-flex items-baseline gap-0 whitespace-nowrap">
                <span>Connecting</span>
                <span class="handshake-connecting-ellipsis" aria-hidden="true">...</span>
              </span>
            </template>
            <template v-else>{{ statusLabel }}</template>
          </p>
        </div>
      </div>
    </template>
    <p v-else class="text-slate-600 dark:text-slate-300">
      Real-time link is off until you set
      <code class="rounded bg-slate-200 px-1 dark:bg-slate-700 dark:text-slate-100">VITE_SOCKET_URL</code>
      (Socket.io; see app README).
    </p>
  </div>
</template>
