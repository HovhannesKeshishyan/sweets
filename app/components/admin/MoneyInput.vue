<script setup lang="ts">
/**
 * Edits an amount in minor units (cents) while showing major units to the admin.
 * Emits null when the field is empty.
 */
const props = withDefaults(
  defineProps<{
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
  }>(),
  {
    required: false,
    error: undefined,
    hint: undefined,
  },
);
const model = defineModel<number | null>({ default: null });
const { store } = useStore();
const id = useId();

const digits = computed(() => currencyFractionDigits(store.value.currency));
const text = ref("");
watch(
  model,
  (minor) => {
    const current =
      text.value.trim() === ""
        ? null
        : toMinorUnits(Number(text.value), store.value.currency);
    if (minor !== current)
      text.value =
        minor == null
          ? ""
          : toMajorUnits(minor, store.value.currency).toFixed(digits.value);
  },
  { immediate: true },
);

function onInput(value: string) {
  text.value = value;
  const n = Number(value);
  model.value =
    value.trim() === "" || !Number.isFinite(n) || n < 0
      ? null
      : toMinorUnits(n, store.value.currency);
}
const describedBy = computed(
  () =>
    [props.hint && `${id}-hint`, props.error && `${id}-err`]
      .filter(Boolean)
      .join(" ") || undefined,
);
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-cocoa-800">
      {{ label }} <span class="text-cocoa-500">({{ store.currency }})</span>
      <span v-if="required" aria-hidden="true" class="text-gold-600">*</span>
    </label>
    <input
      :id="id"
      :value="text"
      type="number"
      inputmode="decimal"
      min="0"
      :step="digits ? (1 / 10 ** digits).toFixed(digits) : '1'"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="rounded-xl border bg-white px-4 py-2.5 focus:border-gold-500 focus:outline-none"
      :class="error ? 'border-red-700/60' : 'border-cocoa-900/15'"
      @input="onInput(($event.target as HTMLInputElement).value)"
    />
    <p v-if="hint && !error" :id="`${id}-hint`" class="text-xs text-cocoa-500">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${id}-err`" class="text-xs text-red-800">
      {{ error }}
    </p>
  </div>
</template>
