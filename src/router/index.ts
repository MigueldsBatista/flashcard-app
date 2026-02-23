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
  },
  {
    path: '/shared/:token',
    name: 'shared',
    component: () => import('@/views/SharedDeckView.vue'),
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

import { supabase } from '@/lib/supabase';

const publicRoutes = ['login', 'register', 'shared'];

router.beforeEach(async (to, _from, next) => {
  const { data: { session } } = await supabase.auth.getSession();

  const isPublicRoute = publicRoutes.includes(to.name as string);

  if (!isPublicRoute && !session) {
    // Redirect to login with returnUrl for shared links
    next({ name: 'login', query: { returnUrl: to.fullPath } });
  } else if ((to.name === 'login' || to.name === 'register') && session) {
    // If authenticated and accessing login/register, check returnUrl
    const returnUrl = to.query.returnUrl as string;
    if (returnUrl) {
      next(returnUrl);
    } else {
      next({ name: 'home' });
    }
  } else {
    next();
  }
});

export default router;
