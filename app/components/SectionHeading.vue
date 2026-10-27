<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  to?: string;
  linkLabel?: string;
}>();
</script>

<template>
  <div class="mb-10 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h2 class="mt-2 text-4xl sm:text-5xl">{{ title }}</h2>
    </div>
    <NuxtLink
      v-if="to"
      :to="to"
      class="text-sm font-semibold text-cocoa-800 underline-offset-4 hover:text-gold-600 hover:underline"
    >
      {{ linkLabel ?? "View all" }} →
    </NuxtLink>
  </div>
</template>
