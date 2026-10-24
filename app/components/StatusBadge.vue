<script setup lang="ts">
import type { OrderStatus, PaymentStatus } from "#shared/constants"

const props = defineProps<{ status: OrderStatus | PaymentStatus; kind?: "order" | "payment" }>()

const label = computed(() =>
  props.kind === "payment"
    ? PAYMENT_STATUS_LABELS[props.status as PaymentStatus]
    : ORDER_STATUS_LABELS[props.status as OrderStatus],
)

const tone: Record<string, string> = {
  pending: "bg-gold-400/20 text-gold-600",
  processing: "bg-sky-100 text-sky-900",
  shipped: "bg-indigo-100 text-indigo-900",
  delivered: "bg-emerald-100 text-emerald-900",
  cancelled: "bg-cocoa-900/10 text-cocoa-700",
  unpaid: "bg-orange-100 text-orange-900",
  paid: "bg-emerald-100 text-emerald-900",
  refunded: "bg-cocoa-900/10 text-cocoa-700",
}
</script>

<template>
  <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap" :class="tone[status]">
    {{ label }}
  </span>
</template>
