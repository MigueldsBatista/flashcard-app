import { useAuthStore } from '@/stores/auth';
import { useFlashcardStore } from '@/stores/flashcard';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Supabase
// Mock Supabase
// Mock Supabase
vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
      },
      from: vi.fn((table) => {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [] }),
          insert: vi.fn((data) => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'test-id-' + Math.random().toString(36).substring(2, 9),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  ...data
                },
                error: null
              })
            }))
          })),
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          })),
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null })
          }))
        };
      })
    }
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
    const authStore = useAuthStore();
    // @ts-expect-error test mock
    authStore.user = { id: 'test-user', email: 'test@example.com' };

    if (typeof localStorage === 'undefined' || !localStorage.clear) {
      const store: Record<string, string> = {};
      global.localStorage = {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
        removeItem: vi.fn((key: string) => { delete store[key]; }),
        clear: vi.fn(() => {
          for (const k in store) delete store[k];
        }),
        length: 0,
        key: vi.fn()
      } as unknown as Storage;
    }
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
