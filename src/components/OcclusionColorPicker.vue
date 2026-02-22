<script setup lang="ts">
import { computed, ref } from 'vue';

interface Props {
  modelValue: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const colors = [
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Roxo', value: '#A855F7' },
  { name: 'Amarelo', value: '#EAB308' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Ciano', value: '#06B6D4' }
];

const isOpen = ref(false);
const buttonRef = ref<HTMLButtonElement | null>(null);

const selectedColor = computed(() => {
  return colors.find(c => c.value === props.modelValue) || colors[0];
});

function selectColor(color: string) {
  emit('update:modelValue', color);
  isOpen.value = false;
}

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div class="relative">
    <button
      ref="buttonRef"
      type="button"
      class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
      @click="toggleDropdown"
    >
      <div
        class="w-6 h-6 rounded-md border-2 border-white/50"
        :style="{ backgroundColor: selectedColor?.value }"
      />
    </button>

    <!-- Dropdown - positioned to avoid being cut off on mobile -->
    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-100"
        @click="isOpen = false"
      >
        <div
          class="absolute left-4 top-16 p-3 bg-card rounded-xl border border-border shadow-2xl"
          @click.stop
        >
          <p class="text-xs font-medium text-muted-foreground mb-2">Cor da oclusão</p>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="color in colors"
              :key="color.value"
              type="button"
              class="w-10 h-10 rounded-lg transition-transform hover:scale-105 active:scale-95 border-2"
              :class="[
                modelValue === color.value
                  ? 'border-white ring-2 ring-primary'
                  : 'border-white/30'
              ]"
              :style="{ backgroundColor: color.value }"
              :title="color.name"
              @click="selectColor(color.value)"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
