<script setup lang="ts">
import type { CategoryDTO } from "#shared/types/api"

definePageMeta({ layout: "admin", middleware: "admin" })
useSeoMeta({ title: "Categories · Admin", robots: "noindex, nofollow" })

const { data, error, refresh } = await useFetch<{ items: CategoryDTO[] }>("/api/admin/categories")

const editing = ref<CategoryDTO | null>(null)
const showForm = ref(false)
const form = reactive({ name: "", slug: "", description: "", imageUrl: "", imageAlt: "", sortOrder: "0", isActive: true })
const fieldErrors = ref<Record<string, string>>({})
const message = ref<{ tone: "error" | "success"; text: string } | null>(null)
const saving = ref(false)

function open(category: CategoryDTO | null) {
  editing.value = category
  showForm.value = true
  fieldErrors.value = {}
  Object.assign(form, {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    description: category?.description ?? "",
    imageUrl: category?.image?.url ?? "",
    imageAlt: category?.image?.alt ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
    isActive: category?.isActive ?? true,
  })
}

async function save() {
  saving.value = true
  fieldErrors.value = {}
  message.value = null
  const body = {
    name: form.name,
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || undefined,
    image: form.imageUrl.trim() ? { url: form.imageUrl.trim(), alt: form.imageAlt.trim() } : undefined,
    sortOrder: Number(form.sortOrder) || 0,
    isActive: form.isActive,
  }
  try {
    if (editing.value) await $fetch(`/api/admin/categories/${editing.value.id}`, { method: "PATCH", body })
    else await $fetch("/api/admin/categories", { method: "POST", body })
    message.value = { tone: "success", text: "Category saved." }
    showForm.value = false
    await refresh()
  } catch (e) {
    fieldErrors.value = apiFieldErrors(e)
    message.value = { tone: "error", text: apiErrorMessage(e) }
  } finally {
    saving.value = false
  }
}

async function toggleActive(category: CategoryDTO) {
  try {
    await $fetch(`/api/admin/categories/${category.id}`, { method: "PATCH", body: { isActive: !category.isActive } })
    await refresh()
  } catch (e) {
    message.value = { tone: "error", text: apiErrorMessage(e) }
  }
}

async function remove(category: CategoryDTO) {
  if (!confirm(`Delete “${category.name}”? This can't be undone.`)) return
  try {
    await $fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" })
    message.value = { tone: "success", text: `${category.name} deleted.` }
    await refresh()
  } catch (e) {
    message.value = { tone: "error", text: apiErrorMessage(e) }
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Categories" description="Collections shown in the shop, ordered by sort order.">
      <button type="button" class="btn-primary" @click="open(null)">New category</button>
    </AdminPageHeader>

    <AdminNotice v-if="message" :tone="message.tone" class="mb-4">{{ message.text }}</AdminNotice>

    <AdminCard v-if="showForm" class="mb-6">
      <h2 class="mb-5 text-2xl">{{ editing ? `Edit ${editing.name}` : 'New category' }}</h2>
      <form class="grid gap-5 sm:grid-cols-2" novalidate @submit.prevent="save">
        <FormField v-model="form.name" label="Name" required :error="fieldErrors.name" />
        <FormField v-model="form.slug" label="URL slug" hint="Leave empty to generate" :error="fieldErrors.slug" />
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <label for="c-desc" class="field-label">Description</label>
          <textarea id="c-desc" v-model="form.description" rows="2" class="field" />
        </div>
        <FormField v-model="form.imageUrl" label="Image URL" type="url" :error="fieldErrors['image.url']" />
        <FormField v-model="form.imageAlt" label="Image description" />
        <FormField v-model="form.sortOrder" label="Sort order" type="number" :error="fieldErrors.sortOrder" />
        <label class="flex items-center gap-3 self-end pb-3 text-sm">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-cocoa-900" > Visible in the shop
        </label>
        <div class="flex gap-3 sm:col-span-2">
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
          <button type="button" class="btn-outline" @click="showForm = false">Cancel</button>
        </div>
      </form>
    </AdminCard>

    <AdminNotice v-if="error" tone="error">{{ apiErrorMessage(error) }}</AdminNotice>
    <AdminCard v-else-if="data" class="!p-0">
      <p v-if="!data.items.length" class="p-6 text-sm text-cocoa-500">No categories yet.</p>
      <div v-else class="overflow-x-auto">
        <table class="table-admin">
          <thead><tr><th>Name</th><th>Slug</th><th class="text-right">Products</th><th>Visible</th><th><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>
            <tr v-for="c in data.items" :key="c.id">
              <td class="font-semibold">{{ c.name }}</td>
              <td class="text-cocoa-500">{{ c.slug }}</td>
              <td class="text-right">{{ c.productCount }}</td>
              <td>
                <button type="button" class="text-xs font-semibold" :class="c.isActive ? 'text-emerald-800' : 'text-cocoa-500'" @click="toggleActive(c)">
                  {{ c.isActive ? 'Visible' : 'Hidden' }}<span class="sr-only"> — toggle {{ c.name }}</span>
                </button>
              </td>
              <td class="text-right whitespace-nowrap">
                <button type="button" class="text-sm font-semibold hover:text-gold-600" @click="open(c)">Edit</button>
                <button v-if="!c.productCount" type="button" class="ml-4 text-sm text-cocoa-500 hover:text-red-800" @click="remove(c)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminCard>
  </div>
</template>
