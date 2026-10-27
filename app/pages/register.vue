<script setup lang="ts">
import { PASSWORD_MIN_LENGTH } from "#shared/constants";

useSeoMeta({ title: "Create an account", robots: "noindex" });

const route = useRoute();
const auth = useAuth();
const form = reactive({ name: "", email: "", password: "" });
const fieldErrors = ref<Record<string, string>>({});
const error = ref("");
const pending = ref(false);

async function submit() {
  error.value = "";
  fieldErrors.value = {};
  pending.value = true;
  try {
    await auth.register(form.name, form.email, form.password);
    await navigateTo(safeRedirect(route.query.redirect, "/account"));
  } catch (e) {
    fieldErrors.value = apiFieldErrors(e);
    if (!Object.keys(fieldErrors.value).length)
      error.value = apiErrorMessage(e);
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <section class="container-page flex justify-center py-20">
    <div class="w-full max-w-md">
      <p class="eyebrow text-center">Join us</p>
      <h1 class="mt-3 text-center text-4xl">Create an account</h1>
      <p class="mt-3 text-center text-sm text-cocoa-700">
        Track orders and check out faster. Always optional.
      </p>

      <form
        class="mt-10 flex flex-col gap-5"
        novalidate
        @submit.prevent="submit"
      >
        <FormField
          v-model="form.name"
          label="Name"
          autocomplete="name"
          required
          :error="fieldErrors.name"
        />
        <FormField
          v-model="form.email"
          label="Email"
          type="email"
          autocomplete="email"
          required
          :error="fieldErrors.email"
        />
        <FormField
          v-model="form.password"
          label="Password"
          type="password"
          autocomplete="new-password"
          required
          :hint="`At least ${PASSWORD_MIN_LENGTH} characters`"
          :error="fieldErrors.password"
        />
        <p
          v-if="error"
          role="alert"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {{ error }}
        </p>
        <button type="submit" class="btn-primary mt-2" :disabled="pending">
          {{ pending ? "Creating account…" : "Create account" }}
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-cocoa-700">
        Already have an account?
        <NuxtLink
          to="/login"
          class="font-semibold text-gold-600 hover:underline"
          >Sign in</NuxtLink
        >
      </p>
    </div>
  </section>
</template>
