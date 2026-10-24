<script setup lang="ts">
defineProps<{ tone?: "error" | "success" | "info" }>()
</script>

<template>
  <p
    :role="tone === 'error' ? 'alert' : 'status'"
    class="rounded-xl px-4 py-3 text-sm"
    :class="{
      'bg-red-50 text-red-900': tone === 'error',
      'bg-emerald-50 text-emerald-900': tone === 'success',
      'bg-cream-200 text-cocoa-800': !tone || tone === 'info',
    }"
  >
    <slot />
  </p>
</template>
