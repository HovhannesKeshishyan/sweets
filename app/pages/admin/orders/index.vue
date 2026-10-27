<script setup lang="ts">
import { ORDER_STATUSES } from "#shared/constants";
import type { Paginated } from "#shared/schemas/common";
import type { OrderSummaryDTO } from "#shared/types/api";

definePageMeta({ layout: "admin", middleware: "admin" });
useSeoMeta({ title: "Orders · Admin", robots: "noindex, nofollow" });

const route = useRoute();
const router = useRouter();
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
const query = computed(() => ({
  q: str(route.query.q),
  status: str(route.query.status),
  page: Math.max(1, Number(route.query.page) || 1),
}));
const { data, error } = await useFetch<Paginated<OrderSummaryDTO>>(
  "/api/admin/orders",
  { query },
);

const search = ref(query.value.q ?? "");
function update(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, page: undefined } });
}
</script>

<template>
  <div>
    <AdminPageHeader
      title="Orders"
      :description="data ? `${data.total} matching` : undefined"
    />

    <div class="mb-6 flex flex-wrap gap-3">
      <form
        role="search"
        class="flex"
        @submit.prevent="update({ q: search.trim() || undefined })"
      >
        <label for="order-search" class="sr-only">Search orders</label>
        <input
          id="order-search"
          v-model="search"
          type="search"
          placeholder="Order number, name or email"
          class="field w-72 rounded-r-none"
        >
        <button
          type="submit"
          class="rounded-r-xl bg-cocoa-900 px-4 text-sm text-cream-100"
        >
          Search
        </button>
      </form>
      <div
        class="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by status"
      >
        <button
          v-for="s in [undefined, ...ORDER_STATUSES]"
          :key="s ?? 'all'"
          type="button"
          class="rounded-full border px-4 py-2 text-sm"
          :class="
            query.status === s
              ? 'border-cocoa-900 bg-cocoa-900 text-cream-100'
              : 'border-cocoa-900/15 hover:border-cocoa-900'
          "
          :aria-pressed="query.status === s"
          @click="update({ status: s })"
        >
          {{ s ? ORDER_STATUS_LABELS[s] : "All" }}
        </button>
      </div>
    </div>

    <AdminNotice v-if="error" tone="error">{{
      apiErrorMessage(error)
    }}</AdminNotice>
    <AdminCard v-else-if="data" class="!p-0">
      <p v-if="!data.items.length" class="p-6 text-sm text-cocoa-500">
        No orders match.
      </p>
      <div v-else class="overflow-x-auto">
        <table class="table-admin">
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Payment</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in data.items" :key="o.id">
              <td>
                <NuxtLink
                  :to="`/admin/orders/${o.id}`"
                  class="font-semibold hover:text-gold-600"
                  >{{ o.orderNumber }}</NuxtLink
                >
              </td>
              <td class="whitespace-nowrap">
                {{
                  new Date(o.createdAt).toLocaleString("en", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                }}
              </td>
              <td>
                {{ o.customerName
                }}<span class="block text-xs text-cocoa-500">{{
                  o.customerEmail
                }}</span>
              </td>
              <td><StatusBadge :status="o.status" /></td>
              <td><StatusBadge :status="o.paymentStatus" kind="payment" /></td>
              <td class="text-right whitespace-nowrap">
                {{ formatMoney(o.total, o.currency) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminCard>
    <PaginationNav
      v-if="data"
      :page="data.page"
      :total-pages="data.totalPages"
    />
  </div>
</template>
