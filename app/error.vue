<script setup lang="ts">
import type { NuxtError } from "#app";

const props = defineProps<{ error: NuxtError }>();
const notFound = computed(() => props.error.statusCode === 404);

useSeoMeta({
  title: notFound.value ? "Page not found" : "Something went wrong",
  robots: "noindex",
});
</script>

<template>
  <NuxtLayout>
    <section class="container-page py-32 text-center">
      <p class="eyebrow">{{ error.statusCode }}</p>
      <h1 class="mt-4 text-5xl">
        {{ notFound ? "This page has melted away" : "Something went wrong" }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-cocoa-700">
        {{
          notFound
            ? "We couldn't find what you were looking for."
            : "Please try again in a moment."
        }}
      </p>
      <button
        type="button"
        class="btn-primary mt-10"
        @click="clearError({ redirect: '/' })"
      >
        Return home
      </button>
    </section>
  </NuxtLayout>
</template>
