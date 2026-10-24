<script setup lang="ts">
import type { OrderDTO, QuoteDTO } from '#shared/types/api'

useSeoMeta({ title: 'Checkout', robots: 'noindex' })

const cart = useCart()
const auth = useAuth()
const { store, money } = useStore()

const form = reactive({
  email: '',
  name: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: '',
  notes: '',
})
const fieldErrors = ref<Record<string, string>>({})
const formError = ref('')
const placing = ref(false)

const countries = computed(() => countryOptions(store.value.shipping.allowedCountries))

onMounted(async () => {
  cart.hydrate()
  if (!cart.items.value.length) return navigateTo('/cart')
  await cart.refreshQuote()

  if (auth.user.value) {
    form.email = auth.user.value.email
    form.name = auth.user.value.name
    try {
      const { profile } = await $fetch<{
        profile: { phone: string | null; defaultAddress: Record<string, string | undefined> | null }
      }>('/api/account/profile')
      form.phone = profile.phone ?? ''
      if (profile.defaultAddress) Object.assign(form, profile.defaultAddress)
    } catch {
      // Prefill is a convenience only.
    }
  }
  if (!form.country && countries.value.length === 1) form.country = countries.value[0]!.code
})

const optional = (v: string) => (v.trim() ? v.trim() : undefined)

async function placeOrder() {
  const quote = cart.quote.value
  if (!quote || !quote.lines.length) return
  placing.value = true
  formError.value = ''
  fieldErrors.value = {}
  try {
    const result = await $fetch<{ order: OrderDTO; accessToken: string }>('/api/orders', {
      method: 'POST',
      body: {
        items: cart.items.value.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: cart.couponCode.value ?? undefined,
        customer: { email: form.email, name: form.name, phone: optional(form.phone) },
        shippingAddress: {
          line1: form.line1,
          line2: optional(form.line2),
          city: form.city,
          region: optional(form.region),
          postalCode: form.postalCode,
          country: form.country,
        },
        notes: optional(form.notes),
        expectedTotal: quote.total,
      },
    })
    cart.clear()
    await navigateTo({
      path: `/order/${result.order.orderNumber}`,
      query: { token: result.accessToken, placed: '1' },
    })
  } catch (e) {
    const err = e as { statusCode?: number; data?: { data?: { code?: string; quote?: QuoteDTO } } }
    const detail = err.data?.data
    if (err.statusCode === 409 && detail?.quote) cart.applyQuote(detail.quote)
    else if (err.statusCode === 409) await cart.refreshQuote()
    if (detail?.code === 'COUPON_INVALID') cart.setCoupon(null)

    const issues = apiFieldErrors(e)
    fieldErrors.value = Object.fromEntries(
      Object.entries(issues).map(([path, msg]) => [path.replace(/^customer\.|^shippingAddress\./, ''), msg]),
    )
    formError.value = Object.keys(issues).length
      ? 'Please check the highlighted fields.'
      : apiErrorMessage(e, 'We could not place your order. Please try again.')
  } finally {
    placing.value = false
  }
}
</script>

