<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import GuestShell from '@/components/GuestShell.vue'

const route = useRoute()
const router = useRouter()
const showMigrationNotice = ref(route.query.migrated === 'client')

watch(
  () => route.query.migrated,
  (migrated) => {
    if (migrated === 'client') {
      showMigrationNotice.value = true
    }
  },
)

function dismissMigrationNotice() {
  showMigrationNotice.value = false
  if (route.query.migrated === 'client') {
    router.replace({ path: '/', query: {} })
  }
}
</script>

<template>
  <GuestShell>
    <h1 class="mb-2 text-2xl font-bold text-slate-900">Yoochog</h1>
    <div
      v-if="showMigrationNotice"
      class="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-base leading-relaxed text-amber-950"
      role="status"
    >
      <p class="mb-4">
        Guest access has moved to
        <strong>Join</strong>
        links (<code class="rounded bg-amber-100 px-1 py-0.5 text-sm">/join/…</code>).
      </p>
      <button
        type="button"
        class="inline-flex min-h-11 min-w-[8rem] items-center justify-center rounded-md border border-amber-300 bg-amber-100/80 px-4 text-base font-semibold text-amber-950 hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700"
        @click="dismissMigrationNotice"
      >
        Dismiss
      </button>
    </div>
    <p class="mb-6 text-base text-slate-600">
      Shell app is running. Use the links below or the top navigation to open routes without typing URLs.
    </p>
    <ul class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <li class="min-w-0 flex-1 sm:flex-none">
        <RouterLink
          class="flex min-h-11 w-full items-center justify-center rounded-md border border-blue-200 bg-white px-4 text-center text-base font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:w-auto"
          to="/player"
        >
          Open Player
        </RouterLink>
      </li>
      <li class="min-w-0 flex-1 sm:flex-none">
        <RouterLink
          class="flex min-h-11 w-full items-center justify-center rounded-md border border-blue-200 bg-white px-4 text-center text-base font-semibold text-blue-800 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:w-auto"
          to="/join/demo"
        >
          Open Join (demo id)
        </RouterLink>
      </li>
    </ul>
  </GuestShell>
</template>
