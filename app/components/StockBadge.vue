<script setup lang="ts">
import type { StockLevel } from "#shared/types/api";

defineProps<{ level: StockLevel }>();
</script>

<template>
  <span
    v-if="level !== 'in_stock'"
    class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
    :class="
      level === 'low_stock'
        ? 'bg-gold-400/20 text-gold-600'
        : 'bg-cocoa-900/10 text-cocoa-700'
    "
  >
    {{ level === "low_stock" ? "Only a few left" : "Sold out" }}
  </span>
</template>
