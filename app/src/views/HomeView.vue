<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="max-w-2xl mx-auto px-4 py-10">
    <h1 class="text-2xl font-bold text-slate-900 mb-2">Yoochog</h1>
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
          to="/client"
        >
          Open Client
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
