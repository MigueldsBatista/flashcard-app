import { useFlashcardStore } from '@/stores/flashcard';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase
// Mock Supabase
vi.mock('@/lib/supabase', async () => {
  const { mockSupabase } = await import('./supabase_mock');
  return {
    supabase: mockSupabase
  };
});

/**
 * Gherkin-style Test Specification: Dashboard
 *
 * Feature: Dashboard with Readiness Score and Progress Display
 *   As a user
 *   I want to see my study progress and readiness score
 *   So that I can track my learning performance
 */

describe('Dashboard Feature', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  /**
     * Scenario: Good Case - Display correct readiness score with no overdue cards
     *   Given I have 10 cards in my deck
     *   And none of them are overdue
     *   When I view the dashboard
     *   Then I should see a readiness score of 100%
     */
  it('should show 100% readiness when no cards are overdue', async () => {
    const store = useFlashcardStore();

    // Given: I have 10 cards, none overdue
    await store.addDeck({ name: 'Test Deck', color: '#3B82F6' });
    const deckId = store.decks[0]!.id;

    for (let i = 0; i < 10; i++) {
      await store.addCard({
        deckId,
        content: { front: `Question ${i}`, back: `Answer ${i}`, type: 'text' },
        status: 'review',
        interval: 7,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Future date
      });
    }

    // When & Then: Readiness should be 100
    expect(store.stats.readinessScore).toBe(100);
  });

  /**
     * Scenario: Edge Case - Empty state with no cards
     *   Given I have no cards
     *   When I view the dashboard
     *   Then I should see a readiness score of 100%
     *   And the study button should be disabled
     */
  it('should show 100% readiness with empty state', () => {
    const store = useFlashcardStore();

    // Given: No cards
    // When & Then
    expect(store.stats.totalCards).toBe(0);
    expect(store.stats.readinessScore).toBe(100);
    expect(store.stats.dueCards).toBe(0);
  });

  /**
     * Scenario: Bad Case - Display warning with overdue cards
     *   Given I have 10 cards in my deck
     *   And 5 of them are overdue (past due date)
     *   When I view the dashboard
     *   Then I should see a reduced readiness score
     */
  it('should reduce readiness score when cards are overdue', async () => {
    const store = useFlashcardStore();

    // Given: 10 cards, 5 overdue
    await store.addDeck({ name: 'Test Deck', color: '#3B82F6' });
    const deckId = store.decks[0]!.id;

    for (let i = 0; i < 5; i++) {
      await store.addCard({
        deckId,
        content: { front: `Question ${i}`, back: `Answer ${i}`, type: 'text' },
        status: 'review',
        interval: 7,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        nextReview: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // Past date (overdue)
      });
    }

    for (let i = 5; i < 10; i++) {
      await store.addCard({
        deckId,
        content: { front: `Question ${i}`, back: `Answer ${i}`, type: 'text' },
        status: 'review',
        interval: 7,
        easeFactor: 2.5,
        repetitions: 3,
        lapses: 0,
        nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    // When & Then: Readiness should be reduced
    expect(store.stats.readinessScore).toBeLessThan(100);
    expect(store.stats.overdueCards).toBe(5);
  });

  /**
     * Scenario: Good Case - Statistics are updated after study
     *   Given I have reviewed 5 cards today
     *   When I view the dashboard
     *   Then I should see 5 cards reviewed in today's stats
     */
  it('should track today\'s reviewed cards', async () => {
    const store = useFlashcardStore();

    // Given
    await store.addDeck({ name: 'Test Deck', color: '#3B82F6' });
    const deckId = store.decks[0]!.id;

    for (let i = 0; i < 5; i++) {
      await store.addCard({
        deckId,
        content: { front: `Q${i}`, back: `A${i}`, type: 'text' },
        status: 'new',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        nextReview: new Date()
      });
    }

    // When: Start session and review cards
    store.startStudySession(deckId);
    for (const card of store.cards) {
      await store.reviewCard(card.id, 'good');
    }
    await store.endStudySession();

    // Then
    expect(store.stats.today.cardsReviewed).toBe(5);
  });
});
