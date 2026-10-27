<script setup lang="ts">
import type { ProductDetailDTO, ProductSummaryDTO } from "#shared/types/api";

const route = useRoute();
const slug = computed(() => String(route.params.slug));

const { data, error } = await useFetch<{
  product: ProductDetailDTO;
  related: ProductSummaryDTO[];
}>(() => `/api/products/${encodeURIComponent(slug.value)}`);
if (error.value || !data.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: "Product not found",
    fatal: true,
  });
}

const product = computed(() => data.value!.product);
const { store, money } = useStore();
const { siteUrl } = useRuntimeConfig().public;
const cart = useCart();

const activeImage = ref(0);
watch(slug, () => (activeImage.value = 0));
const quantity = ref(1);
const added = ref(false);

function addToBag() {
  cart.add(product.value, quantity.value);
  added.value = true;
}

usePageSeo({
  title: () => product.value.name,
  description: () =>
    product.value.shortDescription ?? product.value.description.slice(0, 155),
  image: () => product.value.images[0]?.url,
});

useHead({
  script: [
    {
      type: "application/ld+json",
      // Structured data for rich results. JSON.stringify output is escaped for safe embedding.
      innerHTML: () =>
        JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.value.name,
          description:
            product.value.shortDescription ?? product.value.description,
          image: product.value.images.map((i) => i.url),
          category: product.value.category?.name,
          offers: {
            "@type": "Offer",
            url: new URL(`/products/${product.value.slug}`, siteUrl).toString(),
            priceCurrency: store.value.currency,
            price: toMajorUnits(
              product.value.price,
              store.value.currency,
            ).toFixed(currencyFractionDigits(store.value.currency)),
            availability:
              product.value.stockLevel === "out_of_stock"
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
          },
        }).replace(/</g, "\\u003c"),
    },
  ],
});
</script>

<template>
  <div>
    <nav
      aria-label="Breadcrumb"
      class="container-page pt-8 text-sm text-cocoa-500"
    >
      <ol class="flex flex-wrap items-center gap-2">
        <li>
          <NuxtLink to="/products" class="hover:text-gold-600">Shop</NuxtLink>
        </li>
        <template v-if="product.category">
          <li aria-hidden="true">/</li>
          <li>
            <NuxtLink
              :to="`/products?category=${product.category.slug}`"
              class="hover:text-gold-600"
            >
              {{ product.category.name }}
            </NuxtLink>
          </li>
        </template>
        <li aria-hidden="true">/</li>
        <li aria-current="page" class="text-cocoa-800">{{ product.name }}</li>
      </ol>
    </nav>

    <section class="container-page grid gap-12 py-10 lg:grid-cols-2 lg:gap-20">
      <div>
        <ProductImage
          :image="product.images[activeImage] ?? null"
          :label="product.name"
          :width="1280"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
          class="aspect-square rounded-[2rem]"
        />
        <ul
          v-if="product.images.length > 1"
          class="mt-4 flex gap-3"
          aria-label="Product images"
        >
          <li v-for="(img, i) in product.images" :key="img.url">
            <button
              type="button"
              class="block overflow-hidden rounded-xl ring-offset-2 transition"
              :class="
                i === activeImage
                  ? 'ring-2 ring-gold-500'
                  : 'opacity-70 hover:opacity-100'
              "
              :aria-label="`Show image ${i + 1}`"
              :aria-pressed="i === activeImage"
              @click="activeImage = i"
            >
              <ProductImage
                :image="img"
                :label="product.name"
                :width="160"
                class="h-20 w-20"
              />
            </button>
          </li>
        </ul>
      </div>

      <div class="lg:py-6">
        <p v-if="product.category" class="eyebrow">
          {{ product.category.name }}
        </p>
        <h1 class="mt-3 text-5xl leading-tight">{{ product.name }}</h1>
        <div class="mt-5 flex items-center gap-4">
          <PriceTag
            :price="product.price"
            :compare-at-price="product.compareAtPrice"
            size="lg"
          />
          <StockBadge :level="product.stockLevel" />
        </div>
        <p v-if="product.shortDescription" class="mt-6 text-lg text-cocoa-700">
          {{ product.shortDescription }}
        </p>

        <div
          v-if="product.maxQuantity > 0"
          class="mt-10 flex flex-wrap items-center gap-4"
        >
          <QuantityStepper
            v-model="quantity"
            :max="product.maxQuantity"
            :label="product.name"
          />
          <button
            type="button"
            class="btn-primary flex-1 sm:flex-none sm:px-10"
            @click="addToBag"
          >
            Add to bag — {{ money(product.price * quantity) }}
          </button>
        </div>
        <p
          v-else
          class="mt-10 rounded-2xl bg-cream-200 px-5 py-4 text-cocoa-800"
        >
          Sold out for now — we make fresh batches every week.
        </p>
        <p v-if="added" role="status" class="mt-4 text-sm text-cocoa-700">
          Added to your bag.
          <NuxtLink
            to="/cart"
            class="font-semibold text-gold-600 underline-offset-4 hover:underline"
            >View bag →</NuxtLink
          >
        </p>

        <div class="mt-12 space-y-8 border-t border-cocoa-900/10 pt-8">
          <div>
            <h2 class="text-2xl">About</h2>
            <p class="mt-3 whitespace-pre-line text-cocoa-700">
              {{ product.description }}
            </p>
          </div>
          <div v-if="product.ingredients">
            <h2 class="text-2xl">Ingredients</h2>
            <p class="mt-3 text-cocoa-700">{{ product.ingredients }}</p>
          </div>
          <dl class="grid grid-cols-2 gap-4 text-sm">
            <div v-if="product.weightGrams">
              <dt class="text-cocoa-500">Net weight</dt>
              <dd class="mt-1 font-medium">{{ product.weightGrams }} g</dd>
            </div>
            <div v-if="product.allergens.length">
              <dt class="text-cocoa-500">Contains</dt>
              <dd class="mt-1 font-medium capitalize">
                {{ product.allergens.join(", ") }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>

    <section v-if="data?.related.length" class="container-page py-16">
      <SectionHeading
        eyebrow="Pairs beautifully with"
        title="You may also like"
      />
      <ProductGrid :products="data.related" />
    </section>
  </div>
</template>
