<script setup lang="ts">
import type { OrderStatus } from "#shared/constants";
import { ORDER_TRANSITIONS } from "#shared/schemas/order";
import type { OrderDTO } from "#shared/types/api";

definePageMeta({ layout: "admin", middleware: "admin" });

const route = useRoute();
const { data: order, error } = await useFetch<OrderDTO>(
  () => `/api/admin/orders/${route.params.id}`,
);
useSeoMeta({
  title: () => `${order.value?.orderNumber ?? "Order"} · Admin`,
  robots: "noindex, nofollow",
});

const next = computed(() =>
  order.value ? ORDER_TRANSITIONS[order.value.status] : [],
);
const note = ref("");
const updating = ref(false);
const message = ref<{ tone: "error" | "success"; text: string } | null>(null);

const ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Mark received",
  processing: "Start preparing",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

async function setStatus(status: OrderStatus) {
  if (
    status === "cancelled" &&
    !confirm("Cancel this order? Stock will be returned to inventory.")
  )
    return;
  updating.value = true;
  message.value = null;
  try {
    order.value = await $fetch<OrderDTO>(
      `/api/admin/orders/${route.params.id}/status`,
      {
        method: "POST",
        body: { status, note: note.value.trim() || undefined },
      },
    );
    note.value = "";
    message.value = {
      tone: "success",
      text: `Order is now ${ORDER_STATUS_LABELS[status].toLowerCase()}.`,
    };
  } catch (e) {
    message.value = { tone: "error", text: apiErrorMessage(e) };
  } finally {
    updating.value = false;
  }
}
</script>

<template>
  <div>
    <NuxtLink to="/admin/orders" class="text-sm text-cocoa-700 hover:underline"
      >← Orders</NuxtLink
    >
    <AdminNotice v-if="error" tone="error" class="mt-4">{{
      apiErrorMessage(error)
    }}</AdminNotice>

    <template v-else-if="order">
      <AdminPageHeader
        :title="order.orderNumber"
        :description="`Placed ${new Date(order.createdAt).toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })} · ${order.isGuest ? 'Guest checkout' : 'Registered customer'}`"
        class="mt-3"
      >
        <StatusBadge :status="order.status" />
        <StatusBadge :status="order.paymentStatus" kind="payment" />
      </AdminPageHeader>

      <div class="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <AdminCard><OrderDetails :order="order" /></AdminCard>

        <div class="space-y-6">
          <AdminCard>
            <h2 class="text-2xl">Fulfillment</h2>
            <template v-if="next.length">
              <label for="status-note" class="field-label mt-4 block"
                >Note (optional)</label
              >
              <textarea
                id="status-note"
                v-model="note"
                rows="2"
                maxlength="500"
                class="field mt-1.5"
                placeholder="e.g. tracking number"
              />
              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  v-for="s in next"
                  :key="s"
                  type="button"
                  :disabled="updating"
                  :class="
                    s === 'cancelled'
                      ? 'btn-outline hover:!border-red-800 hover:!text-red-800'
                      : 'btn-primary'
                  "
                  @click="setStatus(s)"
                >
                  {{ ACTION_LABELS[s] }}
                </button>
              </div>
            </template>
            <p v-else class="mt-3 text-sm text-cocoa-500">
              This order is
              {{ ORDER_STATUS_LABELS[order.status].toLowerCase() }}; no further
              changes.
            </p>
            <AdminNotice v-if="message" :tone="message.tone" class="mt-4">{{
              message.text
            }}</AdminNotice>
            <p class="mt-4 text-xs text-cocoa-500">
              Payment status is set only by the payment provider integration and
              can't be changed here.
            </p>
          </AdminCard>

          <AdminCard>
            <h2 class="text-2xl">History</h2>
            <ol
              class="mt-4 space-y-3 border-l border-cocoa-900/15 pl-4 text-sm"
            >
              <li v-for="(h, i) in order.statusHistory" :key="i">
                <p class="font-semibold">{{ ORDER_STATUS_LABELS[h.status] }}</p>
                <p class="text-xs text-cocoa-500">
                  {{
                    new Date(h.at).toLocaleString("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  }}
                </p>
                <p v-if="h.note" class="mt-1 text-cocoa-700">{{ h.note }}</p>
              </li>
            </ol>
          </AdminCard>
        </div>
      </div>
    </template>
  </div>
</template>
