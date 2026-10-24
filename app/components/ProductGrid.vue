<script setup lang="ts">
import type { ProductSummaryDTO } from '#shared/types/api'

defineProps<{ products: ProductSummaryDTO[]; columns?: 3 | 4 }>()
</script>

<template>
  <ul
    class="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2"
    :class="columns === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'"
  >
    <li v-for="(product, index) in products" :key="product.id">
      <ProductCard :product="product" :priority="index < 4" />
    </li>
  </ul>
</template>
