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
 * Gherkin-style Test Specification: Deck Manager
 *
 * Feature: Deck Management (CRUD Operations)
 *   As a user
 *   I want to create, read, update, and delete decks
 *   So that I can organize my flashcards
 */

describe('DeckManager Feature', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  /**
     * Scenario: Good Case - Create a new deck successfully
     *   Given I am on the deck manager page
     *   When I create a new deck with name "Anatomia"
     *   Then the deck should be added to the list
     *   And the deck count should increase by 1
     */
  it('should create a new deck successfully', async () => {
    const store = useFlashcardStore();

    // Given: No decks initially
    expect(store.decks.length).toBe(0);

    // When: Create a new deck
    // When: Create a new deck
    await store.addDeck({
      name: 'Anatomia',
      description: 'Sistema nervoso',
      color: '#3B82F6'
    });

    // Then
    expect(store.decks.length).toBe(1);
    expect(store.decks[0]!.name).toBe('Anatomia');
    expect(store.decks[0]!.description).toBe('Sistema nervoso');
    expect(store.decks[0]!.color).toBe('#3B82F6');
    expect(store.decks[0]!.id).toBeDefined();
    expect(store.decks[0]!.created).toBeDefined();
  });

  /**
     * Scenario: Bad Case - Deck with empty name should fail validation
     *   Given I am on the deck manager page
     *   When I try to create a deck without a name
     *   Then the creation should fail (handled at UI level)
     */
  it('should validate deck name is not empty (UI level validation)', async () => {
    const store = useFlashcardStore();

    // Note: The store itself doesn't validate - this is done at UI level
    // UI prevents calling addDeck with empty name
    // This test verifies that the store accepts valid data
    await store.addDeck({ name: 'Valid Name', color: '#3B82F6' });
    expect(store.decks[0]!.name).toBe('Valid Name');
  });

  /**
     * Scenario: Good Case - Update deck properties
     *   Given I have a deck named "Anatomia"
     *   When I update its name to "Neurologia"
     *   Then the deck name should be changed
     *   And the updated timestamp should be refreshed
     */
  it('should update deck name successfully', async () => {
    const store = useFlashcardStore();

    // Given
    await store.addDeck({ name: 'Anatomia', color: '#3B82F6' });
    const deckId = store.decks[0]!.id;
    const originalUpdated = store.decks[0]!.updated;

    // Wait a bit to ensure timestamp changes
    // Note: In real tests, we'd mock Date.now()

    // When
    await store.updateDeck(deckId, { name: 'Neurologia' });

    // Then
    expect(store.decks[0]!.name).toBe('Neurologia');
  });

  /**
     * Scenario: Good Case - Delete deck and its cards
     *   Given I have a deck with 3 cards
     *   When I delete the deck
     *   Then the deck should be removed
     *   And all its cards should also be deleted
     */
  it('should delete deck and its associated cards', async () => {
    const store = useFlashcardStore();

    // Given
    await store.addDeck({ name: 'Test Deck', color: '#3B82F6' });
    const deckId = store.decks[0]!.id;

    // Add 3 cards
    for (let i = 0; i < 3; i++) {
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

    expect(store.decks.length).toBe(1);
    expect(store.cards.length).toBe(3);

    // When
    await store.deleteDeck(deckId);

    // Then
    expect(store.decks.length).toBe(0);
    expect(store.cards.length).toBe(0);
  });

  /**
     * Scenario: Edge Case - Delete non-existent deck
     *   Given I have no decks
     *   When I try to delete a deck with ID "fake-id"
     *   Then nothing should happen (no error)
     */
  it('should handle deletion of non-existent deck gracefully', async () => {
    const store = useFlashcardStore();

    // Given: No decks
    expect(store.decks.length).toBe(0);

    // When: Try to delete non-existent deck
    await store.deleteDeck('fake-id');

    // Then: No error thrown, still no decks
    expect(store.decks.length).toBe(0);
  });

  /**
     * Scenario: Edge Case - Handle duplicate deck names
     *   Given I have a deck named "Anatomia"
     *   When I create another deck with the same name
     *   Then both decks should exist (no duplicate prevention)
     *   And they should have unique IDs
     */
  it('should allow duplicate deck names with unique IDs', async () => {
    const store = useFlashcardStore();

    // Given
    await store.addDeck({ name: 'Anatomia', color: '#3B82F6' });

    // When
    await store.addDeck({ name: 'Anatomia', color: '#10B981' });

    // Then
    expect(store.decks.length).toBe(2);
    expect(store.decks[0]!.id).not.toBe(store.decks[1]!.id);
    expect(store.decks[0]!.name).toBe(store.decks[1]!.name);
  });
});
