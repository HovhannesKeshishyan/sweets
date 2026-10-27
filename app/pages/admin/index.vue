<script setup lang="ts">
import type { DashboardStatsDTO } from "#shared/types/api";

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Admin dashboard", robots: "noindex, nofollow" });

const {
  data: stats,
  error,
  refresh,
} = await useFetch<DashboardStatsDTO>("/api/admin/stats");
const money = (minor: number) =>
  formatMoney(minor, stats.value?.currency ?? "USD");

const tiles = computed(() => {
  const s = stats.value;
  if (!s) return [];
  return [
    {
      label: "Order value (30 days)",
      value: money(s.orderValue.last30Days),
      sub: `${money(s.orderValue.total)} all time`,
    },
    {
      label: "Orders (30 days)",
      value: String(s.orders.last30Days),
      sub: `${s.orders.total} all time`,
    },
    {
      label: "Awaiting fulfillment",
      value: String(s.orders.byStatus.pending + s.orders.byStatus.processing),
      sub: `${s.orders.byStatus.pending} new`,
    },
    {
      label: "Customers",
      value: String(s.customers.total),
      sub: `+${s.customers.last30Days} in 30 days`,
    },
    {
      label: "Active products",
      value: String(s.products.active),
      sub: `${s.products.draft} draft · ${s.products.archived} archived`,
    },
    {
      label: "Stock alerts",
      value: String(s.products.lowStock + s.products.outOfStock),
      sub: `${s.products.outOfStock} sold out`,
    },
  ];
});
</script>

<template>
  <div>
    <AdminPageHeader
      title="Dashboard"
      description="Order value counts placed orders (excluding cancelled); payments aren't collected online yet."
    >
      <button type="button" class="btn-outline" @click="() => refresh()">
        Refresh
      </button>
    </AdminPageHeader>

    <AdminNotice v-if="error" tone="error"
      >Couldn't load statistics. {{ apiErrorMessage(error) }}</AdminNotice
    >

    <template v-else-if="stats">
      <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <li v-for="tile in tiles" :key="tile.label">
          <AdminCard>
            <p
              class="text-xs font-semibold tracking-wide text-cocoa-500 uppercase"
            >
              {{ tile.label }}
            </p>
            <p class="mt-2 font-display text-4xl">{{ tile.value }}</p>
            <p class="mt-1 text-xs text-cocoa-500">{{ tile.sub }}</p>
          </AdminCard>
        </li>
      </ul>

      <div class="mt-8 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <AdminCard>
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-2xl">Recent orders</h2>
            <NuxtLink
              to="/admin/orders"
              class="text-sm font-semibold text-gold-600 hover:underline"
              >All orders →</NuxtLink
            >
          </div>
          <p v-if="!stats.recentOrders.length" class="text-sm text-cocoa-500">
            No orders yet.
          </p>
          <div v-else class="-mx-6 overflow-x-auto">
            <table class="table-admin">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="o in stats.recentOrders" :key="o.id">
                  <td>
                    <NuxtLink
                      :to="`/admin/orders/${o.id}`"
                      class="font-semibold hover:text-gold-600"
                      >{{ o.orderNumber }}</NuxtLink
                    >
                  </td>
                  <td>{{ o.customerName }}</td>
                  <td><StatusBadge :status="o.status" /></td>
                  <td class="text-right">
                    {{ formatMoney(o.total, o.currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </AdminCard>

        <AdminCard>
          <h2 class="mb-4 text-2xl">Low stock</h2>
          <p
            v-if="!stats.lowStockProducts.length"
            class="text-sm text-cocoa-500"
          >
            Everything is well stocked.
          </p>
          <ul v-else class="divide-y divide-cocoa-900/10 text-sm">
            <li
              v-for="p in stats.lowStockProducts"
              :key="p.id"
              class="flex items-center justify-between py-2.5"
            >
              <NuxtLink
                :to="`/admin/products/${p.id}`"
                class="hover:text-gold-600"
                >{{ p.name }}</NuxtLink
              >
              <span
                class="font-semibold"
                :class="p.stock === 0 ? 'text-red-800' : 'text-gold-600'"
              >
                {{ p.stock === 0 ? "Sold out" : `${p.stock} left` }}
              </span>
            </li>
          </ul>
        </AdminCard>
      </div>
    </template>
  </div>
</template>
