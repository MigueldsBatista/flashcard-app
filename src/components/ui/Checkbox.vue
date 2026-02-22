<script setup lang="ts">
import { Check } from 'lucide-vue-next';

interface Props {
  modelValue?: boolean;
  disabled?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
  label: ''
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function toggle() {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue);
  }
}
</script>

<template>
  <div
    class="flex items-center gap-2 cursor-pointer"
    @click="toggle"
  >
    <div
      role="checkbox"
      :aria-checked="modelValue"
      :class="[
        'flex items-center justify-center h-5 w-5 shrink-0 rounded border border-primary ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        modelValue ? 'bg-primary text-primary-foreground' : 'bg-transparent',
        disabled && 'opacity-50 cursor-not-allowed',
      ]"
    >
      <Check
        v-if="modelValue"
        class="h-3.5 w-3.5 font-bold"
      />
    </div>
    <label
      v-if="label"
      class="text-sm font-medium leading-none cursor-pointer select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {{ label }}
    </label>
  </div>
</template>
