<script setup lang="ts">
import type { CategoryDTO, ProductSummaryDTO } from '#shared/types/api'

usePageSeo({
  title: 'Fine chocolates & confections',
  description: 'Handcrafted chocolates, truffles and confections, thoughtfully boxed for gifting.',
})

const { data } = await useFetch<{
  featured: ProductSummaryDTO[]
  gifts: ProductSummaryDTO[]
  onSale: ProductSummaryDTO[]
  categories: CategoryDTO[]
}>('/api/home')

const promises = [
  { title: 'Made in small batches', text: 'Tempered by hand each week, so every box arrives at its best.' },
  { title: 'Single-origin cacao', text: 'Sourced from growers we know, from Ecuador to Madagascar.' },
  { title: 'Wrapped to be given', text: 'Every order is boxed and ribboned — no extra charge.' },
]
</script>

<template>
  <div>
    <section class="relative overflow-hidden bg-cocoa-900 text-cream-100">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(201,164,92,0.22),transparent_55%)]"
      />
      <div class="container-page relative grid min-h-[72vh] items-center py-24">
        <div class="max-w-2xl animate-rise">
          <p class="eyebrow text-gold-400">Small-batch chocolatier</p>
          <h1 class="mt-5 text-5xl leading-[1.05] sm:text-7xl">
            Chocolate, made
            <em class="text-gold-400">slowly</em>
            and gifted gladly.
          </h1>
          <p class="mt-6 max-w-lg text-lg text-cream-200/80">
            Single-origin bars, hand-rolled truffles and seasonal confections — composed in small batches and packed to
            be opened with ceremony.
          </p>
          <div class="mt-10 flex flex-wrap gap-4">
            <NuxtLink to="/products" class="btn bg-gold-400 text-cocoa-950 hover:bg-gold-500">Explore the shop</NuxtLink>
            <NuxtLink
              to="/gifts"
              class="btn border border-cream-100/30 text-cream-100 hover:border-gold-400 hover:text-gold-400"
            >
              Gift collections
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section v-if="data?.featured.length" class="container-page py-24">
      <SectionHeading eyebrow="The house favourites" title="Featured" to="/products?featured=true" />
      <ProductGrid :products="data.featured" />
    </section>

    <section v-if="data?.categories.length" class="bg-cream-100 py-24">
      <div class="container-page">
        <SectionHeading eyebrow="Browse by kind" title="Collections" to="/collections" link-label="All collections" />
        <ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="category in data.categories" :key="category.id">
            <NuxtLink
              :to="`/products?category=${category.slug}`"
              class="group block overflow-hidden rounded-3xl bg-ivory transition hover:-translate-y-1 hover:shadow-xl hover:shadow-cocoa-900/5"
            >
              <ProductImage :image="category.image" :label="category.name" class="aspect-[4/3]" />
              <div class="p-6">
                <h3 class="text-2xl group-hover:text-gold-600">{{ category.name }}</h3>
                <p class="mt-1 text-sm text-cocoa-500">
                  {{ category.productCount }} {{ category.productCount === 1 ? 'piece' : 'pieces' }}
                </p>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="data?.onSale.length" class="container-page py-24">
      <SectionHeading eyebrow="For a limited time" title="Seasonal offers" to="/products?onSale=true" />
      <ProductGrid :products="data.onSale" />
    </section>

    <section v-if="data?.gifts.length" class="bg-cocoa-900 py-24 text-cream-100">
      <div class="container-page">
        <div class="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow text-gold-400">Ribboned & ready</p>
            <h2 class="mt-2 text-4xl sm:text-5xl">Gift collections</h2>
          </div>
          <NuxtLink to="/gifts" class="text-sm font-semibold text-gold-400 underline-offset-4 hover:underline">
            All gifts →
          </NuxtLink>
        </div>
        <div class="rounded-[2rem] bg-ivory p-6 text-cocoa-900 sm:p-10">
          <ProductGrid :products="data.gifts" />
        </div>
      </div>
    </section>

    <section class="container-page py-24">
      <ul class="grid gap-10 sm:grid-cols-3">
        <li v-for="item in promises" :key="item.title" class="border-t border-gold-500/40 pt-6">
          <h3 class="text-2xl">{{ item.title }}</h3>
          <p class="mt-2 text-cocoa-700">{{ item.text }}</p>
        </li>
      </ul>
    </section>
  </div>
</template>
