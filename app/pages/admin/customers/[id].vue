<script setup lang="ts">
import type { CustomerDTO, OrderSummaryDTO } from '#shared/types/api'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const { data, error } = await useFetch<{ customer: CustomerDTO; orders: OrderSummaryDTO[] }>(
  () => `/api/admin/customers/${route.params.id}`,
)
useSeoMeta({ title: () => `${data.value?.customer.name ?? 'Customer'} · Admin`, robots: 'noindex, nofollow' })
const { money } = useStore()
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en', { dateStyle: 'medium' }) : '—')
</script>

<template>
  <div>
    <NuxtLink to="/admin/customers" class="text-sm text-cocoa-700 hover:underline">← Customers</NuxtLink>
    <AdminNotice v-if="error" tone="error" class="mt-4">{{ apiErrorMessage(error) }}</AdminNotice>
    <template v-else-if="data">
      <AdminPageHeader :title="data.customer.name" :description="data.customer.email" class="mt-3" />
      <div class="grid gap-6 xl:grid-cols-[1fr_2fr]">
        <AdminCard>
          <dl class="space-y-4 text-sm">
            <div><dt class="text-cocoa-500">Phone</dt><dd class="mt-0.5">{{ data.customer.phone ?? '—' }}</dd></div>
            <div><dt class="text-cocoa-500">Joined</dt><dd class="mt-0.5">{{ fmtDate(data.customer.createdAt) }}</dd></div>
            <div><dt class="text-cocoa-500">Last sign-in</dt><dd class="mt-0.5">{{ fmtDate(data.customer.lastLoginAt) }}</dd></div>
            <div><dt class="text-cocoa-500">Orders</dt><dd class="mt-0.5">{{ data.customer.orderCount }}</dd></div>
            <div><dt class="text-cocoa-500">Order value</dt><dd class="mt-0.5">{{ money(data.customer.totalSpent) }}</dd></div>
            <div><dt class="text-cocoa-500">Account</dt><dd class="mt-0.5">{{ data.customer.isActive ? 'Active' : 'Disabled' }}</dd></div>
          </dl>
        </AdminCard>
        <AdminCard class="!p-0">
          <h2 class="px-6 pt-6 text-2xl">Order history</h2>
          <p v-if="!data.orders.length" class="p-6 text-sm text-cocoa-500">No orders yet.</p>
          <div v-else class="mt-4 overflow-x-auto">
            <table class="table-admin">
              <thead><tr><th>Order</th><th>Date</th><th>Status</th><th class="text-right">Total</th></tr></thead>
              <tbody>
                <tr v-for="o in data.orders" :key="o.id">
                  <td><NuxtLink :to="`/admin/orders/${o.id}`" class="font-semibold hover:text-gold-600">{{ o.orderNumber }}</NuxtLink></td>
                  <td>{{ fmtDate(o.createdAt) }}</td>
                  <td><StatusBadge :status="o.status" /></td>
                  <td class="text-right">{{ formatMoney(o.total, o.currency) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </AdminCard>
      </div>
    </template>
  </div>
</template>
