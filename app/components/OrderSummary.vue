<script setup lang="ts">
import type { QuoteDTO } from '#shared/types/api'

defineProps<{ quote: QuoteDTO }>()
const { money } = useStore()
</script>

<template>
  <dl class="space-y-3 text-sm">
    <div class="flex justify-between">
      <dt class="text-cocoa-700">Subtotal</dt>
      <dd>{{ money(quote.subtotal) }}</dd>
    </div>
    <div v-if="quote.coupon" class="flex justify-between text-gold-600">
      <dt>Discount ({{ quote.coupon.code }})</dt>
      <dd>−{{ money(quote.discountTotal) }}</dd>
    </div>
    <div class="flex justify-between">
      <dt class="text-cocoa-700">Shipping</dt>
      <dd>{{ quote.shippingTotal === 0 ? 'Free' : money(quote.shippingTotal) }}</dd>
    </div>
    <div class="flex justify-between border-t border-cocoa-900/10 pt-4 text-lg font-semibold">
      <dt>Total</dt>
      <dd>{{ money(quote.total) }}</dd>
    </div>
  </dl>
  <p v-if="quote.freeShippingRemaining" class="mt-4 rounded-xl bg-cream-200 px-4 py-3 text-xs text-cocoa-800">
    Add {{ money(quote.freeShippingRemaining) }} more for free shipping.
  </p>
</template>
