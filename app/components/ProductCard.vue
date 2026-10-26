<script setup lang="ts">
import type { ProductSummaryDTO } from "#shared/types/api";

const props = defineProps<{ product: ProductSummaryDTO; priority?: boolean }>();
const cart = useCart();
const added = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

function addToBag() {
  cart.add(props.product);
  added.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (added.value = false), 1600);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <article class="group flex flex-col h-full">
    <NuxtLink
      :to="`/products/${product.slug}`"
      class="block overflow-hidden rounded-3xl"
    >
      <ProductImage
        :image="product.image"
        :label="product.name"
        :priority="priority"
        class="aspect-[4/5] transition duration-700 ease-out group-hover:scale-[1.03]"
      />
    </NuxtLink>
    <div class="mt-4 flex flex-1 flex-col gap-1">
      <div class="flex items-center justify-between gap-3">
        <p
          v-if="product.category"
          class="text-xs tracking-wide text-cocoa-500 uppercase"
        >
          {{ product.category.name }}
        </p>
        <StockBadge :level="product.stockLevel" />
      </div>
      <h3 class="text-xl leading-snug">
        <NuxtLink
          :to="`/products/${product.slug}`"
          class="hover:text-gold-600"
          >{{ product.name }}</NuxtLink
        >
      </h3>
      <p
        v-if="product.shortDescription"
        class="line-clamp-2 text-sm text-cocoa-700"
      >
        {{ product.shortDescription }}
      </p>
      <div class="mt-auto flex items-center justify-between gap-3 pt-3">
        <PriceTag
          :price="product.price"
          :compare-at-price="product.compareAtPrice"
        />
        <button
          type="button"
          class="rounded-full border border-cocoa-900/20 px-4 py-2 text-xs font-semibold tracking-wide transition hover:border-cocoa-900 hover:bg-cocoa-900 hover:text-cream-100 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="product.maxQuantity === 0"
          :aria-label="`Add ${product.name} to bag`"
          @click="addToBag"
        >
          <span aria-live="polite">{{
            product.maxQuantity === 0 ? "Sold out" : added ? "Added ✓" : "Add"
          }}</span>
        </button>
      </div>
    </div>
  </article>
</template>
