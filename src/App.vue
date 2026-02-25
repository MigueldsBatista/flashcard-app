<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { useFlashcardStore } from '@/stores/flashcard';
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Components
import BottomNav from '@/components/BottomNav.vue';
import NavigationDrawer from '@/components/NavigationDrawer.vue';
import Toast from '@/components/Toast.vue';

const route = useRoute();
const router = useRouter();
const store = useFlashcardStore();
const authStore = useAuthStore();

if (authStore.user) {
  store.fetchAll();
}

// Apply dark mode on mount
onMounted(() => {
  document.documentElement.classList.toggle('dark', store.settings.darkMode);
});

// Watch for dark mode changes
watch(() => store.settings.darkMode, (isDark) => {
  document.documentElement.classList.toggle('dark', isDark);
});

// Watch for auth changes
watch(() => authStore.user, async (user) => {
  if (user) {
    await store.fetchAll();
  } else {
    // Clear data on logout
    store.decks = [];
    store.cards = [];
    store.sessions = [];
  }
});

function handleNavigate(view: string) {
  router.push({ name: view });
}

const currentView = computed(() => {
  const name = route.name as string;
  if (name === 'home') return 'home';
  if (name === 'decks' || name === 'editCards') return 'decks';
  if (name === 'ai-generate') return 'ai-generate';
  if (name === 'stats') return 'stats';
  if (name === 'settings') return 'settings';
  if (name === 'study' || name === 'studyDeck') return 'study';
  return 'home';
});

const showNavigationDrawer = computed(() => {
  return !['study', 'editCards', 'studyDeck', 'login', 'register'].includes(route.name as string);
});
</script>

<template>
  <div class="min-h-screen bg-background flex flex-col md:flex-row">
    <!-- Sidebar for Tablet/Desktop -->
    <navigation-drawer
      v-if="showNavigationDrawer"
      :current-view="currentView"
      @navigate="handleNavigate"
    />

    <!-- Main Content -->
    <main class="flex-1 w-full max-w-full">
      <router-view v-slot="{ Component }">
        <component :is="Component" />
      </router-view>
    </main>

    <!-- Bottom Navigation -->
    <bottom-nav
      v-if="showNavigationDrawer"
      :current-view="currentView"
      @navigate="handleNavigate"
    />

    <!-- Toast Notifications -->
    <toast />
  </div>
</template>
