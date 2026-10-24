<script setup lang="ts">
import type { ImageDTO } from '#shared/types/api'

const props = withDefaults(
  defineProps<{
    image: ImageDTO | null
    /** Fallback alt text, usually the product name. */
    label: string
    sizes?: string
    width?: number
    priority?: boolean
  }>(),
  { sizes: '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw', width: 640, priority: false },
)

const failed = ref(false)
const src = computed(() => (props.image ? imageUrl(props.image.url, props.width) : ''))
const srcset = computed(() => (props.image ? imageSrcset(props.image.url) : undefined))
const initial = computed(() => props.label.trim().charAt(0).toUpperCase())
</script>

<template>
  <div class="relative overflow-hidden bg-cream-200">
    <img
      v-if="image && !failed"
      :src="src"
      :srcset="srcset"
      :sizes="srcset ? sizes : undefined"
      :alt="image.alt || label"
      :width="image.width"
      :height="image.height"
      :loading="priority ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : undefined"
      decoding="async"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <!-- Elegant placeholder when an image is missing or fails to load. -->
    <div
      v-else
      role="img"
      :aria-label="label"
      class="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,#f6eee2,#ecdfcb_60%,#d8c3a5)]"
    >
      <span aria-hidden="true" class="font-display text-6xl text-cocoa-700/40">{{ initial }}</span>
    </div>
  </div>
</template>
