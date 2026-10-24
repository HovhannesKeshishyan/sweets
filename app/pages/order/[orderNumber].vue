<script setup lang="ts">
import type { OrderDTO } from '#shared/types/api'

useSeoMeta({ title: 'Your order', robots: 'noindex' })

const route = useRoute()
const orderNumber = computed(() => String(route.params.orderNumber))
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : undefined))
const justPlaced = computed(() => route.query.placed === '1')

const { data: order, error } = await useFetch<OrderDTO>(() => `/api/orders/${encodeURIComponent(orderNumber.value)}`, {
  query: { token },
  headers: useRequestHeaders(['cookie']),
})

const placedOn = computed(() =>
  order.value ? new Date(order.value.createdAt).toLocaleDateString('en', { dateStyle: 'long' }) : '',
)
</script>

<template>
  <section class="container-page py-16">
    <div v-if="error" class="py-16 text-center">
      <p class="font-display text-3xl">We couldn't find that order</p>
      <p class="mt-2 text-cocoa-700">Use the link from your confirmation, or sign in to see your orders.</p>
      <NuxtLink to="/account/orders" class="btn-outline mt-8">Your orders</NuxtLink>
    </div>

    <template v-else-if="order">
      <div class="max-w-2xl">
        <p class="eyebrow">{{ justPlaced ? 'Thank you' : 'Order' }}</p>
        <h1 class="mt-2 text-5xl">{{ justPlaced ? 'Your order is placed' : order.orderNumber }}</h1>
        <p class="mt-4 text-cocoa-700">
          Order <strong class="font-semibold text-cocoa-900">{{ order.orderNumber }}</strong> · placed {{ placedOn }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <StatusBadge :status="order.status" />
          <StatusBadge :status="order.paymentStatus" kind="payment" />
        </div>
        <div v-if="order.paymentStatus === 'unpaid' && order.status !== 'cancelled'" class="mt-8 rounded-2xl bg-cream-100 p-6 text-sm text-cocoa-800">
          <p class="font-semibold">What happens next</p>
          <p class="mt-1">
            We'll email {{ order.customer.email }} to arrange payment. Your chocolates are reserved and will be
            prepared once payment is confirmed.
          </p>
        </div>
        <p v-if="justPlaced && order.isGuest" class="mt-4 text-sm text-cocoa-500">
          Bookmark this page to check on your order later — the link is private to you.
        </p>
      </div>

      <div class="mt-14">
        <OrderDetails :order="order" />
      </div>
    </template>
  </section>
</template>
