<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const colors = [
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Roxo', value: '#A855F7' },
  { name: 'Amarelo', value: '#EAB308' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Ciano', value: '#06B6D4' },
]

const isOpen = ref(false)

const selectedColor = computed(() => {
  return colors.find(c => c.value === props.modelValue) || colors[0]
})

function selectColor(color: string) {
  emit('update:modelValue', color)
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
      @click="isOpen = !isOpen"
    >
      <div
        class="w-5 h-5 rounded-md border border-border"
        :style="{ backgroundColor: selectedColor?.value }"
      />
      <span class="text-xs font-medium text-muted-foreground hidden sm:inline">
        {{ selectedColor?.name }}
      </span>
    </button>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute top-full left-0 mt-1 p-2 bg-card rounded-lg border border-border shadow-lg z-50 grid grid-cols-4 gap-1.5"
    >
      <button
        v-for="color in colors"
        :key="color.value"
        type="button"
        class="w-8 h-8 rounded-md transition-transform hover:scale-110"
        :class="[
          modelValue === color.value ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
        ]"
        :style="{ backgroundColor: color.value }"
        :title="color.name"
        @click="selectColor(color.value)"
      />
    </div>

    <!-- Click outside to close -->
    <div
      v-if="isOpen"
      class="fixed inset-0 z-40"
      @click="isOpen = false"
    />
  </div>
</template>
