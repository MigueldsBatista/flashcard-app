<script setup lang="ts">
interface Props {
  modelValue?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

defineProps<Props>();
defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>

<template>
  <input
    :value="modelValue"
    :type="type || 'text'"
    :placeholder="placeholder"
    :disabled="disabled"
    class="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
    @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
  >
</template>
