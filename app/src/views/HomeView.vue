<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

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
  <section class="max-w-2xl mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-slate-900 mb-2">Yoochog</h1>
    <div
      v-if="showMigrationNotice"
      class="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
      role="status"
    >
      <p class="mb-2">
        Guest access has moved to
        <strong>Join</strong>
        links (<code class="rounded bg-amber-100 px-1 py-0.5 text-xs">/join/…</code>).
      </p>
      <button
        type="button"
        class="text-amber-900 underline underline-offset-2 hover:text-amber-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 rounded-sm"
        @click="dismissMigrationNotice"
      >
        Dismiss
      </button>
    </div>
    <p class="text-slate-600 mb-6">
      Shell app is running. Use the links below or the top navigation to open routes without typing URLs.
    </p>
    <ul class="flex flex-wrap gap-4 text-sm">
      <li>
        <RouterLink
          class="text-blue-700 hover:text-blue-800 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-sm"
          to="/player"
        >
          Open Player
        </RouterLink>
      </li>
      <li>
        <RouterLink
          class="text-blue-700 hover:text-blue-800 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-sm"
          to="/join/demo"
        >
          Open Join (demo id)
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
