<script setup lang="ts">
import type { Paginated } from "#shared/schemas/common"
import type { OrderSummaryDTO } from "#shared/types/api"

definePageMeta({ middleware: "auth" })
useSeoMeta({ title: "Your orders", robots: "noindex" })

const route = useRoute()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const { data, error } = await useFetch<Paginated<OrderSummaryDTO>>("/api/account/orders", {
  query: computed(() => ({ page: page.value, limit: 10 })),
  headers: useRequestHeaders(["cookie"]),
})
</script>

<template>
  <section class="container-page py-16">
    <NuxtLink to="/account" class="text-sm text-cocoa-700 hover:underline">← Your account</NuxtLink>
    <h1 class="mt-4 text-5xl">Your orders</h1>

    <p v-if="error" role="alert" class="mt-10 rounded-2xl bg-red-50 p-6 text-red-900">We couldn't load your orders.</p>
    <div v-else-if="data && !data.items.length" class="py-20 text-center">
      <p class="font-display text-3xl">No orders yet</p>
      <NuxtLink to="/products" class="btn-primary mt-8">Start shopping</NuxtLink>
    </div>
    <template v-else-if="data">
      <ul class="mt-10 divide-y divide-cocoa-900/10 border-y border-cocoa-900/10">
        <li v-for="order in data.items" :key="order.id">
          <NuxtLink
            :to="`/order/${order.orderNumber}`"
            class="flex flex-wrap items-center justify-between gap-4 py-5 transition hover:bg-cream-100/60 sm:px-4"
          >
            <div>
              <p class="font-semibold">{{ order.orderNumber }}</p>
              <p class="text-sm text-cocoa-500">
                {{ new Date(order.createdAt).toLocaleDateString('en', { dateStyle: 'medium' }) }} ·
                {{ order.itemCount }} {{ order.itemCount === 1 ? 'item' : 'items' }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <StatusBadge :status="order.status" />
              <span class="font-semibold">{{ formatMoney(order.total, order.currency) }}</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
      <PaginationNav :page="data.page" :total-pages="data.totalPages" />
    </template>
  </section>
</template>
