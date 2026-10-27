<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    type?: string;
    autocomplete?: string;
    required?: boolean;
    error?: string;
    hint?: string;
  }>(),
  {
    type: "text",
    autocomplete: undefined,
    required: false,
    error: undefined,
    hint: undefined,
  },
);

const model = defineModel<string>({ default: "" });
const id = useId();
const describedBy = computed(
  () =>
    [props.hint && `${id}-hint`, props.error && `${id}-error`]
      .filter(Boolean)
      .join(" ") || undefined,
);
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="id" class="text-sm font-medium text-cocoa-800">
      {{ label }}
      <span v-if="required" aria-hidden="true" class="text-gold-600">*</span>
    </label>
    <input
      :id="id"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="rounded-xl border bg-white/70 px-4 py-3 text-cocoa-900 transition placeholder:text-cocoa-500/60 focus:border-gold-500 focus:outline-none"
      :class="error ? 'border-red-700/60' : 'border-cocoa-900/15'"
    />
    <p v-if="hint && !error" :id="`${id}-hint`" class="text-xs text-cocoa-500">
      {{ hint }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="text-xs text-red-800">
      {{ error }}
    </p>
  </div>
</template>
