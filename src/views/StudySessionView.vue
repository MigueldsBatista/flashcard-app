<script setup lang="ts">
import CardRenderer from '@/components/CardRenderer.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import Progress from '@/components/ui/Progress.vue';
import { useNotifications } from '@/composables/useNotifications';
import { getDueCards, getNewCards, prioritizeCards } from '@/services/spaced-repetition';
import { useFlashcardStore } from '@/stores/flashcard';
import type { CardDifficulty, Card as FlashCard } from '@/types/flashcard';
import { useEventListener } from '@vueuse/core';
import { ArrowLeft, Calendar, CheckCircle2, RotateCcw } from 'lucide-vue-next';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const store = useFlashcardStore();
const { success } = useNotifications();

const deckId = computed(() => route.params.deckId as string | undefined);

const currentCardIndex = ref(0);
const showAnswer = ref(false);
const studiedCount = ref(0);
const correctCount = ref(0);
const isAnimating = ref(false);
const animationClass = ref('');

// Snapshot of cards for this session (frozen on mount so reviews don't shift the list)
const studyCards = ref<FlashCard[]>([]);

const currentCard = computed(() => studyCards.value[currentCardIndex.value]);
const progress = computed(() => {
  return studyCards.value.length > 0
    ? ((currentCardIndex.value + 1) / studyCards.value.length) * 100
    : 0;
});

const difficultyButtons = [
  { label: 'Esqueci', value: 'forgot' as CardDifficulty, color: 'bg-destructive hover:bg-destructive-hover', time: '10min' },
  { label: 'Difícil', value: 'hard' as CardDifficulty, color: 'bg-warning hover:bg-warning-hover', time: '1d' },
  { label: 'Bom', value: 'good' as CardDifficulty, color: 'bg-primary hover:bg-primary-hover', time: '3d' },
  { label: 'Fácil', value: 'easy' as CardDifficulty, color: 'bg-success hover:bg-success-hover', time: '7d' }
];

onMounted(() => {
  // Snapshot the cards for this session so reviews don't shift the list
  let filteredCards = store.cards;

  if (deckId.value) {
    filteredCards = store.cards.filter(card => card.deckId === deckId.value);
  } else if (route.query.decks) {
    const deckIds = (route.query.decks as string).split(',');
    filteredCards = store.cards.filter(card => deckIds.includes(card.deckId));
  }

  const dueCards = getDueCards(filteredCards);
  const newCards = getNewCards(filteredCards, store.settings.dailyNewCardLimit);
  studyCards.value = prioritizeCards([...dueCards, ...newCards]);

  if (deckId.value) {
    store.startStudySession(deckId.value);
  } else if (route.query.decks) {
    const deckIds = (route.query.decks as string).split(',');
    if (deckIds[0]) {
      store.startStudySession(deckIds[0]);
    }
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
      case '1': handleReview('forgot'); break;
      case '2': handleReview('hard'); break;
      case '3': handleReview('good'); break;
      case '4': handleReview('easy'); break;
    }
  }
}

function handleReveal() {
  showAnswer.value = true;
}

function handleReview(difficulty: CardDifficulty) {
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

  store.reviewCard(currentCard.value.id, difficulty);
  studiedCount.value++;

  if (difficulty !== 'forgot') {
    correctCount.value++;
  }

  // Animate slide
  isAnimating.value = true;
  animationClass.value = difficulty === 'forgot' ? 'animate-slide-out-left' : 'animate-slide-out-right';

  setTimeout(() => {
    showAnswer.value = false;
    animationClass.value = '';

    if (currentCardIndex.value <= studyCards.value.length) {
      currentCardIndex.value++;
      animationClass.value = 'animate-slide-in-right';
      setTimeout(() => {
        animationClass.value = '';
        isAnimating.value = false;
      }, 300);
    } else {
      handleComplete();
    }
  }, 200);
}

function handleComplete() {
  if (store.settings.hapticFeedback && 'vibrate' in navigator) {
    navigator.vibrate([100, 50, 100, 50, 100]);
  }
  isAnimating.value = false;
}

async function handleEndStudy() {
  await store.endStudySession();
  success('Sessão concluída!');
  router.push('/');
}

const isComplete = computed(() => {

  return !currentCard.value ||
   (currentCardIndex.value >= studyCards.value.length && !showAnswer.value && studiedCount.value > 0);

});

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
  <!-- Session Complete -->
  <div
    v-if="isComplete"
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
            @click="handleReview(btn.value)"
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
