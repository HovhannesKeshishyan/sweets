<script setup lang="ts">
import type { OrderDTO } from '#shared/types/api'

const props = defineProps<{ order: OrderDTO }>()
const country = computed(() => new Intl.DisplayNames(['en'], { type: 'region' }).of(props.order.shippingAddress.country))
const money = (minor: number) => formatMoney(minor, props.order.currency)
</script>

<template>
  <div class="grid gap-10 lg:grid-cols-[1fr_320px]">
    <div>
      <h2 class="font-display text-2xl">Items</h2>
      <ul class="mt-4 divide-y divide-cocoa-900/10 border-y border-cocoa-900/10">
        <li v-for="item in order.items" :key="item.productId" class="flex items-center gap-4 py-4">
          <ProductImage
            :image="item.image ? { url: item.image, alt: item.name } : null"
            :label="item.name"
            :width="160"
            class="h-16 w-14 shrink-0 rounded-xl"
          />
          <div class="flex-1">
            <p class="font-medium">{{ item.name }}</p>
            <p class="text-sm text-cocoa-500">{{ money(item.unitPrice) }} × {{ item.quantity }}</p>
          </div>
          <div class="text-right">
            <p class="font-medium">{{ money(item.lineTotal) }}</p>
            <p v-if="item.discount" class="text-xs text-gold-600">−{{ money(item.discount) }}</p>
          </div>
        </li>
      </ul>
      <dl class="mt-6 ml-auto max-w-xs space-y-2 text-sm">
        <div class="flex justify-between"><dt class="text-cocoa-700">Subtotal</dt><dd>{{ money(order.subtotal) }}</dd></div>
        <div v-if="order.coupon" class="flex justify-between text-gold-600">
          <dt>Discount ({{ order.coupon.code }})</dt><dd>−{{ money(order.discountTotal) }}</dd>
        </div>
        <div class="flex justify-between">
          <dt class="text-cocoa-700">Shipping</dt><dd>{{ order.shippingTotal ? money(order.shippingTotal) : 'Free' }}</dd>
        </div>
        <div class="flex justify-between border-t border-cocoa-900/10 pt-3 text-base font-semibold">
          <dt>Total</dt><dd>{{ money(order.total) }}</dd>
        </div>
      </dl>
    </div>

    <div class="space-y-8 text-sm">
      <div>
        <h2 class="font-display text-2xl">Delivery</h2>
        <address class="mt-3 leading-relaxed not-italic text-cocoa-800">
          {{ order.customer.name }}<br />
          {{ order.shippingAddress.line1 }}<br />
          <template v-if="order.shippingAddress.line2">{{ order.shippingAddress.line2 }}<br /></template>
          {{ order.shippingAddress.city }}<template v-if="order.shippingAddress.region">, {{ order.shippingAddress.region }}</template>
          {{ order.shippingAddress.postalCode }}<br />
          {{ country }}
        </address>
      </div>
      <div>
        <h2 class="font-display text-2xl">Contact</h2>
        <p class="mt-3 text-cocoa-800">{{ order.customer.email }}</p>
        <p v-if="order.customer.phone" class="text-cocoa-800">{{ order.customer.phone }}</p>
      </div>
      <div v-if="order.notes">
        <h2 class="font-display text-2xl">Note</h2>
        <p class="mt-3 whitespace-pre-line text-cocoa-800">{{ order.notes }}</p>
      </div>
    </div>
  </div>
</template>
