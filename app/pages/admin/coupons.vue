<script setup lang="ts">
import type { Paginated } from "#shared/schemas/common"
import type { AdminProductDTO, CategoryDTO, CouponDTO } from "#shared/types/api"

definePageMeta({ layout: "admin", middleware: "admin" })
useSeoMeta({ title: "Coupons · Admin", robots: "noindex, nofollow" })

const { data, error, refresh } = await useFetch<{ items: CouponDTO[] }>("/api/admin/coupons")
const { data: categories } = await useFetch<{ items: CategoryDTO[] }>("/api/admin/categories")
const { data: products } = await useFetch<Paginated<AdminProductDTO>>("/api/admin/products", { query: { limit: 100 } })
const { money } = useStore()

const editing = ref<CouponDTO | null>(null)
const showForm = ref(false)
const fieldErrors = ref<Record<string, string>>({})
const message = ref<{ tone: "error" | "success"; text: string } | null>(null)
const saving = ref(false)

/** datetime-local value (local time) ↔ ISO string */
const toLocalInput = (iso: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null)

const blank = () => ({
  code: "",
  description: "",
  type: "percentage" as "percentage" | "fixed",
  percent: "10",
  fixedAmount: null as number | null,
  minOrderAmount: null as number | null,
  maxDiscountAmount: null as number | null,
  startsAt: "",
  expiresAt: "",
  usageLimit: "",
  products: [] as string[],
  categories: [] as string[],
  isActive: true,
})
const form = reactive(blank())

function open(coupon: CouponDTO | null) {
  editing.value = coupon
  showForm.value = true
  fieldErrors.value = {}
  message.value = null
  Object.assign(form, blank(), coupon && {
    code: coupon.code,
    description: coupon.description ?? "",
    type: coupon.type,
    percent: coupon.type === "percentage" ? String(coupon.value) : "10",
    fixedAmount: coupon.type === "fixed" ? coupon.value : null,
    minOrderAmount: coupon.minOrderAmount || null,
    maxDiscountAmount: coupon.maxDiscountAmount,
    startsAt: toLocalInput(coupon.startsAt),
    expiresAt: toLocalInput(coupon.expiresAt),
    usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
    products: [...coupon.products],
    categories: [...coupon.categories],
    isActive: coupon.isActive,
  })
}

async function save() {
  saving.value = true
  fieldErrors.value = {}
  message.value = null
  const isEdit = Boolean(editing.value)
  const clearable = <T,>(value: T | null | undefined) => (value == null || value === "" ? (isEdit ? null : undefined) : value)
  const body = {
    code: form.code,
    description: form.description.trim() || undefined,
    type: form.type,
    value: form.type === "percentage" ? Number(form.percent) : form.fixedAmount ?? undefined,
    minOrderAmount: form.minOrderAmount ?? 0,
    maxDiscountAmount: form.type === "percentage" ? clearable(form.maxDiscountAmount) : clearable(null),
    startsAt: clearable(fromLocalInput(form.startsAt)),
    expiresAt: clearable(fromLocalInput(form.expiresAt)),
    usageLimit: clearable(form.usageLimit ? Number(form.usageLimit) : null),
    products: form.products,
    categories: form.categories,
    isActive: form.isActive,
  }
  try {
    if (editing.value) await $fetch(`/api/admin/coupons/${editing.value.id}`, { method: "PATCH", body })
    else await $fetch("/api/admin/coupons", { method: "POST", body })
    message.value = { tone: "success", text: `Coupon ${form.code.toUpperCase()} saved.` }
    showForm.value = false
    await refresh()
  } catch (e) {
    fieldErrors.value = apiFieldErrors(e)
    message.value = { tone: "error", text: apiErrorMessage(e) }
  } finally {
    saving.value = false
  }
}

async function toggle(coupon: CouponDTO) {
  try {
    await $fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", body: { isActive: !coupon.isActive } })
    await refresh()
  } catch (e) {
    message.value = { tone: "error", text: apiErrorMessage(e) }
  }
}

function describe(c: CouponDTO) {
  const off = c.type === "percentage" ? `${c.value}% off` : `${money(c.value)} off`
  const scope = c.products.length || c.categories.length ? " selected items" : ""
  return off + scope
}

