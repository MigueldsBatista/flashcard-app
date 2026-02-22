<script setup lang="ts">
import { Redo2, Undo2 } from 'lucide-vue-next';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  undo: [];
  redo: [];
}>();
</script>

<template>
  <div class="flex items-center gap-1">
    <button
      type="button"
      :disabled="!canUndo"
      class="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
      title="Desfazer (Ctrl+Z)"
      @click="emit('undo')"
    >
      <Undo2 class="w-4 h-4 text-muted-foreground" />
    </button>
    <button
      type="button"
      :disabled="!canRedo"
      class="p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted"
      title="Refazer (Ctrl+Shift+Z)"
      @click="emit('redo')"
    >
      <Redo2 class="w-4 h-4 text-muted-foreground" />
    </button>
  </div>
</template>
