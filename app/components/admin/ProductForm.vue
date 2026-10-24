<script setup lang="ts">
import type { ImageInput } from '#shared/schemas/fields'
import type { AdminProductDTO, CategoryDTO } from '#shared/types/api'

const props = defineProps<{ product?: AdminProductDTO | null }>()
const emit = defineEmits<{ saved: [product: AdminProductDTO] }>()

const { data: categories } = await useFetch<{ items: CategoryDTO[] }>('/api/admin/categories')
const { data: settings } = await useFetch<{ uploadsEnabled: boolean }>('/api/admin/settings', { key: 'admin-settings-upload' })

const csv = (list: string[]) => list.join(', ')
const fromCsv = (text: string) => text.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)

function initial() {
  const p = props.product
  return {
    name: p?.name ?? '',
    slug: p?.slug ?? '',
    sku: p?.sku ?? '',
    shortDescription: p?.shortDescription ?? '',
    description: p?.description ?? '',
    price: (p?.price ?? null) as number | null,
    compareAtPrice: (p?.compareAtPrice ?? null) as number | null,
    category: p?.categoryId ?? '',
    tags: csv(p?.tags ?? []),
    ingredients: p?.ingredients ?? '',
    allergens: csv(p?.allergens ?? []),
    weightGrams: p?.weightGrams != null ? String(p.weightGrams) : '',
    stock: String(p?.stock ?? 0),
    isFeatured: p?.isFeatured ?? false,
    status: p?.status ?? 'draft',
    images: (p?.images ?? []).map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })) as ImageInput[],
  }
}

const form = reactive(initial())
watch(() => props.product, () => Object.assign(form, initial()))

const fieldErrors = ref<Record<string, string>>({})
const message = ref<{ tone: 'error' | 'success'; text: string } | null>(null)
const saving = ref(false)
const newImageUrl = ref('')
const uploading = ref(false)

function addImageUrl() {
  const url = newImageUrl.value.trim()
  if (!url) return
  form.images.push({ url, alt: '', provider: 'external' })
  newImageUrl.value = ''
}

function moveImage(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= form.images.length) return
  const [img] = form.images.splice(index, 1)
  form.images.splice(target, 0, img!)
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploading.value = true
  message.value = null
  try {
    const body = new FormData()
    body.append('file', file)
    const image = await $fetch<ImageInput>('/api/admin/uploads', { method: 'POST', body })
    form.images.push({ ...image, alt: form.name })
  } catch (e) {
    message.value = { tone: 'error', text: apiErrorMessage(e, 'Upload failed.') }
  } finally {
    uploading.value = false
    input.value = ''
  }
}

function payload() {
  const opt = (v: string) => (v.trim() ? v.trim() : undefined)
  return {
    name: form.name,
    slug: opt(form.slug),
    sku: opt(form.sku),
    shortDescription: opt(form.shortDescription),
    description: form.description,
    price: form.price ?? undefined,
    compareAtPrice: form.compareAtPrice ?? (props.product ? null : undefined),
    category: form.category || undefined,
    tags: fromCsv(form.tags),
    ingredients: opt(form.ingredients),
    allergens: fromCsv(form.allergens),
    weightGrams: form.weightGrams.trim() ? Number(form.weightGrams) : undefined,
    stock: Number(form.stock),
    isFeatured: form.isFeatured,
    status: form.status,
    images: form.images.map((i) => ({ ...i, alt: i.alt.trim() })),
  }
}

