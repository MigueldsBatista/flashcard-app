<script setup lang="ts">
interface Props {
  class?: string
}

defineProps<Props>()
</script>

<template>
  <div
    :class="[
      'rounded-xl bg-card text-card-foreground shadow-lg',
      $props.class,
    ]"
  >
    <slot />
  </div>
</template>
