import { useFlashcardStore } from '@/stores/flashcard'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock Supabase
vi.mock('@/lib/supabase', async () => {
    const { mockSupabase } = await import('./supabase_mock')
    return {
        supabase: mockSupabase
    }
})

/**
 * Gherkin-style Test Specification: Study Session
 * 
 * Feature: Study Session with Spaced Repetition
 *   As a user
 *   I want to study my flashcards and rate difficulty
 *   So that the system can schedule optimal review times
 */

describe('StudySession Feature', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
    })

    /**
     * Scenario: Good Case - Review card with "Good" difficulty
     *   Given I have a new card that is due for review
     *   When I review the card and rate it as "Good"
     *   Then the card's interval should increase
     *   And the next review date should be in the future
     */
    it('should increase interval when card is rated as Good', async () => {
        const store = useFlashcardStore()

        // Given
        await store.addDeck({ name: 'Test', color: '#3B82F6' })
        const deckId = store.decks[0]!.id

        await store.addCard({
            deckId,
            content: { front: 'What is 2+2?', back: '4', type: 'text' },
            status: 'new',
            interval: 0,
            easeFactor: 2.5,
            repetitions: 0,
            lapses: 0,
            nextReview: new Date(),
        })

        const cardId = store.cards[0]!.id
        const originalInterval = store.cards[0]!.interval

        // When
        store.startStudySession(deckId)
        await store.reviewCard(cardId, 'good')

        // Then
        const updatedCard = store.cards.find(c => c.id === cardId)!
        expect(updatedCard.interval).toBeGreaterThan(originalInterval)
        expect(new Date(updatedCard.nextReview).getTime()).toBeGreaterThan(Date.now())
        expect(updatedCard.repetitions).toBe(1)
    })

    /**
     * Scenario: Bad Case - Review card with "Forgot" difficulty (lapse)
     *   Given I have a card with interval of 7 days
     *   When I review the card and rate it as "Forgot"
     *   Then the interval should reset to a short value
     *   And the lapses count should increase by 1
     */
    it('should reset interval and count lapse when card is rated as Forgot', async () => {
        const store = useFlashcardStore()

        // Given
        await store.addDeck({ name: 'Test', color: '#3B82F6' })
        const deckId = store.decks[0]!.id

        await store.addCard({
            deckId,
            content: { front: 'Hard question', back: 'Answer', type: 'text' },
            status: 'review',
            interval: 7,
            easeFactor: 2.5,
            repetitions: 3,
            lapses: 0,
            nextReview: new Date(),
        })

        const cardId = store.cards[0]!.id

        // When
        store.startStudySession(deckId)
        await store.reviewCard(cardId, 'forgot')

        // Then
        const updatedCard = store.cards.find(c => c.id === cardId)!
        expect(updatedCard.interval).toBeLessThan(1) // Reset to minutes
        expect(updatedCard.lapses).toBe(1)
        expect(updatedCard.repetitions).toBe(0)
        expect(updatedCard.status).toBe('learning')
    })

    /**
     * Scenario: Good Case - Review card with "Easy" difficulty
     *   Given I have a card ready for review
     *   When I rate the card as "Easy"
     *   Then the interval should increase significantly (4x)
     *   And the ease factor should increase
     */
    it('should apply larger interval bonus for Easy rating', async () => {
        const store = useFlashcardStore()

        // Given
        await store.addDeck({ name: 'Test', color: '#3B82F6' })
        const deckId = store.decks[0]!.id

        await store.addCard({
            deckId,
            content: { front: 'Easy question', back: 'Answer', type: 'text' },
            status: 'review',
            interval: 6,
            easeFactor: 2.5,
            repetitions: 2,
            lapses: 0,
            nextReview: new Date(),
        })

        const cardId = store.cards[0]!.id
        const originalEaseFactor = store.cards[0]!.easeFactor

        // When
        store.startStudySession(deckId)
        await store.reviewCard(cardId, 'easy')

        // Then
        const updatedCard = store.cards.find(c => c.id === cardId)!
        expect(updatedCard.easeFactor).toBeGreaterThan(originalEaseFactor)
        expect(updatedCard.interval).toBeGreaterThan(6 * 2.5) // Greater than "Good" would give
    })

    /**
     * Scenario: Edge Case - Card becomes a leech after 8 lapses
     *   Given I have a card with 7 lapses
     *   When I rate it as "Forgot" one more time
     *   Then the card status should change to "leech"
     */
    it('should mark card as leech after 8 lapses', async () => {
        const store = useFlashcardStore()

        // Given
        await store.addDeck({ name: 'Test', color: '#3B82F6' })
        const deckId = store.decks[0]!.id

        await store.addCard({
            deckId,
            content: { front: 'Leech question', back: 'Answer', type: 'text' },
            status: 'learning',
            interval: 1,
            easeFactor: 1.3,
            repetitions: 0,
            lapses: 7, // One more "forgot" will make it a leech
            nextReview: new Date(),
        })

        const cardId = store.cards[0]!.id

        // When
        store.startStudySession(deckId)
        await store.reviewCard(cardId, 'forgot')

        // Then
        const updatedCard = store.cards.find(c => c.id === cardId)!
        expect(updatedCard.lapses).toBe(8)
        expect(updatedCard.status).toBe('leech')
    })

    /**
     * Scenario: Edge Case - Session with no due cards
     *   Given I have no cards due for review
     *   When I try to start a study session
     *   Then the session should be empty
     */
    it('should handle empty study session gracefully', async () => {
        const store = useFlashcardStore()

        // Given: A deck with cards all scheduled for future
        await store.addDeck({ name: 'Test', color: '#3B82F6' })
        const deckId = store.decks[0]!.id

        await store.addCard({
            deckId,
            content: { front: 'Future card', back: 'Answer', type: 'text' },
            status: 'review',
            interval: 7,
            easeFactor: 2.5,
            repetitions: 3,
            lapses: 0,
            nextReview: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Future
        })

        // When & Then: Stats show 0 due cards
        expect(store.stats.dueCards).toBe(0)
    })

    /**
     * Scenario: Good Case - Complete study session
     *   Given I start a study session
     *   And I review 3 cards
     *   When I end the session
     *   Then a session record should be saved
     */
    it('should save session record when session ends', async () => {
        const store = useFlashcardStore()

        // Given
        await store.addDeck({ name: 'Test', color: '#3B82F6' })
        const deckId = store.decks[0]!.id

        for (let i = 0; i < 3; i++) {
            await store.addCard({
                deckId,
                content: { front: `Q${i}`, back: `A${i}`, type: 'text' },
                status: 'new',
                interval: 0,
                easeFactor: 2.5,
                repetitions: 0,
                lapses: 0,
                nextReview: new Date(),
            })
        }

        // When
        store.startStudySession(deckId)
        expect(store.currentSession).not.toBeNull()

        for (const card of store.cards) {
            await store.reviewCard(card.id, 'good')
        }
        await store.endStudySession()

        // Then
        expect(store.currentSession).toBeNull()
        // Session should be tracked in today's stats
        expect(store.stats.today.cardsReviewed).toBe(3)
    })
})
