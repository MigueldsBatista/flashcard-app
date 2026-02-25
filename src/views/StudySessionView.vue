<script setup lang="ts">
import CardRenderer from '@/components/CardRenderer.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import Progress from '@/components/ui/Progress.vue';
import { useNotifications } from '@/composables/useNotifications';
import { useStudySession } from '@/composables/useStudySession';
import { getDueCards, getNewCards, prioritizeCards } from '@/services/spaced-repetition';
import { useFlashcardStore } from '@/stores/flashcard';
import type { CardDifficulty } from '@/types/flashcard';
import { useEventListener } from '@vueuse/core';
import { ArrowLeft, Calendar, CheckCircle2, RotateCcw } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const store = useFlashcardStore();
const { success } = useNotifications();

const deckId = computed(() => route.params.deckId as string | undefined);

const {
  currentCard,
  currentCardIndex,
  studyCards,
  studiedCount,
  correctCount,
  showAnswer,
  isAnimating,
  animationClass,
  progress,
  isComplete,
  initializeSession,
  handleReveal,
  handleReview: reviewWithAnimation,
  clearSession
} = useStudySession();

const difficultyButtons = [
  { label: 'Esqueci', value: 'forgot' as CardDifficulty, color: 'bg-destructive hover:bg-destructive-hover', time: '10min' },
  { label: 'Difícil', value: 'hard' as CardDifficulty, color: 'bg-warning hover:bg-warning-hover', time: '1d' },
  { label: 'Bom', value: 'good' as CardDifficulty, color: 'bg-primary hover:bg-primary-hover', time: '3d' },
  { label: 'Fácil', value: 'easy' as CardDifficulty, color: 'bg-success hover:bg-success-hover', time: '7d' }
];

function init() {
  let currentContextId = 'random';
  if (deckId.value) {
    currentContextId = `deck:${deckId.value}`;
    store.startStudySession(deckId.value);
  } else if (route.query.decks) {
    const deckIds = (route.query.decks as string).split(',');
    currentContextId = `decks:${deckIds.join(',')}`;
    if (deckIds[0]) {
      store.startStudySession(deckIds[0]);
    }
  } else {
    currentContextId = 'random';
    const firstDeck = store.decks[0];
    if (firstDeck) {
      store.startStudySession(firstDeck.id);
    }
  }

  initializeSession(currentContextId, () => {
    let filteredCards = store.cards;

    if (deckId.value) {
      filteredCards = store.cards.filter(card => card.deckId === deckId.value);
    } else if (route.query.decks) {
      const deckIds = (route.query.decks as string).split(',');
      filteredCards = store.cards.filter(card => deckIds.includes(card.deckId));
    }

    const dueCards = getDueCards(filteredCards);
    const newCards = getNewCards(filteredCards, store.settings.dailyNewCardLimit);
    return prioritizeCards([...dueCards, ...newCards]);
  });
}

onMounted(() => {
  if (store.loading) {
    const unwatch = watch(() => store.loading, (isLoading) => {
      if (!isLoading) {
        init();
        unwatch();
      }
    });
  } else {
    init();
  }
});

useEventListener('keydown', handleKeyPress);

onUnmounted(() => {
  // Safety net: end session if it wasn't already ended by handleEndStudy
  if (store.currentSession) {
    store.endStudySession();
  }
});

function handleKeyPress(e: KeyboardEvent) {
  if (!showAnswer.value && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault();
    handleReveal();
  } else if (showAnswer.value) {
    switch (e.key) {
      case '1': handleReviewWrapper('forgot'); break;
      case '2': handleReviewWrapper('hard'); break;
      case '3': handleReviewWrapper('good'); break;
      case '4': handleReviewWrapper('easy'); break;
    }
  }
}

function handleReviewWrapper(difficulty: CardDifficulty) {
  if (!currentCard.value || isAnimating.value) return;

  // Trigger haptic feedback if supported
  if (store.settings.hapticFeedback && 'vibrate' in navigator) {
    if (difficulty === 'forgot') {
      navigator.vibrate([50, 50, 50]);
    } else if (difficulty === 'easy') {
      navigator.vibrate([100, 50, 100]);
    } else {
      navigator.vibrate(50);
    }
  }

  // Record review in the database/store
  store.reviewCard(currentCard.value.id, difficulty);

  reviewWithAnimation(difficulty, () => {
    handleCompleteWrapper();
  });
}

function handleCompleteWrapper() {
  if (store.settings.hapticFeedback && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100, 50, 100]);
  }
  isAnimating.value = false;
}

async function handleEndStudy() {
  await store.endStudySession();
  clearSession();
  success('Sessão concluída!');
  router.push('/');
}

