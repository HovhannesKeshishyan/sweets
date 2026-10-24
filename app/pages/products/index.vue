<script setup lang="ts">
import type { Paginated } from "#shared/schemas/common"
import type { CategoryDTO, ProductSummaryDTO } from "#shared/types/api"

const route = useRoute()
const router = useRouter()

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name" },
] as const

const one = (v: unknown) => (typeof v === "string" ? v : Array.isArray(v) && typeof v[0] === "string" ? v[0] : undefined)

// The URL is the source of truth for filters, so results are shareable and SSR-rendered.
const query = computed(() => ({
  q: one(route.query.q) || undefined,
  category: one(route.query.category) || undefined,
  tag: one(route.query.tag) || undefined,
  featured: one(route.query.featured) === "true" ? "true" : undefined,
  onSale: one(route.query.onSale) === "true" ? "true" : undefined,
  sort: SORT_OPTIONS.some((o) => o.value === one(route.query.sort)) ? one(route.query.sort) : "featured",
  page: Math.max(1, Number(one(route.query.page)) || 1),
  limit: 12,
}))

const [{ data, error, status }, { data: categories }] = await Promise.all([
  useFetch<Paginated<ProductSummaryDTO>>("/api/products", { query }),
  useFetch<{ items: CategoryDTO[] }>("/api/categories", { key: "categories" }),
])

const activeCategory = computed(() => categories.value?.items.find((c) => c.slug === query.value.category))

const heading = computed(() => {
  if (activeCategory.value) return activeCategory.value.name
  if (query.value.onSale) return "Seasonal offers"
  if (query.value.featured) return "Featured"
  if (query.value.q) return `Results for “${query.value.q}”`
  return "All chocolates"
})

usePageSeo({
  title: heading,
  description: () =>
    activeCategory.value?.description ??
    "Browse handcrafted truffles, bars, bonbons and confections — filter by collection and price.",
})

const search = ref(query.value.q ?? "")
watch(
  () => query.value.q,
  (q) => (search.value = q ?? ""),
)

function update(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, page: undefined } })
}
</script>

<template>
  <section class="container-page py-16">
    <p class="eyebrow">The shop</p>
    <h1 class="mt-2 text-5xl">{{ heading }}</h1>
    <p v-if="activeCategory?.description" class="mt-3 max-w-2xl text-cocoa-700">{{ activeCategory.description }}</p>

    <div class="mt-10 flex flex-col gap-4 border-y border-cocoa-900/10 py-5 lg:flex-row lg:items-center lg:justify-between">
      <form role="search" class="flex w-full max-w-sm" @submit.prevent="update({ q: search.trim() || undefined })">
        <label for="catalog-search" class="sr-only">Search chocolates</label>
        <input
          id="catalog-search"
          v-model="search"
          type="search"
          placeholder="Search truffles, pralines…"
          class="w-full rounded-l-full border border-r-0 border-cocoa-900/15 bg-white/70 px-5 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
        >
        <button type="submit" class="rounded-r-full bg-cocoa-900 px-5 text-sm font-semibold text-cream-100">Search</button>
      </form>

      <div class="flex flex-wrap items-center gap-3">
        <label class="flex items-center gap-2 text-sm">
          <span class="text-cocoa-700">Collection</span>
          <select
            :value="query.category ?? ''"
            class="rounded-full border border-cocoa-900/15 bg-white/70 px-4 py-2"
            @change="update({ category: ($event.target as HTMLSelectElement).value || undefined })"
          >
            <option value="">All</option>
            <option v-for="c in categories?.items" :key="c.id" :value="c.slug">{{ c.name }}</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-sm">
          <span class="text-cocoa-700">Sort</span>
          <select
            :value="query.sort"
            class="rounded-full border border-cocoa-900/15 bg-white/70 px-4 py-2"
            @change="update({ sort: ($event.target as HTMLSelectElement).value })"
          >
            <option v-for="o in SORT_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </label>
        <button
          type="button"
          class="rounded-full border px-4 py-2 text-sm transition"
          :class="query.onSale ? 'border-cocoa-900 bg-cocoa-900 text-cream-100' : 'border-cocoa-900/15 hover:border-cocoa-900'"
          :aria-pressed="Boolean(query.onSale)"
          @click="update({ onSale: query.onSale ? undefined : 'true' })"
        >
          On offer
        </button>
        <NuxtLink
          v-if="query.q || query.category || query.tag || query.featured || query.onSale"
          to="/products"
          class="text-sm text-cocoa-700 underline-offset-4 hover:underline"
        >
          Clear filters
        </NuxtLink>
      </div>
    </div>

    <p class="mt-6 text-sm text-cocoa-500" aria-live="polite">
      <template v-if="status === 'pending'">Loading…</template>
      <template v-else-if="data">{{ data.total }} {{ data.total === 1 ? 'item' : 'items' }}</template>
    </p>

    <div v-if="error" role="alert" class="mt-10 rounded-2xl bg-red-50 p-6 text-red-900">
      We couldn't load the shop right now. Please refresh in a moment.
    </div>
    <div v-else-if="data && data.items.length === 0" class="py-24 text-center">
      <p class="font-display text-3xl">Nothing matches just yet</p>
      <p class="mt-2 text-cocoa-700">Try another search or browse everything.</p>
      <NuxtLink to="/products" class="btn-outline mt-8">View all chocolates</NuxtLink>
    </div>
    <template v-else-if="data">
      <div class="mt-8"><ProductGrid :products="data.items" /></div>
      <PaginationNav :page="data.page" :total-pages="data.totalPages" />
    </template>
  </section>
</template>
