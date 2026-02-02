import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Card, Deck, StudyStats, UserSettings, CardDifficulty, StudySession } from '@/types/flashcard';
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  calculateNextReview,
  getDueCards,
  getNewCards,
  calculateReadinessScore,
} from '@/services/spaced-repetition';

interface FlashcardContextType {
  decks: Deck[];
  cards: Card[];
  settings: UserSettings;
  stats: StudyStats;
  currentSession: StudySession | null;
  addDeck: (deck: Omit<Deck, 'id' | 'created' | 'updated'>) => void;
  updateDeck: (id: string, updates: Partial<Deck>) => void;
  deleteDeck: (id: string) => void;
  addCard: (card: Omit<Card, 'id' | 'created'>) => void;
  updateCard: (id: string, updates: Partial<Card>) => void;
  deleteCard: (id: string) => void;
  reviewCard: (cardId: string, difficulty: CardDifficulty) => void;
  startStudySession: (deckId: string) => void;
  endStudySession: () => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
}

const FlashcardContext = createContext<FlashcardContextType | undefined>(undefined);

const DEFAULT_SETTINGS: UserSettings = {
  dailyNewCardLimit: 20,
  dailyReviewLimit: 200,
  darkMode: false,
  hapticFeedback: true,
  autoPlayAudio: false,
};

export function FlashcardProvider({ children }: { children: React.ReactNode }) {
  const [decks, setDecks] = useLocalStorage<Deck[]>('flashcards_decks', []);
  const [cards, setCards] = useLocalStorage<Card[]>('flashcards_cards', []);
  const [settings, setSettings] = useLocalStorage<UserSettings>('flashcards_settings', DEFAULT_SETTINGS);
  const [sessions, setSessions] = useLocalStorage<StudySession[]>('flashcards_sessions', []);
  const [currentSession, setCurrentSession] = useLocalStorage<StudySession | null>('flashcards_current_session', null);

  // Calculate statistics
  const stats = useMemo((): StudyStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    const dueCards = getDueCards(cards);
    const overdueCards = dueCards.filter(card => {
      const reviewDate = new Date(card.nextReview);
      return reviewDate < today;
    });

    const todaySessions = sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= today;
    });

    const cardsReviewedToday = todaySessions.reduce((sum, s) => sum + s.cardsStudied, 0);
    const newCardsToday = todaySessions.reduce((sum, s) => sum + s.newCards, 0);
    const totalAccuracy = todaySessions.length > 0
      ? todaySessions.reduce((sum, s) => sum + s.accuracy, 0) / todaySessions.length
      : 0;

    const timeSpent = todaySessions.reduce((sum, session) => {
      if (session.endTime) {
        const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
        return sum + duration / 1000 / 60; // Convert to minutes
      }
      return sum;
    }, 0);

    // Calculate streak
    const streak = calculateStreak(sessions);

    const readinessScore = calculateReadinessScore(
      cards.length,
      dueCards.length,
      overdueCards.length
    );

    const nextReviewsToday = cards.filter(card => {
      const reviewDate = new Date(card.nextReview);
      return reviewDate >= today && reviewDate < tomorrow;
    }).length;

    const nextReviewsTomorrow = cards.filter(card => {
      const reviewDate = new Date(card.nextReview);
      return reviewDate >= tomorrow && reviewDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
    }).length;

    const nextReviewsWeek = cards.filter(card => {
      const reviewDate = new Date(card.nextReview);
      return reviewDate >= today && reviewDate < weekFromNow;
    }).length;

    return {
      today: {
        cardsReviewed: cardsReviewedToday,
        newCards: newCardsToday,
        accuracy: totalAccuracy,
        timeSpent,
      },
      streak,
      totalCards: cards.length,
      dueCards: dueCards.length,
      overdueCards: overdueCards.length,
      readinessScore,
      nextReviews: {
        today: nextReviewsToday,
        tomorrow: nextReviewsTomorrow,
        week: nextReviewsWeek,
      },
    };
  }, [cards, sessions]);

  const addDeck = (deck: Omit<Deck, 'id' | 'created' | 'updated'>) => {
    const newDeck: Deck = {
      ...deck,
      id: generateId(),
      created: new Date(),
      updated: new Date(),
    };
    setDecks([...decks, newDeck]);
  };

  const updateDeck = (id: string, updates: Partial<Deck>) => {
    setDecks(decks.map(deck => 
      deck.id === id 
        ? { ...deck, ...updates, updated: new Date() }
        : deck
    ));
  };

  const deleteDeck = (id: string) => {
    setDecks(decks.filter(deck => deck.id !== id));
    // Also delete all cards in this deck
    setCards(cards.filter(card => card.deckId !== id));
  };

  const addCard = (card: Omit<Card, 'id' | 'created'>) => {
    const newCard: Card = {
      ...card,
      id: generateId(),
      created: new Date(),
    };
    setCards([...cards, newCard]);
  };

  const updateCard = (id: string, updates: Partial<Card>) => {
    setCards(cards.map(card => 
      card.id === id 
        ? { ...card, ...updates }
        : card
    ));
  };

  const deleteCard = (id: string) => {
    setCards(cards.filter(card => card.id !== id));
  };

  const reviewCard = (cardId: string, difficulty: CardDifficulty) => {
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const result = calculateNextReview(card, difficulty);
    updateCard(cardId, result.card);

    // Update current session
    if (currentSession) {
      const wasCorrect = difficulty !== 'forgot';
      const updatedSession = {
        ...currentSession,
        cardsStudied: currentSession.cardsStudied + 1,
        accuracy: ((currentSession.accuracy * currentSession.cardsStudied) + (wasCorrect ? 1 : 0)) / (currentSession.cardsStudied + 1),
      };
      setCurrentSession(updatedSession);
    }
  };

  const startStudySession = (deckId: string) => {
    const session: StudySession = {
      id: generateId(),
      deckId,
      startTime: new Date(),
      cardsStudied: 0,
      newCards: 0,
      reviewCards: 0,
      accuracy: 0,
    };
    setCurrentSession(session);
  };

  const endStudySession = () => {
    if (currentSession) {
      const completedSession = {
        ...currentSession,
        endTime: new Date(),
      };
      setSessions([...sessions, completedSession]);
      setCurrentSession(null);
    }
  };

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  return (
    <FlashcardContext.Provider
      value={{
        decks,
        cards,
        settings,
        stats,
        currentSession,
        addDeck,
        updateDeck,
        deleteDeck,
        addCard,
        updateCard,
        deleteCard,
        reviewCard,
        startStudySession,
        endStudySession,
        updateSettings,
      }}
    >
      {children}
    </FlashcardContext.Provider>
  );
}

export function useFlashcards() {
  const context = useContext(FlashcardContext);
  if (context === undefined) {
    throw new Error('useFlashcards must be used within a FlashcardProvider');
  }
  return context;
}

// Helper functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateStreak(sessions: StudySession[]): number {
  if (sessions.length === 0) return 0;

  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const hasSession = sortedSessions.some(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === currentDate.getTime();
    });

    if (hasSession) {
      streak++;
      currentDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      break;
    }
  }

  return streak;
}