function formatCooldown(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return 'Novos cartões estão prontos agora!';

  const minutes = Math.ceil(diff / (1000 * 60));
  if (minutes < 60) return `Próximos cartões em ${minutes} minutos.`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Próximos cartões em aproximadamente ${hours} horas.`;

  return 'Próximos cartões amanhã.';
}
</script>

<template>
  <!-- Loading State -->
  <div
    v-if="store.loading"
    class="min-h-screen bg-background flex items-center justify-center p-4"
  >
    <LoadingState message="Preparando sessão de estudos..." />
  </div>

  <!-- Session Complete -->
  <div
    v-else-if="isComplete"
    class="min-h-screen bg-background flex items-center justify-center p-4"
  >
    <Card class="p-6 sm:p-8 max-w-md w-full text-center">
      <CheckCircle2 class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-success mb-3" />
      <h2 class="text-xl sm:text-2xl font-bold text-foreground mb-2">
        Parabéns!
      </h2>
      <p class="text-sm text-muted-foreground mb-4">
        Você completou todos os cartões disponíveis!
      </p>
      <div
        v-if="store.stats.nextAvailableCardDate"
        class="mb-4 p-2 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center gap-2 text-primary text-sm font-medium"
      >
        <Calendar class="w-4 h-4" />
        {{ formatCooldown(store.stats.nextAvailableCardDate) }}
      </div>
      <div class="bg-muted/50 rounded-lg p-3 mb-4">
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p class="text-muted-foreground text-xs">Estudados</p>
            <p class="text-xl font-bold text-foreground">{{ studiedCount }}</p>
          </div>
          <div>
            <p class="text-muted-foreground text-xs">Precisão</p>
            <p class="text-xl font-bold text-success">
              {{ studiedCount > 0 ? Math.round((correctCount / studiedCount) * 100) : 0 }}%
            </p>
          </div>
        </div>
      </div>
      <Button
        class="w-full"
        @click="handleEndStudy"
      >
        Voltar ao Dashboard
      </Button>
    </Card>
  </div>

  <!-- Study Session -->
  <div
    v-else
    class="h-screen bg-background flex flex-col overflow-hidden"
  >
    <!-- Header - compact -->
    <div class="bg-card border-b border-border p-3">
      <div class="max-w-2xl mx-auto">
        <div class="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            class="p-1.5"
            @click="handleEndStudy"
          >
            <ArrowLeft class="w-5 h-5" />
          </Button>
          <div class="text-sm font-medium text-muted-foreground">
            {{ currentCardIndex + 1 }} / {{ studyCards.length }}
          </div>
          <div class="w-8" />
        </div>
        <Progress :value="progress" />
      </div>
    </div>

    <!-- Card Display - centered and compact -->
    <div class="flex-1 flex items-center justify-center p-4 overflow-hidden">
      <div class="max-w-2xl w-full">
        <Card
          v-if="currentCard"
          :class="`p-5 sm:p-6 shadow-xl ${animationClass}`"
        >
          <CardRenderer
            :card="currentCard"
            :show-answer="showAnswer"
          />

          <div
            v-if="!showAnswer"
            class="mt-6 text-center"
          >
            <Button
              size="lg"
              class="px-6 py-4 text-base font-semibold rounded-xl shadow-lg"
              @click="handleReveal"
            >
              <RotateCcw class="w-4 h-4 mr-2" />
              Revelar Resposta
            </Button>
            <p class="text-xs text-muted-foreground mt-3">
              ou pressione Espaço
            </p>
          </div>
        </Card>
      </div>
    </div>

    <!-- Difficulty Buttons - compact -->
    <div
      v-if="showAnswer"
      class="bg-card border-t border-border p-3 pb-6"
    >
      <div class="max-w-2xl mx-auto">
        <p class="text-xs text-center text-muted-foreground mb-2">
          Como foi a dificuldade?
        </p>
        <div class="grid grid-cols-4 gap-1.5">
          <button
            v-for="btn in difficultyButtons"
            :key="btn.value"
            :class="[btn.color, 'text-white h-14 flex flex-col items-center justify-center gap-0.5 rounded-lg shadow-md transition-colors text-xs']"
            :disabled="isAnimating"
            @click="handleReviewWrapper(btn.value)"
          >
            <span class="opacity-80">{{ btn.time }}</span>
            <span class="font-semibold">{{ btn.label }}</span>
          </button>
        </div>
        <div class="mt-2 text-xs text-center text-muted-foreground">
          <p>Use as teclas 1-4</p>
        </div>
      </div>
    </div>
  </div>
</template>
