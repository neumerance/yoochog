<script setup lang="ts">
withDefaults(
  defineProps<{
    iconClass?: string
  }>(),
  {
    iconClass: 'h-5 w-5 shrink-0',
  },
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    :class="iconClass"
  >
    <rect width="6" height="11" x="9" y="2" rx="3" />
    <path d="M19 10v1a7 7 0 1 1-14 0v-1M12 18v4M8 22h8" />
  </svg>
</template>
