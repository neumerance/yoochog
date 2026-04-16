<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-slate-200 bg-white">
      <nav
        class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap gap-x-6 gap-y-2 text-sm"
        aria-label="Primary"
      >
        <RouterLink
          class="text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-sm"
          to="/"
        >
          Home
        </RouterLink>
        <RouterLink
          class="text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-sm"
          to="/player"
        >
          Player
        </RouterLink>
        <RouterLink
          class="text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 rounded-sm"
          to="/join/demo"
        >
          Join
        </RouterLink>
      </nav>
    </header>
    <main class="flex-1">
      <RouterView />
    </main>
  </div>
</template>
