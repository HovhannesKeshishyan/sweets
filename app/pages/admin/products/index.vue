<script setup lang="ts">
import type { Paginated } from "#shared/schemas/common"
import type { AdminProductDTO, CategoryDTO } from "#shared/types/api"

definePageMeta({ layout: "admin", middleware: "admin" })
useSeoMeta({ title: "Products · Admin", robots: "noindex, nofollow" })

const route = useRoute()
const router = useRouter()
const str = (v: unknown) => (typeof v === "string" && v ? v : undefined)
const query = computed(() => ({
  q: str(route.query.q),
  status: str(route.query.status),
  category: str(route.query.category),
  stock: str(route.query.stock),
  page: Math.max(1, Number(route.query.page) || 1),
}))

const { data, error, refresh } = await useFetch<Paginated<AdminProductDTO>>("/api/admin/products", { query })
const { data: categories } = await useFetch<{ items: CategoryDTO[] }>("/api/admin/categories")
const { money } = useStore()

const search = ref(query.value.q ?? "")
function update(patch: Record<string, string | undefined>) {
  router.push({ query: { ...route.query, ...patch, page: undefined } })
}

const message = ref<{ tone: "error" | "success"; text: string } | null>(null)
async function archive(product: AdminProductDTO) {
  if (!confirm(`Archive “${product.name}”? It will be hidden from the shop. Past orders are unaffected.`)) return
  try {
    await $fetch(`/api/admin/products/${product.id}`, { method: "DELETE" })
    message.value = { tone: "success", text: `${product.name} archived.` }
    await refresh()
  } catch (e) {
    message.value = { tone: "error", text: apiErrorMessage(e) }
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Products" :description="data ? `${data.total} total` : undefined">
      <NuxtLink to="/admin/products/new" class="btn-primary">New product</NuxtLink>
    </AdminPageHeader>

    <div class="mb-6 flex flex-wrap gap-3">
      <form role="search" class="flex" @submit.prevent="update({ q: search.trim() || undefined })">
        <label for="product-search" class="sr-only">Search products</label>
        <input id="product-search" v-model="search" type="search" placeholder="Name, SKU or tag" class="field rounded-r-none" >
        <button type="submit" class="rounded-r-xl bg-cocoa-900 px-4 text-sm text-cream-100">Search</button>
      </form>
      <label class="sr-only" for="f-status">Status</label>
      <select id="f-status" class="field w-auto" :value="query.status ?? ''" @change="update({ status: ($event.target as HTMLSelectElement).value || undefined })">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="draft">Draft</option>
        <option value="archived">Archived</option>
      </select>
      <label class="sr-only" for="f-category">Category</label>
      <select id="f-category" class="field w-auto" :value="query.category ?? ''" @change="update({ category: ($event.target as HTMLSelectElement).value || undefined })">
        <option value="">All categories</option>
        <option v-for="c in categories?.items" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
      <label class="sr-only" for="f-stock">Stock</label>
      <select id="f-stock" class="field w-auto" :value="query.stock ?? ''" @change="update({ stock: ($event.target as HTMLSelectElement).value || undefined })">
        <option value="">Any stock</option>
        <option value="low">Low stock</option>
        <option value="out">Sold out</option>
      </select>
    </div>

    <AdminNotice v-if="message" :tone="message.tone" class="mb-4">{{ message.text }}</AdminNotice>
    <AdminNotice v-if="error" tone="error">{{ apiErrorMessage(error) }}</AdminNotice>

    <AdminCard v-else-if="data" class="!p-0">
      <p v-if="!data.items.length" class="p-6 text-sm text-cocoa-500">No products match.</p>
      <div v-else class="overflow-x-auto">
        <table class="table-admin">
          <thead>
            <tr><th>Product</th><th>Status</th><th class="text-right">Price</th><th class="text-right">Stock</th><th><span class="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="p in data.items" :key="p.id">
              <td>
                <div class="flex items-center gap-3">
                  <ProductImage :image="p.image" :label="p.name" :width="120" class="h-12 w-10 shrink-0 rounded-lg" />
                  <div>
                    <NuxtLink :to="`/admin/products/${p.id}`" class="font-semibold hover:text-gold-600">{{ p.name }}</NuxtLink>
                    <p class="text-xs text-cocoa-500">
                      {{ p.category?.name ?? 'Uncategorised' }}<template v-if="p.sku"> · {{ p.sku }}</template>
                      <template v-if="p.isFeatured"> · ★ Featured</template>
                    </p>
                  </div>
                </div>
              </td>
              <td>
                <span
class="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize" :class="{
                  'bg-emerald-100 text-emerald-900': p.status === 'active',
                  'bg-cream-200 text-cocoa-800': p.status === 'draft',
                  'bg-cocoa-900/10 text-cocoa-500': p.status === 'archived',
                }">{{ p.status }}</span>
              </td>
              <td class="text-right whitespace-nowrap">{{ money(p.price) }}</td>
              <td class="text-right" :class="p.stock === 0 ? 'font-semibold text-red-800' : p.stockLevel === 'low_stock' ? 'text-gold-600' : ''">{{ p.stock }}</td>
              <td class="text-right whitespace-nowrap">
                <NuxtLink :to="`/admin/products/${p.id}`" class="text-sm font-semibold hover:text-gold-600">Edit</NuxtLink>
                <button v-if="p.status !== 'archived'" type="button" class="ml-4 text-sm text-cocoa-500 hover:text-red-800" @click="archive(p)">
                  Archive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminCard>
    <PaginationNav v-if="data" :page="data.page" :total-pages="data.totalPages" />
  </div>
</template>