async function save() {
  saving.value = true
  fieldErrors.value = {}
  message.value = null
  try {
    const product = props.product
      ? await $fetch<AdminProductDTO>(`/api/admin/products/${props.product.id}`, { method: 'PATCH', body: payload() })
      : await $fetch<AdminProductDTO>('/api/admin/products', { method: 'POST', body: payload() })
    message.value = { tone: 'success', text: 'Product saved.' }
    emit('saved', product)
  } catch (e) {
    fieldErrors.value = apiFieldErrors(e)
    message.value = { tone: 'error', text: Object.keys(fieldErrors.value).length ? 'Please fix the highlighted fields.' : apiErrorMessage(e) }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="grid gap-6 xl:grid-cols-[2fr_1fr]" novalidate @submit.prevent="save">
    <div class="space-y-6">
      <AdminCard class="space-y-5">
        <FormField v-model="form.name" label="Name" required :error="fieldErrors.name" />
        <FormField v-model="form.shortDescription" label="Short description" hint="Shown on product cards (max 280 characters)" :error="fieldErrors.shortDescription" />
        <div class="flex flex-col gap-1.5">
          <label for="p-description" class="field-label">Description <span aria-hidden="true" class="text-gold-600">*</span></label>
          <textarea id="p-description" v-model="form.description" rows="6" required class="field" :aria-invalid="fieldErrors.description ? 'true' : undefined" />
          <p v-if="fieldErrors.description" class="text-xs text-red-800">{{ fieldErrors.description }}</p>
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="p-ingredients" class="field-label">Ingredients</label>
          <textarea id="p-ingredients" v-model="form.ingredients" rows="3" class="field" />
        </div>
        <div class="grid gap-5 sm:grid-cols-2">
          <FormField v-model="form.allergens" label="Allergens" hint="Comma-separated, e.g. milk, hazelnut" :error="fieldErrors.allergens" />
          <FormField v-model="form.weightGrams" label="Net weight (g)" type="number" :error="fieldErrors.weightGrams" />
        </div>
      </AdminCard>

      <AdminCard class="space-y-4">
        <h2 class="text-2xl">Images</h2>
        <p class="text-xs text-cocoa-500">The first image is the main one. Describe each image for screen readers.</p>
        <ul v-if="form.images.length" class="space-y-3">
          <li v-for="(img, i) in form.images" :key="`${img.url}-${i}`" class="flex items-center gap-3 rounded-xl border border-cocoa-900/10 p-3">
            <ProductImage :image="{ url: img.url, alt: img.alt }" :label="form.name || 'Image'" :width="160" class="h-16 w-16 shrink-0 rounded-lg" />
            <div class="flex-1 space-y-1">
              <label :for="`img-alt-${i}`" class="sr-only">Alt text for image {{ i + 1 }}</label>
              <input :id="`img-alt-${i}`" v-model="img.alt" class="field" placeholder="Alt text" maxlength="200" />
              <p class="truncate text-xs text-cocoa-500">{{ img.url }}</p>
            </div>
            <div class="flex flex-col gap-1 text-xs">
              <button type="button" :disabled="i === 0" class="disabled:opacity-30" :aria-label="`Move image ${i + 1} up`" @click="moveImage(i, -1)">↑</button>
              <button type="button" :disabled="i === form.images.length - 1" class="disabled:opacity-30" :aria-label="`Move image ${i + 1} down`" @click="moveImage(i, 1)">↓</button>
            </div>
            <button type="button" class="text-xs text-red-800 hover:underline" @click="form.images.splice(i, 1)">Remove</button>
          </li>
        </ul>
        <p v-if="fieldErrors.images || Object.keys(fieldErrors).some((k) => k.startsWith('images.'))" class="text-xs text-red-800">
          One or more image URLs are invalid (http/https only).
        </p>
        <div class="flex flex-wrap gap-3">
          <label for="new-image" class="sr-only">Image URL</label>
          <input id="new-image" v-model="newImageUrl" type="url" placeholder="https://…" class="field flex-1" @keydown.enter.prevent="addImageUrl" />
          <button type="button" class="btn-outline" @click="addImageUrl">Add URL</button>
          <label v-if="settings?.uploadsEnabled" class="btn-outline cursor-pointer" :class="{ 'opacity-50': uploading }">
            {{ uploading ? 'Uploading…' : 'Upload image' }}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" class="sr-only" :disabled="uploading" @change="upload" />
          </label>
        </div>
      </AdminCard>
    </div>

    <div class="space-y-6">
      <AdminCard class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label for="p-status" class="field-label">Status</label>
          <select id="p-status" v-model="form.status" class="field">
            <option value="draft">Draft — hidden from the shop</option>
            <option value="active">Active — on sale</option>
            <option value="archived">Archived</option>
          </select>
        </div>
        <label class="flex items-center gap-3 text-sm">
          <input v-model="form.isFeatured" type="checkbox" class="h-4 w-4 accent-cocoa-900" />
          Feature on the homepage
        </label>
      </AdminCard>

      <AdminCard class="space-y-5">
        <AdminMoneyInput v-model="form.price" label="Price" required :error="fieldErrors.price" />
        <AdminMoneyInput v-model="form.compareAtPrice" label="Compare-at price" hint="Optional “was” price; shows the item as on offer" :error="fieldErrors.compareAtPrice" />
        <FormField v-model="form.stock" label="Stock" type="number" required :error="fieldErrors.stock" />
        <FormField v-model="form.sku" label="SKU" :error="fieldErrors.sku" />
      </AdminCard>

      <AdminCard class="space-y-5">
        <div class="flex flex-col gap-1.5">
          <label for="p-category" class="field-label">Category</label>
          <select id="p-category" v-model="form.category" class="field">
            <option value="">Uncategorised</option>
            <option v-for="c in categories?.items" :key="c.id" :value="c.id">{{ c.name }}{{ c.isActive ? '' : ' (inactive)' }}</option>
          </select>
        </div>
        <FormField v-model="form.tags" label="Tags" hint="Comma-separated. Use “gift” to include in Gift collections." :error="fieldErrors.tags" />
        <FormField v-model="form.slug" label="URL slug" hint="Leave empty to generate from the name" :error="fieldErrors.slug" />
      </AdminCard>

      <AdminNotice v-if="message" :tone="message.tone">{{ message.text }}</AdminNotice>
      <button type="submit" class="btn-primary w-full" :disabled="saving">{{ saving ? 'Saving…' : product ? 'Save changes' : 'Create product' }}</button>
    </div>
  </form>
</template>
