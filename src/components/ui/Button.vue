<script setup lang="ts">
interface Props {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  disabled: false
});

const variantClasses = {
  default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
  outline: 'border border-border bg-transparent hover:bg-accent',
  ghost: 'bg-transparent hover:bg-accent',
  destructive: 'bg-destructive text-white hover:bg-destructive-hover'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
};
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
      variantClasses[props.variant],
      sizeClasses[props.size],
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
