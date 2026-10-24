<script setup lang="ts">
const {
  public: { siteName },
} = useRuntimeConfig();
const auth = useAuth();
const cart = useCart();

const nav = [
  { label: "Shop", to: "/products" },
  { label: "Collections", to: "/collections" },
  { label: "Gifts", to: "/gifts" },
];

const accountLink = computed(() => {
  if (!auth.isLoggedIn.value) return { label: "Sign in", to: "/login" };
  return auth.isAdmin.value
    ? { label: "Admin", to: "/admin" }
    : { label: "Account", to: "/account" };
});
</script>

<template>
  <header
    class="sticky top-0 z-40 border-b border-cocoa-900/10 bg-ivory/85 backdrop-blur"
  >
    <!-- Mobile: logo + account on one row, nav below. sm+: single row. -->
    <div
      class="container-page flex flex-wrap items-center justify-between gap-x-6 py-3 sm:h-16 sm:flex-nowrap sm:py-0"
    >
      <NuxtLink
        to="/"
        class="font-display text-2xl tracking-wide text-cocoa-900"
      >
        {{ siteName }}
      </NuxtLink>
      <nav
        aria-label="Primary"
        class="order-last w-full pt-2 sm:order-0 sm:ml-auto sm:w-auto sm:pt-0"
      >
        <ul class="flex items-center gap-6 text-sm font-medium text-cocoa-700">
          <li v-for="item in nav" :key="item.to">
            <NuxtLink :to="item.to" class="transition hover:text-gold-600">{{
              item.label
            }}</NuxtLink>
          </li>
        </ul>
      </nav>
      <div class="flex items-center gap-2">
        <NuxtLink
          :to="accountLink.to"
          class="rounded-full border border-cocoa-900/15 px-4 py-1.5 text-sm font-medium text-cocoa-800 transition hover:border-gold-500 hover:text-gold-600"
        >
          {{ accountLink.label }}
        </NuxtLink>
        <NuxtLink
          to="/cart"
          class="relative rounded-full bg-cocoa-900 px-4 py-1.5 text-sm font-medium text-cream-100 transition hover:bg-cocoa-800"
        >
          Bag
          <ClientOnly>
            <span
              v-if="cart.count.value > 0"
              class="ml-1 inline-grid min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-xs font-bold text-cocoa-950"
            >
              {{ cart.count.value }}
            </span>
            <span class="sr-only">, {{ cart.count.value }} items</span>
          </ClientOnly>
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
