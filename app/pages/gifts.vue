<script setup lang="ts">
import type { Paginated } from "#shared/schemas/common"
import type { ProductSummaryDTO } from "#shared/types/api"

usePageSeo({
  title: "Gift collections",
  description: "Ribboned boxes of truffles and confections, ready to give — for birthdays, thank-yous and every occasion.",
})

const route = useRoute()
const page = computed(() => Math.max(1, Number(route.query.page) || 1))
const { data, error } = await useFetch<Paginated<ProductSummaryDTO>>("/api/products", {
  query: computed(() => ({ tag: "gift", sort: "featured", page: page.value, limit: 12 })),
})
</script>

<template>
  <div>
    <section class="bg-cocoa-900 text-cream-100">
      <div class="container-page py-20">
        <p class="eyebrow text-gold-400">Ribboned & ready</p>
        <h1 class="mt-3 text-5xl sm:text-6xl">Gift collections</h1>
        <p class="mt-4 max-w-xl text-cream-200/80">
          Every gift is boxed by hand and finished with a silk ribbon. Add a note at checkout and we'll tuck it inside.
        </p>
      </div>
    </section>
    <section class="container-page py-16">
      <p v-if="error" role="alert" class="rounded-2xl bg-red-50 p-6 text-red-900">
        We couldn't load gifts right now. Please refresh in a moment.
      </p>
      <p v-else-if="data && !data.items.length" class="text-cocoa-700">New gift boxes are on their way.</p>
      <template v-else-if="data">
        <ProductGrid :products="data.items" />
        <PaginationNav :page="data.page" :total-pages="data.totalPages" />
      </template>
    </section>
  </div>
</template>
