<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { BarChart3, FolderOpen, Home, LogOut, Settings, Sparkles } from 'lucide-vue-next';

interface Props {
  currentView: string;
}

defineProps<Props>();

const emit = defineEmits<{
  navigate: [view: string];
}>();

const authStore = useAuthStore();

const navItems = [
  { id: 'home', icon: Home, label: 'Início' },
  { id: 'decks', icon: FolderOpen, label: 'Baralhos' },
  { id: 'ai-generate', icon: Sparkles, label: 'Gerar com IA' },
  { id: 'stats', icon: BarChart3, label: 'Estatísticas' },
  { id: 'settings', icon: Settings, label: 'Ajustes' }
];

function handleLogout() {
  authStore.signOut();
}
</script>

<template>
  <aside class="hidden md:flex flex-col w-64 h-screen bg-card border-r border-border sticky top-0 left-0 z-50">
    <div class="p-6">
      <h1 class="text-2xl font-bold text-primary flex items-center gap-2">
        <span class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Home class="w-5 h-5 text-primary-foreground" />
        </span>
        Ultra Focus
      </h1>
    </div>

    <nav class="flex-1 px-4 space-y-2">
      <button
        v-for="item in navItems"
        :key="item.id"
        :class="[
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
          currentView === item.id
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        ]"
        @click="emit('navigate', item.id)"
      >
        <component
          :is="item.icon"
          :class="[
            'w-5 h-5 transition-transform group-hover:scale-110',
            currentView === item.id ? 'text-primary-foreground' : 'text-muted-foreground'
          ]"
        />
        <span class="font-medium">{{ item.label }}</span>
      </button>
    </nav>

    <div class="p-4 border-t border-border">
      <div
        v-if="authStore.user"
        class="mb-4 px-4 flex items-center gap-3"
      >
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
          <span class="text-primary font-bold">{{ authStore.user.email?.[0]?.toUpperCase() ?? 'U' }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold truncate text-foreground">{{ authStore.user.email?.split('@')[0] ?? 'User' }}</p>
          <p class="text-xs text-muted-foreground truncate">{{ authStore.user.email ?? '' }}</p>
        </div>
      </div>

      <button
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors group"
        @click="handleLogout"
      >
        <LogOut class="w-5 h-5 transition-transform group-hover:scale-110" />
        <span class="font-medium">Sair</span>
      </button>
    </div>
  </aside>
</template>
