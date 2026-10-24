<script setup lang="ts">
import type { AdminProductDTO } from "#shared/types/api"

definePageMeta({ layout: "admin", middleware: "admin" })

const route = useRoute()
const { data: product, error } = await useFetch<AdminProductDTO>(() => `/api/admin/products/${route.params.id}`)
useSeoMeta({ title: () => `${product.value?.name ?? "Product"} · Admin`, robots: "noindex, nofollow" })

function onSaved(updated: AdminProductDTO) {
  product.value = updated
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/products" class="text-sm text-cocoa-700 hover:underline">← Products</NuxtLink>
    <AdminNotice v-if="error" tone="error" class="mt-4">{{ apiErrorMessage(error) }}</AdminNotice>
    <template v-else-if="product">
      <AdminPageHeader :title="product.name" class="mt-3">
        <NuxtLink v-if="product.status === 'active'" :to="`/products/${product.slug}`" target="_blank" class="btn-outline">
          View in shop ↗
        </NuxtLink>
      </AdminPageHeader>
      <AdminProductForm :product="product" @saved="onSaved" />
    </template>
  </div>
</template>
