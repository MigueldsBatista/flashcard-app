<script setup lang="ts">
import { BarChart3, FolderOpen, Home, Settings } from 'lucide-vue-next';

interface Props {
  currentView: string
}

defineProps<Props>()

const emit = defineEmits<{
  navigate: [view: string]
}>()

const navItems = [
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'decks', icon: FolderOpen, label: 'Baralhos' },
  { id: 'stats', icon: BarChart3, label: 'Estatísticas' },
  { id: 'settings', icon: Settings, label: 'Ajustes' },
]
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-inset-bottom z-50">
    <div class="max-w-2xl mx-auto">
      <div class="grid grid-cols-4 gap-1 p-2">
        <button
          v-for="item in navItems"
          :key="item.id"
          :class="[
            'flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-colors',
            currentView === item.id
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent',
          ]"
          @click="emit('navigate', item.id)"
        >
          <component :is="item.icon" class="w-5 h-5 mb-1" />
          <span class="text-xs font-medium">{{ item.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
