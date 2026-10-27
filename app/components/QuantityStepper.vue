<script setup lang="ts">
const props = withDefaults(
  defineProps<{ max: number; min?: number; label: string }>(),
  { min: 1 },
);
const model = defineModel<number>({ required: true });

function set(value: number) {
  model.value = Math.max(
    props.min,
    Math.min(props.max, Math.floor(value) || props.min),
  );
}
</script>

<template>
  <div
    class="inline-flex items-center rounded-full border border-cocoa-900/20"
    role="group"
    :aria-label="label"
  >
    <button
      type="button"
      class="grid h-10 w-10 place-items-center rounded-full text-lg hover:bg-cream-200 disabled:opacity-30"
      :disabled="model <= min"
      aria-label="Decrease quantity"
      @click="set(model - 1)"
    >
      −
    </button>
    <input
      :value="model"
      type="number"
      inputmode="numeric"
      :min="min"
      :max="max"
      class="w-12 [appearance:textfield] bg-transparent text-center text-sm font-semibold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      :aria-label="`${label}, quantity`"
      @change="set(Number(($event.target as HTMLInputElement).value))"
    >
    <button
      type="button"
      class="grid h-10 w-10 place-items-center rounded-full text-lg hover:bg-cream-200 disabled:opacity-30"
      :disabled="model >= max"
      aria-label="Increase quantity"
      @click="set(model + 1)"
    >
      +
    </button>
  </div>
</template>
