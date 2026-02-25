import type { CardDifficulty, Card as FlashCard } from '@/types/flashcard';
import { useStorage } from '@vueuse/core';
import { computed, ref } from 'vue';

export interface StudySessionState {
  contextId: string;
  currentCardIndex: number;
  studiedCount: number;
  correctCount: number;
  studyCards: FlashCard[];
}

const defaultState: StudySessionState = {
  contextId: '',
  currentCardIndex: 0,
  studiedCount: 0,
  correctCount: 0,
  studyCards: []
};

export function useStudySession(customStorage: Storage = localStorage) {
  const sessionState = useStorage<StudySessionState>('flashcard-study-session', defaultState, customStorage);

  // Non-persisted UI state
  const showAnswer = ref(false);
  const isAnimating = ref(false);
  const animationClass = ref('');

  const currentCard = computed(() => sessionState.value.studyCards[sessionState.value.currentCardIndex]);

  const progress = computed(() => {
    return sessionState.value.studyCards.length > 0
      ? ((sessionState.value.currentCardIndex + 1) / sessionState.value.studyCards.length) * 100
      : 0;
  });

  const isComplete = computed(() => {
    return !currentCard.value ||
            (sessionState.value.currentCardIndex >= sessionState.value.studyCards.length && !showAnswer.value && sessionState.value.studiedCount > 0);
  });

  function initializeSession(contextId: string, generateCards: () => FlashCard[]) {
    // If the context ID matches and we have cards, resume the session
    if (sessionState.value.contextId === contextId && sessionState.value.studyCards.length > 0) {
      // Keep the current session
      showAnswer.value = false;
      isAnimating.value = false;
      animationClass.value = '';
      return;
    }

    // Otherwise, generate new cards and start a fresh session
    sessionState.value.contextId = contextId;
    sessionState.value.studyCards = generateCards();
    sessionState.value.currentCardIndex = 0;
    sessionState.value.studiedCount = 0;
    sessionState.value.correctCount = 0;

    showAnswer.value = false;
    isAnimating.value = false;
    animationClass.value = '';
  }

  function handleReveal() {
    showAnswer.value = true;
  }

  function handleReview(difficulty: CardDifficulty, onComplete: () => void) {
    if (!currentCard.value || isAnimating.value) return;

    sessionState.value.studiedCount++;

    if (difficulty !== 'forgot') {
      sessionState.value.correctCount++;
    }

    // Animate slide
    isAnimating.value = true;
    animationClass.value = difficulty === 'forgot' ? 'animate-slide-out-left' : 'animate-slide-out-right';

    setTimeout(() => {
      showAnswer.value = false;
      animationClass.value = '';

      if (sessionState.value.currentCardIndex <= sessionState.value.studyCards.length) {
        sessionState.value.currentCardIndex++;
        animationClass.value = 'animate-slide-in-right';
        setTimeout(() => {
          animationClass.value = '';
          isAnimating.value = false;
        }, 300);
      } else {
        isAnimating.value = false;
        onComplete();
      }
    }, 200);
  }

  function clearSession() {
    sessionState.value = { ...defaultState };
    showAnswer.value = false;
    isAnimating.value = false;
    animationClass.value = '';
  }

  return {
    // State properties (readonly recommended for components)
    sessionState: computed(() => sessionState.value),
    currentCard,
    currentCardIndex: computed(() => sessionState.value.currentCardIndex),
    studyCards: computed(() => sessionState.value.studyCards),
    studiedCount: computed(() => sessionState.value.studiedCount),
    correctCount: computed(() => sessionState.value.correctCount),
    showAnswer,
    isAnimating,
    animationClass,
    progress,
    isComplete,

    // Actions
    initializeSession,
    handleReveal,
    handleReview,
    clearSession
  };
}
