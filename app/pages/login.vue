<script setup lang="ts">
useSeoMeta({ title: "Sign in", robots: "noindex" })

const route = useRoute()
const auth = useAuth()
const form = reactive({ email: "", password: "" })
const error = ref("")
const pending = ref(false)

async function submit() {
  error.value = ""
  pending.value = true
  try {
    const user = await auth.login(form.email, form.password)
    const fallback = user.role === "admin" ? "/admin" : "/account"
    await navigateTo(safeRedirect(route.query.redirect, fallback))
  } catch (e) {
    error.value = apiErrorMessage(e, "Unable to sign in. Please try again.")
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="container-page flex justify-center py-20">
    <div class="w-full max-w-md">
      <p class="eyebrow text-center">Welcome back</p>
      <h1 class="mt-3 text-center text-4xl">Sign in</h1>

      <form class="mt-10 flex flex-col gap-5" novalidate @submit.prevent="submit">
        <FormField v-model="form.email" label="Email" type="email" autocomplete="email" required />
        <FormField
          v-model="form.password"
          label="Password"
          type="password"
          autocomplete="current-password"
          required
        />
        <p v-if="error" role="alert" class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900">{{ error }}</p>
        <button type="submit" class="btn-primary mt-2" :disabled="pending">
          {{ pending ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-cocoa-700">
        New here?
        <NuxtLink
          :to="{ path: '/register', query: route.query.redirect ? { redirect: route.query.redirect } : {} }"
          class="font-semibold text-gold-600 hover:underline"
        >
          Create an account
        </NuxtLink>
        — or simply check out as a guest.
      </p>
    </div>
  </section>
</template>
