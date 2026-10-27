<script setup lang="ts">
import type { AdminProductDTO } from "#shared/types/api";

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "New product · Admin", robots: "noindex, nofollow" });

function onSaved(product: AdminProductDTO) {
  navigateTo(`/admin/products/${product.id}`);
}
</script>

<template>
  <div>
    <NuxtLink
      to="/admin/products"
      class="text-sm text-cocoa-700 hover:underline"
      >← Products</NuxtLink
    >
    <AdminPageHeader title="New product" class="mt-3" />
    <AdminProductForm @saved="onSaved" />
  </div>
</template>
