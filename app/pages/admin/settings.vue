<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
useSeoMeta({ title: 'Settings · Admin', robots: 'noindex, nofollow' })

interface Settings {
  storeName: string
  contactEmail: string | null
  contactPhone: string | null
  address: { line1: string; line2?: string; city: string; region?: string; postalCode: string; country: string } | null
  currency: string
  shipping: { flatRate: number; freeShippingThreshold: number | null; allowedCountries: string[] }
  uploadsEnabled: boolean
}

const { data, error, refresh } = await useFetch<Settings>('/api/admin/settings')
const storeState = useStore()

const form = reactive({
  storeName: '',
  contactEmail: '',
  contactPhone: '',
  currency: 'USD',
  flatRate: null as number | null,
  freeShippingThreshold: null as number | null,
  allowedCountries: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
})
const originalCurrency = ref('')

watch(
  data,
  (s) => {
    if (!s) return
    originalCurrency.value = s.currency
    Object.assign(form, {
      storeName: s.storeName,
      contactEmail: s.contactEmail ?? '',
      contactPhone: s.contactPhone ?? '',
      currency: s.currency,
      flatRate: s.shipping.flatRate,
      freeShippingThreshold: s.shipping.freeShippingThreshold,
      allowedCountries: s.shipping.allowedCountries.join(', '),
      line1: s.address?.line1 ?? '',
      line2: s.address?.line2 ?? '',
      city: s.address?.city ?? '',
      region: s.address?.region ?? '',
      postalCode: s.address?.postalCode ?? '',
      country: s.address?.country ?? '',
    })
  },
  { immediate: true },
)

const fieldErrors = ref<Record<string, string>>({})
const message = ref<{ tone: 'error' | 'success'; text: string } | null>(null)
const saving = ref(false)

async function save() {
  if (form.currency.toUpperCase() !== originalCurrency.value &&
    !confirm('Changing the currency does not convert existing prices. Product prices will be read in the new currency. Continue?')) return
  saving.value = true
  fieldErrors.value = {}
  message.value = null
  const opt = (v: string) => (v.trim() ? v.trim() : null)
  const hasAddress = [form.line1, form.city, form.postalCode, form.country].some((v) => v.trim())
  try {
    await $fetch('/api/admin/settings', {
      method: 'PUT',
      body: {
        storeName: form.storeName,
        contactEmail: opt(form.contactEmail),
        contactPhone: opt(form.contactPhone),
        currency: form.currency,
        address: hasAddress
          ? { line1: form.line1, line2: opt(form.line2) ?? undefined, city: form.city, region: opt(form.region) ?? undefined, postalCode: form.postalCode, country: form.country }
          : null,
        shipping: {
          flatRate: form.flatRate ?? 0,
          freeShippingThreshold: form.freeShippingThreshold,
          allowedCountries: form.allowedCountries.split(/[\s,]+/).map((c) => c.trim().toUpperCase()).filter(Boolean),
        },
      },
    })
    await Promise.all([refresh(), storeState.load(true)])
    message.value = { tone: 'success', text: 'Settings saved.' }
  } catch (e) {
    fieldErrors.value = apiFieldErrors(e)
    message.value = { tone: 'error', text: Object.keys(fieldErrors.value).length ? 'Please fix the highlighted fields.' : apiErrorMessage(e) }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <AdminPageHeader title="Settings" description="Store details, currency and shipping." />
    <AdminNotice v-if="error" tone="error">{{ apiErrorMessage(error) }}</AdminNotice>

    <form v-else-if="data" class="grid max-w-4xl gap-6" novalidate @submit.prevent="save">
      <AdminCard class="grid gap-5 sm:grid-cols-2">
        <h2 class="text-2xl sm:col-span-2">Store</h2>
        <FormField v-model="form.storeName" label="Store name" required :error="fieldErrors.storeName" />
        <FormField v-model="form.currency" label="Currency (ISO code)" required hint="e.g. USD, EUR, GBP" :error="fieldErrors.currency" />
        <FormField v-model="form.contactEmail" label="Contact email" type="email" :error="fieldErrors.contactEmail" />
        <FormField v-model="form.contactPhone" label="Contact phone" type="tel" :error="fieldErrors.contactPhone" />
      </AdminCard>

      <AdminCard class="grid gap-5 sm:grid-cols-2">
        <h2 class="text-2xl sm:col-span-2">Shipping</h2>
        <AdminMoneyInput v-model="form.flatRate" label="Flat shipping rate" :error="fieldErrors['shipping.flatRate']" />
        <AdminMoneyInput
          v-model="form.freeShippingThreshold"
          label="Free shipping from"
          hint="Order subtotal after discounts; leave empty to disable"
          :error="fieldErrors['shipping.freeShippingThreshold']"
        />
        <div class="sm:col-span-2">
          <FormField
            v-model="form.allowedCountries"
            label="Ship to countries"
            hint="2-letter codes separated by commas (e.g. US, CA, GB). Leave empty to ship everywhere."
            :error="Object.entries(fieldErrors).find(([k]) => k.startsWith('shipping.allowedCountries'))?.[1]"
          />
        </div>
      </AdminCard>

      <AdminCard class="grid gap-5 sm:grid-cols-2">
        <h2 class="text-2xl sm:col-span-2">Business address <span class="text-base text-cocoa-500">(optional)</span></h2>
        <div class="sm:col-span-2"><FormField v-model="form.line1" label="Address" :error="fieldErrors['address.line1']" /></div>
        <FormField v-model="form.line2" label="Address line 2" />
        <FormField v-model="form.city" label="City" :error="fieldErrors['address.city']" />
        <FormField v-model="form.region" label="State / region" />
        <FormField v-model="form.postalCode" label="Postal code" :error="fieldErrors['address.postalCode']" />
        <FormField v-model="form.country" label="Country code" :error="fieldErrors['address.country']" />
      </AdminCard>

      <AdminCard>
        <h2 class="text-2xl">Image uploads</h2>
        <p class="mt-2 text-sm text-cocoa-700">
          {{ data.uploadsEnabled
            ? 'Cloudinary is configured. Admins can upload product images directly.'
            : 'Not configured. Admins can paste image URLs; set the NUXT_CLOUDINARY_* environment variables to enable uploads.' }}
        </p>
      </AdminCard>

      <AdminNotice v-if="message" :tone="message.tone">{{ message.text }}</AdminNotice>
      <div><button type="submit" class="btn-primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save settings' }}</button></div>
    </form>
  </div>
</template>
