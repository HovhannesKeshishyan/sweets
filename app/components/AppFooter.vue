<script setup lang="ts">
const { store } = useStore()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-24 bg-cocoa-950 text-cream-200">
    <div class="container-page grid gap-10 py-16 sm:grid-cols-3">
      <div>
        <p class="font-display text-2xl text-cream-100">{{ store.storeName }}</p>
        <p class="mt-3 max-w-xs text-sm text-cream-200/70">
          Small-batch chocolates and confections, made slowly and packed with care.
        </p>
      </div>
      <nav aria-label="Footer">
        <p class="eyebrow text-gold-400">Explore</p>
        <ul class="mt-4 space-y-2 text-sm">
          <li><NuxtLink to="/products" class="hover:text-gold-400">All chocolates</NuxtLink></li>
          <li><NuxtLink to="/collections" class="hover:text-gold-400">Collections</NuxtLink></li>
          <li><NuxtLink to="/gifts" class="hover:text-gold-400">Gifts</NuxtLink></li>
          <li><NuxtLink to="/account" class="hover:text-gold-400">Your account</NuxtLink></li>
        </ul>
      </nav>
      <div>
        <p class="eyebrow text-gold-400">Contact</p>
        <ul class="mt-4 space-y-2 text-sm">
          <li v-if="store.contactEmail">
            <a :href="`mailto:${store.contactEmail}`" class="hover:text-gold-400">{{ store.contactEmail }}</a>
          </li>
          <li v-if="store.contactPhone">
            <a :href="`tel:${store.contactPhone}`" class="hover:text-gold-400">{{ store.contactPhone }}</a>
          </li>
          <li v-if="!store.contactEmail && !store.contactPhone" class="text-cream-200/70">We'd love to hear from you.</li>
        </ul>
      </div>
    </div>
    <div class="border-t border-cream-100/10">
      <p class="container-page py-6 text-xs text-cream-200/60">© {{ year }} {{ store.storeName }}. All rights reserved.</p>
    </div>
  </footer>
</template>
