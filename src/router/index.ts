import { createRouter, createWebHistory } from 'vue-router';

// Views
import CardEditorView from '@/views/CardEditorView.vue';
import DashboardView from '@/views/DashboardView.vue';
import DeckManagerView from '@/views/DeckManagerView.vue';
import SettingsView from '@/views/SettingsView.vue';
import StatisticsView from '@/views/StatisticsView.vue';
import StudySessionView from '@/views/StudySessionView.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: DashboardView
  },
  {
    path: '/decks',
    name: 'decks',
    component: DeckManagerView
  },
  {
    path: '/decks/:id/cards',
    name: 'editCards',
    component: CardEditorView,
    props: true
  },
  {
    path: '/study',
    name: 'study',
    component: StudySessionView
  },
  {
    path: '/study/:deckId',
    name: 'studyDeck',
    component: StudySessionView,
    props: true
  },
  {
    path: '/stats',
    name: 'stats',
    component: StatisticsView
  },
  {
    path: '/ai-generate',
    name: 'ai-generate',
    component: () => import('@/views/AIGeneratorView.vue')
  },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView
  },

  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue')
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('@/views/RegisterView.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

import { supabase } from '@/lib/supabase';

router.beforeEach(async (to, from, next) => {
  const { data: { session } } = await supabase.auth.getSession();

  if (to.name !== 'login' && to.name !== 'register' && !session) {
    next({ name: 'login' });
  } else if ((to.name === 'login' || to.name === 'register') && session) {
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;
