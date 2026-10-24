<script setup lang="ts">
const auth = useAuth()
const { store } = useStore()
const route = useRoute()
const menuOpen = ref(false)
watch(() => route.fullPath, () => (menuOpen.value = false))

const nav = [
  { label: "Dashboard", to: "/admin", exact: true },
  { label: "Orders", to: "/admin/orders" },
  { label: "Products", to: "/admin/products" },
  { label: "Categories", to: "/admin/categories" },
  { label: "Coupons", to: "/admin/coupons" },
  { label: "Customers", to: "/admin/customers" },
  { label: "Settings", to: "/admin/settings" },
]

function isActive(item: { to: string; exact?: boolean }) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

async function signOut() {
  await auth.logout()
  await navigateTo("/login")
}
</script>

<template>
  <div class="min-h-dvh bg-cream-100/50 lg:grid lg:grid-cols-[240px_1fr]">
    <a href="#admin-main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-cocoa-900 focus:px-4 focus:py-2 focus:text-cream-100">
      Skip to content
    </a>
    <header class="flex items-center justify-between bg-cocoa-950 px-5 py-4 text-cream-100 lg:hidden">
      <NuxtLink to="/admin" class="font-display text-xl">{{ store.storeName }} · Admin</NuxtLink>
      <button type="button" class="rounded-full border border-cream-100/30 px-4 py-1.5 text-sm" :aria-expanded="menuOpen" aria-controls="admin-nav" @click="menuOpen = !menuOpen">
        Menu
      </button>
    </header>

    <aside
      id="admin-nav"
      class="bg-cocoa-950 text-cream-200 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col"
      :class="menuOpen ? 'block' : 'hidden lg:flex'"
    >
      <div class="hidden px-6 pt-8 pb-6 lg:block">
        <NuxtLink to="/admin" class="font-display text-2xl text-cream-100">{{ store.storeName }}</NuxtLink>
        <p class="mt-1 text-xs tracking-widest text-gold-400 uppercase">Admin</p>
      </div>
      <nav aria-label="Admin" class="px-3 pb-4">
        <ul class="space-y-1">
          <li v-for="item in nav" :key="item.to">
            <NuxtLink
              :to="item.to"
              class="block rounded-xl px-4 py-2.5 text-sm transition"
              :class="isActive(item) ? 'bg-cream-100/10 font-semibold text-cream-100' : 'hover:bg-cream-100/5'"
              :aria-current="isActive(item) ? 'page' : undefined"
            >
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <div class="mt-auto border-t border-cream-100/10 px-6 py-5 text-sm">
        <p class="truncate text-cream-100">{{ auth.user.value?.name }}</p>
        <p class="truncate text-xs text-cream-200/60">{{ auth.user.value?.email }}</p>
        <div class="mt-3 flex gap-4 text-xs">
          <NuxtLink to="/" class="hover:text-gold-400">View store</NuxtLink>
          <button type="button" class="hover:text-gold-400" @click="signOut">Sign out</button>
        </div>
      </div>
    </aside>

    <main id="admin-main" class="min-w-0 px-5 py-8 sm:px-10 lg:py-12">
      <slot />
    </main>
  </div>
</template>
