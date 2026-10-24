<script setup lang="ts">
const props = defineProps<{ page: number; totalPages: number }>()
const route = useRoute()

function linkTo(page: number) {
  return { path: route.path, query: { ...route.query, page: page > 1 ? String(page) : undefined } }
}

/** Compact page list: 1 … 4 5 6 … 12 */
const pages = computed(() => {
  const { page, totalPages } = props
  const set = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages))
  const sorted = [...set].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("gap")
    out.push(p)
  })
  return out
})
</script>

<template>
  <nav v-if="totalPages > 1" aria-label="Pagination" class="mt-16 flex items-center justify-center gap-2 text-sm">
    <NuxtLink
      v-if="page > 1"
      :to="linkTo(page - 1)"
      class="rounded-full px-4 py-2 hover:bg-cream-200"
      rel="prev"
    >
      ← Previous
    </NuxtLink>
    <template v-for="(p, i) in pages" :key="i">
      <span v-if="p === 'gap'" class="px-2 text-cocoa-500" aria-hidden="true">…</span>
      <NuxtLink
        v-else
        :to="linkTo(p)"
        class="grid h-10 w-10 place-items-center rounded-full"
        :class="p === page ? 'bg-cocoa-900 text-cream-100' : 'hover:bg-cream-200'"
        :aria-current="p === page ? 'page' : undefined"
        :aria-label="`Page ${p}`"
      >
        {{ p }}
      </NuxtLink>
    </template>
    <NuxtLink
      v-if="page < totalPages"
      :to="linkTo(page + 1)"
      class="rounded-full px-4 py-2 hover:bg-cream-200"
      rel="next"
    >
      Next →
    </NuxtLink>
  </nav>
</template>
