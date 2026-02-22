<script setup lang="ts">
interface Props {
  value: number;
  max?: number;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  max: 100
});

const percentage = Math.min(100, Math.max(0, (props.value / props.max) * 100));
</script>

<template>
  <div
    :class="['w-full bg-muted rounded-full overflow-hidden', props.class]"
    style="height: 8px;"
  >
    <div
      class="h-full bg-primary transition-all duration-300 rounded-full"
      :style="{ width: `${percentage}%` }"
    />
  </div>
</template>
