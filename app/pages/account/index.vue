<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Your account', robots: 'noindex' })

interface Profile {
  id: string
  email: string
  name: string
  phone: string | null
  createdAt: string | null
}

const auth = useAuth()
const { data, refresh } = await useFetch<{ profile: Profile }>('/api/account/profile', {
  headers: useRequestHeaders(['cookie']),
})

const form = reactive({ name: '', phone: '' })
watch(
  () => data.value?.profile,
  (p) => {
    form.name = p?.name ?? ''
    form.phone = p?.phone ?? ''
  },
  { immediate: true },
)

const fieldErrors = ref<Record<string, string>>({})
const status = ref<{ type: 'ok' | 'error'; text: string } | null>(null)
const saving = ref(false)

async function save() {
  saving.value = true
  status.value = null
  fieldErrors.value = {}
  try {
    await $fetch('/api/account/profile', {
      method: 'PATCH',
      body: { name: form.name, phone: form.phone.trim() ? form.phone : null },
    })
    await Promise.all([refresh(), auth.refresh()])
    status.value = { type: 'ok', text: 'Profile saved.' }
  } catch (e) {
    fieldErrors.value = apiFieldErrors(e)
    status.value = { type: 'error', text: apiErrorMessage(e) }
  } finally {
    saving.value = false
  }
}

async function signOut() {
  await auth.logout()
  await navigateTo('/')
}
</script>

<template>
  <section class="container-page py-16">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow">Your account</p>
        <h1 class="mt-2 text-4xl">Hello, {{ data?.profile.name }}</h1>
        <p class="mt-1 text-sm text-cocoa-700">{{ data?.profile.email }}</p>
      </div>
      <button type="button" class="btn-outline" @click="signOut">Sign out</button>
    </div>

    <NuxtLink
      to="/account/orders"
      class="mt-10 flex max-w-lg items-center justify-between rounded-3xl bg-cocoa-900 p-8 text-cream-100 transition hover:bg-cocoa-800"
    >
      <span>
        <span class="block font-display text-2xl">Your orders</span>
        <span class="text-sm text-cream-200/70">Track and review past orders</span>
      </span>
      <span aria-hidden="true" class="text-2xl text-gold-400">→</span>
    </NuxtLink>

    <div class="mt-8 max-w-lg rounded-3xl border border-cocoa-900/10 bg-white/60 p-8">
      <h2 class="text-2xl">Profile</h2>
      <form class="mt-6 flex flex-col gap-5" novalidate @submit.prevent="save">
        <FormField v-model="form.name" label="Name" autocomplete="name" required :error="fieldErrors.name" />
        <FormField v-model="form.phone" label="Phone" type="tel" autocomplete="tel" :error="fieldErrors.phone" />
        <p
          v-if="status"
          role="status"
          class="rounded-xl px-4 py-3 text-sm"
          :class="status.type === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'"
        >
          {{ status.text }}
        </p>
        <button type="submit" class="btn-primary self-start" :disabled="saving">
          {{ saving ? 'Saving…' : 'Save changes' }}
        </button>
      </form>
    </div>
  </section>
</template>