function state(c: CouponDTO) {
  const now = Date.now()
  if (!c.isActive) return { label: "Disabled", cls: "bg-cocoa-900/10 text-cocoa-500" }
  if (c.expiresAt && new Date(c.expiresAt).getTime() <= now) return { label: "Expired", cls: "bg-cocoa-900/10 text-cocoa-500" }
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "Scheduled", cls: "bg-sky-100 text-sky-900" }
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { label: "Used up", cls: "bg-cocoa-900/10 text-cocoa-500" }
  return { label: "Active", cls: "bg-emerald-100 text-emerald-900" }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Coupons" description="Discount codes customers enter in their bag.">
      <button type="button" class="btn-primary" @click="open(null)">New coupon</button>
    </AdminPageHeader>

    <AdminNotice v-if="message" :tone="message.tone" class="mb-4">{{ message.text }}</AdminNotice>

    <AdminCard v-if="showForm" class="mb-6">
      <h2 class="mb-5 text-2xl">{{ editing ? `Edit ${editing.code}` : 'New coupon' }}</h2>
      <form class="grid gap-5 sm:grid-cols-2" novalidate @submit.prevent="save">
        <FormField v-model="form.code" label="Code" required hint="Letters, numbers, - and _" :error="fieldErrors.code" />
        <FormField v-model="form.description" label="Internal note" :error="fieldErrors.description" />
        <div class="flex flex-col gap-1.5">
          <label for="cp-type" class="field-label">Discount type</label>
          <select id="cp-type" v-model="form.type" class="field">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <FormField v-if="form.type === 'percentage'" v-model="form.percent" label="Percent off" type="number" required :error="fieldErrors.value" />
        <AdminMoneyInput v-else v-model="form.fixedAmount" label="Amount off" required :error="fieldErrors.value" />
        <AdminMoneyInput v-model="form.minOrderAmount" label="Minimum order" :error="fieldErrors.minOrderAmount" />
        <AdminMoneyInput v-if="form.type === 'percentage'" v-model="form.maxDiscountAmount" label="Maximum discount" :error="fieldErrors.maxDiscountAmount" />
        <div class="flex flex-col gap-1.5">
          <label for="cp-start" class="field-label">Starts</label>
          <input id="cp-start" v-model="form.startsAt" type="datetime-local" class="field" >
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="cp-end" class="field-label">Expires</label>
          <input id="cp-end" v-model="form.expiresAt" type="datetime-local" class="field" :aria-invalid="fieldErrors.expiresAt ? 'true' : undefined" >
          <p v-if="fieldErrors.expiresAt" class="text-xs text-red-800">{{ fieldErrors.expiresAt }}</p>
        </div>
        <FormField v-model="form.usageLimit" label="Total uses allowed" type="number" hint="Leave empty for unlimited" :error="fieldErrors.usageLimit" />
        <label class="flex items-center gap-3 self-end pb-3 text-sm">
          <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-cocoa-900" > Enabled
        </label>

        <fieldset class="sm:col-span-2">
          <legend class="field-label">Limit to categories <span class="font-normal text-cocoa-500">(optional)</span></legend>
          <div class="mt-2 flex flex-wrap gap-2">
            <label v-for="c in categories?.items" :key="c.id" class="flex items-center gap-2 rounded-full border border-cocoa-900/15 px-3 py-1.5 text-sm">
              <input v-model="form.categories" type="checkbox" :value="c.id" class="accent-cocoa-900" > {{ c.name }}
            </label>
          </div>
        </fieldset>
        <div class="flex flex-col gap-1.5 sm:col-span-2">
          <label for="cp-products" class="field-label">Limit to products <span class="font-normal text-cocoa-500">(optional; Ctrl/⌘-click to select several)</span></label>
          <select id="cp-products" v-model="form.products" multiple size="6" class="field">
            <option v-for="p in products?.items" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <p class="text-xs text-cocoa-500">With no limits, the coupon applies to the whole bag.</p>
        </div>

        <div class="flex gap-3 sm:col-span-2">
          <button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save coupon' }}</button>
          <button type="button" class="btn-outline" @click="showForm = false">Cancel</button>
        </div>
      </form>
    </AdminCard>

    <AdminNotice v-if="error" tone="error">{{ apiErrorMessage(error) }}</AdminNotice>
    <AdminCard v-else-if="data" class="!p-0">
      <p v-if="!data.items.length" class="p-6 text-sm text-cocoa-500">No coupons yet.</p>
      <div v-else class="overflow-x-auto">
        <table class="table-admin">
          <thead><tr><th>Code</th><th>Discount</th><th>Uses</th><th>Expires</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>
            <tr v-for="c in data.items" :key="c.id">
              <td class="font-semibold tracking-wide">{{ c.code }}</td>
              <td>
                {{ describe(c) }}
                <span v-if="c.minOrderAmount" class="block text-xs text-cocoa-500">min. {{ money(c.minOrderAmount) }}</span>
              </td>
              <td>{{ c.usedCount }}<template v-if="c.usageLimit"> / {{ c.usageLimit }}</template></td>
              <td>{{ c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en', { dateStyle: 'medium' }) : '—' }}</td>
              <td><span class="rounded-full px-2.5 py-0.5 text-xs font-semibold" :class="state(c).cls">{{ state(c).label }}</span></td>
              <td class="text-right whitespace-nowrap">
                <button type="button" class="text-sm font-semibold hover:text-gold-600" @click="open(c)">Edit</button>
                <button type="button" class="ml-4 text-sm text-cocoa-500 hover:text-cocoa-900" @click="toggle(c)">{{ c.isActive ? 'Disable' : 'Enable' }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminCard>
  </div>
</template>
