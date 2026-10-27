<script setup lang="ts">
import type { CategoryDTO } from "#shared/types/api";

usePageSeo({
  title: "Collections",
  description:
    "Truffles, bars, bonbons, caramels and more — browse our chocolate collections.",
});

const { data, error } = await useFetch<{ items: CategoryDTO[] }>(
  "/api/categories",
  { key: "categories" },
);
</script>

<template>
  <section class="container-page py-16">
    <p class="eyebrow">Browse by kind</p>
    <h1 class="mt-2 text-5xl">Collections</h1>

    <p
      v-if="error"
      role="alert"
      class="mt-10 rounded-2xl bg-red-50 p-6 text-red-900"
    >
      We couldn't load collections right now. Please refresh in a moment.
    </p>
    <p v-else-if="data && !data.items.length" class="mt-10 text-cocoa-700">
      Collections are coming soon.
    </p>
    <ul v-else class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      <li v-for="category in data?.items" :key="category.id">
        <NuxtLink
          :to="`/products?category=${category.slug}`"
          class="group block overflow-hidden rounded-3xl bg-cream-100 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-cocoa-900/5"
        >
          <ProductImage
            :image="category.image"
            :label="category.name"
            class="aspect-4/3"
          />
          <div class="p-7">
            <h2 class="text-3xl group-hover:text-gold-600">
              {{ category.name }}
            </h2>
            <p
              v-if="category.description"
              class="mt-2 line-clamp-2 text-cocoa-700"
            >
              {{ category.description }}
            </p>
            <p class="mt-4 text-sm text-cocoa-500">
              {{ category.productCount }}
              {{ category.productCount === 1 ? "piece" : "pieces" }}
            </p>
          </div>
        </NuxtLink>
      </li>
    </ul>
  </section>
</template>