<template>
  <section class="container-page py-16">
    <p class="eyebrow">Almost there</p>
    <h1 class="mt-2 text-5xl">Checkout</h1>

    <ClientOnly>
      <form class="mt-12 grid gap-12 lg:grid-cols-[1fr_400px]" novalidate @submit.prevent="placeOrder">
        <div class="space-y-12">
          <fieldset class="space-y-5">
            <legend class="font-display text-2xl">Contact</legend>
            <p v-if="!auth.isLoggedIn.value" class="text-sm text-cocoa-700">
              Checking out as a guest.
              <NuxtLink to="/login?redirect=/checkout" class="font-semibold text-gold-600 hover:underline">Sign in</NuxtLink>
              to save this order to your account.
            </p>
            <FormField v-model="form.email" label="Email" type="email" autocomplete="email" required :error="fieldErrors.email" />
            <div class="grid gap-5 sm:grid-cols-2">
              <FormField v-model="form.name" label="Full name" autocomplete="name" required :error="fieldErrors.name" />
              <FormField v-model="form.phone" label="Phone" type="tel" autocomplete="tel" :error="fieldErrors.phone" hint="For delivery questions only" />
            </div>
          </fieldset>

          <fieldset class="space-y-5">
            <legend class="font-display text-2xl">Delivery address</legend>
            <FormField v-model="form.line1" label="Address" autocomplete="address-line1" required :error="fieldErrors.line1" />
            <FormField v-model="form.line2" label="Apartment, suite, etc." autocomplete="address-line2" :error="fieldErrors.line2" />
            <div class="grid gap-5 sm:grid-cols-2">
              <FormField v-model="form.city" label="City" autocomplete="address-level2" required :error="fieldErrors.city" />
              <FormField v-model="form.region" label="State / region" autocomplete="address-level1" :error="fieldErrors.region" />
            </div>
            <div class="grid gap-5 sm:grid-cols-2">
              <FormField v-model="form.postalCode" label="Postal code" autocomplete="postal-code" required :error="fieldErrors.postalCode" />
              <div class="flex flex-col gap-1.5">
                <label for="country" class="text-sm font-medium text-cocoa-800">
                  Country <span aria-hidden="true" class="text-gold-600">*</span>
                </label>
                <select
                  id="country"
                  v-model="form.country"
                  required
                  autocomplete="country"
                  class="rounded-xl border bg-white/70 px-4 py-3 focus:border-gold-500 focus:outline-none"
                  :class="fieldErrors.country ? 'border-red-700/60' : 'border-cocoa-900/15'"
                  :aria-invalid="fieldErrors.country ? 'true' : undefined"
                  :aria-describedby="fieldErrors.country ? 'country-error' : undefined"
                >
                  <option value="" disabled>Select a country</option>
                  <option v-for="c in countries" :key="c.code" :value="c.code">{{ c.name }}</option>
                </select>
                <p v-if="fieldErrors.country" id="country-error" class="text-xs text-red-800">{{ fieldErrors.country }}</p>
              </div>
            </div>
          </fieldset>

          <fieldset class="space-y-3">
            <legend class="font-display text-2xl">Gift note <span class="text-base text-cocoa-500">(optional)</span></legend>
            <label for="notes" class="sr-only">Gift note or delivery instructions</label>
            <textarea
              id="notes"
              v-model="form.notes"
              rows="3"
              maxlength="1000"
              class="w-full rounded-xl border border-cocoa-900/15 bg-white/70 px-4 py-3 focus:border-gold-500 focus:outline-none"
              placeholder="A message for the card, or delivery instructions"
            />
          </fieldset>

          <div class="rounded-2xl border border-cocoa-900/10 bg-cream-100 p-6">
            <h2 class="font-display text-2xl">Payment</h2>
            <p class="mt-2 text-sm text-cocoa-700">
              Online payment isn't available yet. Place your order and we'll contact you to arrange payment before it's
              dispatched. We never ask for card details on this site.
            </p>
          </div>
        </div>

        <aside class="h-fit rounded-3xl bg-cream-100 p-8 lg:sticky lg:top-24" aria-label="Order summary">
          <h2 class="text-2xl">Your order</h2>
          <ul v-if="cart.quote.value" class="mt-6 space-y-4">
            <li v-for="line in cart.quote.value.lines" :key="line.productId" class="flex items-center gap-4">
              <ProductImage :image="line.image" :label="line.name" :width="160" class="h-16 w-14 shrink-0 rounded-xl" />
              <div class="flex-1 text-sm">
                <p class="font-medium">{{ line.name }}</p>
                <p class="text-cocoa-500">Qty {{ line.quantity }}</p>
              </div>
              <p class="text-sm font-medium">{{ money(line.lineTotal) }}</p>
            </li>
          </ul>
          <ul
            v-if="cart.quote.value?.issues.length"
            role="alert"
            class="mt-6 space-y-1 rounded-xl bg-gold-400/15 px-4 py-3 text-xs"
          >
            <li v-for="issue in cart.quote.value.issues" :key="issue.productId">{{ issue.message }}</li>
          </ul>
          <div class="mt-6 border-t border-cocoa-900/10 pt-6">
            <OrderSummary v-if="cart.quote.value" :quote="cart.quote.value" />
            <p v-else class="text-sm text-cocoa-500">Calculating…</p>
          </div>
          <p v-if="formError" role="alert" class="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{{ formError }}</p>
          <button
            type="submit"
            class="btn-primary mt-8 w-full"
            :disabled="placing || cart.quoting.value || !cart.quote.value?.lines.length"
          >
            {{ placing ? 'Placing order…' : `Place order${cart.quote.value ? ` — ${money(cart.quote.value.total)}` : ''}` }}
          </button>
          <NuxtLink to="/cart" class="mt-4 block text-center text-sm text-cocoa-700 hover:underline">← Back to bag</NuxtLink>
        </aside>
      </form>
      <template #fallback>
        <p class="py-24 text-center text-cocoa-500">Loading checkout…</p>
      </template>
    </ClientOnly>
  </section>
</template>
