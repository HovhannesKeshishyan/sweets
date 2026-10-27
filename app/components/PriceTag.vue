<script setup lang="ts">
const props = defineProps<{
  price: number;
  compareAtPrice?: number | null;
  size?: "sm" | "lg";
}>();
const { money } = useStore();
const onSale = computed(
  () => props.compareAtPrice != null && props.compareAtPrice > props.price,
);
</script>

<template>
  <p
    class="flex items-baseline gap-2"
    :class="size === 'lg' ? 'text-2xl' : 'text-base'"
  >
    <span class="font-semibold text-cocoa-900">
      <span v-if="onSale" class="sr-only">Sale price</span>{{ money(price) }}
    </span>
    <s v-if="onSale" class="text-sm text-cocoa-500">
      <span class="sr-only">Was</span>{{ money(compareAtPrice!) }}
    </s>
  </p>
</template>
