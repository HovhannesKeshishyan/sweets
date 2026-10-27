<script setup lang="ts">
useSeoMeta({ title: "Your bag", robots: "noindex" });

const cart = useCart();
const { money } = useStore();
const couponInput = ref("");

// Re-price whenever the contents or coupon change (debounced for quantity clicks).
let timer: ReturnType<typeof setTimeout> | undefined;
function scheduleQuote() {
  clearTimeout(timer);
  timer = setTimeout(() => cart.refreshQuote(), 250);
}

onMounted(() => {
  cart.hydrate();
  couponInput.value = cart.couponCode.value ?? "";
  if (cart.items.value.length) cart.refreshQuote();
});
onBeforeUnmount(() => clearTimeout(timer));

function changeQuantity(productId: string, quantity: number) {
  cart.setQuantity(productId, quantity);
  scheduleQuote();
}

function remove(productId: string) {
  cart.remove(productId);
  scheduleQuote();
}

async function applyCoupon() {
  cart.setCoupon(couponInput.value || null);
  await cart.refreshQuote();
}

async function removeCoupon() {
  couponInput.value = "";
  cart.setCoupon(null);
  await cart.refreshQuote();
}

const lines = computed(() => cart.quote.value?.lines ?? []);
</script>

<template>
  <section class="container-page py-16">
    <p class="eyebrow">Your selection</p>
    <h1 class="mt-2 text-5xl">Your bag</h1>

    <ClientOnly>
      <div v-if="!cart.items.value.length" class="py-24 text-center">
        <p class="font-display text-3xl">Your bag is empty</p>
        <p class="mt-2 text-cocoa-700">
          A little something sweet is only a click away.
        </p>
        <NuxtLink to="/products" class="btn-primary mt-8"
          >Explore the shop</NuxtLink
        >
      </div>

      <div v-else class="mt-12 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div>
          <ul
            v-if="cart.quote.value?.issues.length"
            role="alert"
            class="mb-6 space-y-1 rounded-2xl bg-gold-400/15 px-5 py-4 text-sm text-cocoa-900"
          >
            <li v-for="issue in cart.quote.value.issues" :key="issue.productId">
              {{ issue.message }}
            </li>
          </ul>
          <p
            v-if="cart.quoteError.value"
            role="alert"
            class="mb-6 rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-900"
          >
            {{ cart.quoteError.value }}
          </p>

          <ul class="divide-y divide-cocoa-900/10 border-y border-cocoa-900/10">
            <li
              v-for="line in lines"
              :key="line.productId"
              class="flex gap-5 py-6"
            >
              <NuxtLink
                :to="`/products/${line.slug}`"
                class="shrink-0 overflow-hidden rounded-2xl"
              >
                <ProductImage
                  :image="line.image"
                  :label="line.name"
                  :width="240"
                  class="h-28 w-24 sm:h-32 sm:w-28"
                />
              </NuxtLink>
              <div class="flex flex-1 flex-col gap-3">
                <div class="flex justify-between gap-4">
                  <div>
                    <NuxtLink
                      :to="`/products/${line.slug}`"
                      class="font-display text-xl hover:text-gold-600"
                    >
                      {{ line.name }}
                    </NuxtLink>
                    <p class="text-sm text-cocoa-500">
                      {{ money(line.unitPrice) }} each
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-semibold">{{ money(line.lineTotal) }}</p>
                    <p v-if="line.discount" class="text-xs text-gold-600">
                      −{{ money(line.discount) }} off
                    </p>
                  </div>
                </div>
                <div class="flex items-center justify-between">
                  <QuantityStepper
                    :model-value="line.quantity"
                    :max="line.maxQuantity"
                    :label="line.name"
                    @update:model-value="changeQuantity(line.productId, $event)"
                  />
                  <button
                    type="button"
                    class="text-sm text-cocoa-500 underline-offset-4 hover:text-cocoa-900 hover:underline"
                    @click="remove(line.productId)"
                  >
                    Remove<span class="sr-only"> {{ line.name }}</span>
                  </button>
                </div>
              </div>
            </li>
          </ul>
          <p
            v-if="!cart.quote.value && cart.quoting.value"
            class="py-10 text-center text-cocoa-500"
          >
            Updating your bag…
          </p>
        </div>

        <aside
          class="h-fit rounded-3xl bg-cream-100 p-8 lg:sticky lg:top-24"
          aria-label="Order summary"
        >
          <h2 class="text-2xl">Summary</h2>

          <form class="mt-6" @submit.prevent="applyCoupon">
            <label for="coupon" class="text-sm font-medium text-cocoa-800"
              >Gift card or promo code</label
            >
            <div class="mt-2 flex">
              <input
                id="coupon"
                v-model="couponInput"
                autocomplete="off"
                class="w-full rounded-l-full border border-r-0 border-cocoa-900/15 bg-white px-4 py-2.5 text-sm uppercase focus:border-gold-500 focus:outline-none"
                :aria-invalid="
                  cart.quote.value?.couponError ? 'true' : undefined
                "
                aria-describedby="coupon-msg"
              >
              <button
                type="submit"
                class="rounded-r-full bg-cocoa-900 px-5 text-sm font-semibold text-cream-100"
                :disabled="cart.quoting.value"
              >
                Apply
              </button>
            </div>
            <p id="coupon-msg" class="mt-2 text-xs" aria-live="polite">
              <span v-if="cart.quote.value?.couponError" class="text-red-800">{{
                cart.quote.value.couponError
              }}</span>
              <span v-else-if="cart.quote.value?.coupon" class="text-gold-600">
                {{ cart.quote.value.coupon.code }} applied.
                <button type="button" class="underline" @click="removeCoupon">
                  Remove
                </button>
              </span>
            </p>
          </form>

          <div class="mt-6">
            <OrderSummary v-if="cart.quote.value" :quote="cart.quote.value" />
          </div>

          <NuxtLink
            to="/checkout"
            class="btn-primary mt-8 w-full"
            :class="{
              'pointer-events-none opacity-50':
                !lines.length || cart.quoting.value,
            }"
            :aria-disabled="!lines.length || cart.quoting.value"
          >
            Checkout
          </NuxtLink>
          <p class="mt-3 text-center text-xs text-cocoa-500">
            No account needed. Totals are confirmed at checkout.
          </p>
        </aside>
      </div>

      <template #fallback>
        <p class="py-24 text-center text-cocoa-500">Loading your bag…</p>
      </template>
    </ClientOnly>
  </section>
</template>
