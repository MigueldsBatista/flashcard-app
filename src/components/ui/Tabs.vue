<script setup lang="ts">
import { ref, watch } from 'vue';

interface Props {
  modelValue?: string;
  tabs: Array<{ id: string; label: string; icon?: any }>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const activeTab = ref(props.modelValue || props.tabs[0]?.id);

watch(() => props.modelValue, (newVal) => {
  if (newVal) activeTab.value = newVal;
});

function selectTab(id: string) {
  activeTab.value = id;
  emit('update:modelValue', id);
}
</script>

<template>
  <div>
    <!-- Tab List -->
    <div class="flex bg-muted rounded-lg p-1 gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          activeTab === tab.id
            ? 'bg-card text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground',
        ]"
        @click="selectTab(tab.id)"
      >
        <component
          :is="tab.icon"
          v-if="tab.icon"
          class="w-4 h-4"
        />
        {{ tab.label }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="mt-4">
      <slot :active-tab="activeTab" />
    </div>
  </div>
</template>
