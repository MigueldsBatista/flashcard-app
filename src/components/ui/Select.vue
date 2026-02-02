<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { ref, watch } from 'vue';

interface Props {
  modelValue?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const selected = ref(props.modelValue || '')

watch(() => props.modelValue, (newVal) => {
  if (newVal !== undefined) selected.value = newVal
})

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === selected.value)
  return option?.label || props.placeholder || 'Selecione...'
})

function selectOption(value: string) {
  selected.value = value
  emit('update:modelValue', value)
  isOpen.value = false
}

function toggle() {
  isOpen.value = !isOpen.value
}

import { computed, onMounted, onUnmounted } from 'vue';

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.select-container')) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="select-container relative">
    <button
      type="button"
      class="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      @click="toggle"
    >
      <span :class="selected ? '' : 'text-muted-foreground'">
        {{ selectedLabel }}
      </span>
      <ChevronDown :class="['w-4 h-4 transition-transform', isOpen && 'rotate-180']" />
    </button>

    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden"
      >
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          :class="[
            'w-full px-3 py-2 text-left hover:bg-accent transition-colors',
            selected === option.value && 'bg-accent font-medium',
          ]"
          @click="selectOption(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
