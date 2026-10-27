<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 class="text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-1 text-sm text-cocoa-700">
        {{ description }}
      </p>
    </div>
    <div class="flex flex-wrap gap-3"><slot /></div>
  </div>
</template>
