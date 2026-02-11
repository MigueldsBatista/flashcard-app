import { cardService, deckService, sessionService } from '@/services/provider'
import {
    calculateNextReview,
    calculateReadinessScore,
    getDueCards,
} from '@/services/spaced-repetition'

import type { DeckCreateInput } from '@/services/types'
import type { Card, CardDifficulty, Deck, StudySession, StudyStats, UserSettings } from '@/types/flashcard'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const DARK_MODE_KEY = 'ultra_focus_dark_mode'

function loadDarkModePreference(): boolean {
    try {
        const stored = localStorage.getItem(DARK_MODE_KEY)
        if (stored !== null) return stored === 'true'
    } catch { /* localStorage unavailable */ }
    return false
}

const DEFAULT_SETTINGS: UserSettings = {
    dailyNewCardLimit: 20,
    dailyReviewLimit: 200,
    darkMode: loadDarkModePreference(),
    hapticFeedback: true,
    autoPlayAudio: false,
}

function calculateStreak(sessions: StudySession[]): number {
    if (sessions.length === 0) return 0

    const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    let streak = 0
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000)
        const hasSession = sortedSessions.some(session => {
            const sessionDate = new Date(session.startTime)
            sessionDate.setHours(0, 0, 0, 0)
            return sessionDate.getTime() === checkDate.getTime()
        })

        if (hasSession) {
            streak++
        } else if (i > 0) {
            break
        }
    }

    return streak
}

export const useFlashcardStore = defineStore('flashcard', () => {
    // State
    const decks = ref<Deck[]>([])
    const cards = ref<Card[]>([])
    const settings = ref<UserSettings>(DEFAULT_SETTINGS)
    const sessions = ref<StudySession[]>([])
    const currentSession = ref<StudySession | null>(null)
    const loading = ref(false)

    // Computed statistics
    const stats = computed((): StudyStats => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)
        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

        const dueCardsList = getDueCards(cards.value)
        const overdueCards = dueCardsList.filter(card => {
            const reviewDate = new Date(card.nextReview)
            return reviewDate < today
        })

        const todaySessions = sessions.value.filter(session => {
            const sessionDate = new Date(session.startTime)
            return sessionDate >= today
        })

        const cardsReviewedToday = todaySessions.reduce((sum, s) => sum + s.cardsStudied, 0)
        const newCardsToday = todaySessions.reduce((sum, s) => sum + s.newCards, 0)
        const totalAccuracy = todaySessions.length > 0
            ? todaySessions.reduce((sum, s) => sum + s.accuracy, 0) / todaySessions.length
            : 0

        const timeSpent = todaySessions.reduce((sum, session) => {
            if (session.endTime) {
                const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime()
                return sum + duration / 1000 / 60
            }
            return sum
        }, 0)

        const streak = calculateStreak(sessions.value)

        const readinessScore = calculateReadinessScore(
            cards.value.length,
            dueCardsList.length,
            overdueCards.length
        )

        const nextReviewsToday = cards.value.filter(card => {
            const reviewDate = new Date(card.nextReview)
            return reviewDate >= today && reviewDate < tomorrow
        }).length

        const nextReviewsTomorrow = cards.value.filter(card => {
            const reviewDate = new Date(card.nextReview)
            return reviewDate >= tomorrow && reviewDate < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)
        }).length

        const nextReviewsWeek = cards.value.filter(card => {
            const reviewDate = new Date(card.nextReview)
            return reviewDate >= today && reviewDate < weekFromNow
        }).length

        const nonDueCards = cards.value.filter(card => new Date(card.nextReview) > now)
        const nextAvailableCardDate = nonDueCards.length > 0
            ? new Date(Math.min(...nonDueCards.map(card => new Date(card.nextReview).getTime())))
            : null

        return {
            today: {
                cardsReviewed: cardsReviewedToday,
                newCards: newCardsToday,
                accuracy: totalAccuracy,
                timeSpent,
            },
            streak,
            totalCards: cards.value.length,
            dueCards: dueCardsList.length,
            overdueCards: overdueCards.length,
            readinessScore,
            nextReviews: {
                today: nextReviewsToday,
                tomorrow: nextReviewsTomorrow,
                week: nextReviewsWeek,
            },
            nextAvailableCardDate,
        }
    })

    // ── Actions ─────────────────────────────────────────────

    async function fetchAll() {
        loading.value = true
        try {
            const [fetchedDecks, fetchedCards, fetchedSessions] = await Promise.all([
                deckService.fetchAll(),
                cardService.fetchAll(),
                sessionService.fetchAll(),
            ])
            decks.value = fetchedDecks
            cards.value = fetchedCards
            sessions.value = fetchedSessions
        } finally {
            loading.value = false
        }
    }

    async function addDeck(deck: DeckCreateInput): Promise<Deck | null> {
        try {
            const newDeck = await deckService.create(deck)
            decks.value.push(newDeck)
            return newDeck
        } catch (err) {
            console.error('addDeck error:', err)
            return null
        }
    }

    async function updateDeck(id: string, updates: Partial<Deck>) {
        try {
            await deckService.update(id, updates)
            const index = decks.value.findIndex(deck => deck.id === id)
            if (index !== -1) {
                const currentDeck = decks.value[index]!
                decks.value[index] = {
                    ...currentDeck,
                    ...updates,
                    id: currentDeck.id,
                    name: updates.name ?? currentDeck.name,
                    icon: updates.icon !== undefined ? updates.icon : currentDeck.icon,
                    created: currentDeck.created,
                    updated: new Date(),
                }
            }
        } catch (err) {
            console.error('updateDeck error:', err)
        }
    }

    async function deleteDeck(id: string) {
        try {
            await deckService.delete(id)
            decks.value = decks.value.filter(deck => deck.id !== id)
            cards.value = cards.value.filter(card => card.deckId !== id)
        } catch (err) {
            console.error('deleteDeck error:', err)
        }
    }

    async function addCard(card: Omit<Card, 'id' | 'created'>) {
        try {
            const newCard = await cardService.create(card)
            cards.value.push(newCard)
        } catch (err) {
            console.error('addCard error:', err)
        }
    }

    async function updateCard(id: string, updates: Partial<Card>) {
        try {
            await cardService.update(id, updates)
            const index = cards.value.findIndex(card => card.id === id)
            if (index !== -1) {
                const currentCard = cards.value[index]!
                cards.value[index] = {
                    ...currentCard,
                    ...updates,
                    id: currentCard.id,
                    deckId: updates.deckId ?? currentCard.deckId,
                    content: updates.content ?? currentCard.content,
                    status: updates.status ?? currentCard.status,
                    interval: updates.interval ?? currentCard.interval,
                    easeFactor: updates.easeFactor ?? currentCard.easeFactor,
                    repetitions: updates.repetitions ?? currentCard.repetitions,
                    lapses: updates.lapses ?? currentCard.lapses,
                    nextReview: updates.nextReview ?? currentCard.nextReview,
                    created: currentCard.created,
                }
            }
        } catch (err) {
            console.error('updateCard error:', err)
        }
    }

    async function deleteCard(id: string) {
        try {
            await cardService.delete(id)
            cards.value = cards.value.filter(card => card.id !== id)
        } catch (err) {
            console.error('deleteCard error:', err)
        }
    }

    async function reviewCard(cardId: string, difficulty: CardDifficulty) {
        const card = cards.value.find(c => c.id === cardId)
        if (!card) return

        const result = calculateNextReview(card, difficulty)
        await updateCard(cardId, result.card)

        // Update current session
        if (currentSession.value) {
            const wasCorrect = difficulty !== 'forgot'
            const isNewCard = card.status === 'new'
            currentSession.value = {
                ...currentSession.value,
                cardsStudied: currentSession.value.cardsStudied + 1,
                newCards: currentSession.value.newCards + (isNewCard ? 1 : 0),
                reviewCards: currentSession.value.reviewCards + (isNewCard ? 0 : 1),
                accuracy: ((currentSession.value.accuracy * currentSession.value.cardsStudied) + (wasCorrect ? 1 : 0)) / (currentSession.value.cardsStudied + 1),
            }
        }
    }

    function startStudySession(deckId: string) {
        const session: StudySession = {
            id: 'temp-' + Date.now(),
            deckId,
            startTime: new Date(),
            cardsStudied: 0,
            newCards: 0,
            reviewCards: 0,
            accuracy: 0,
        }
        currentSession.value = session
    }

    async function endStudySession() {
        if (!currentSession.value) return

        if (currentSession.value.cardsStudied === 0) {
            currentSession.value = null
            return
        }

        try {
            const savedSession = await sessionService.save({
                deckId: currentSession.value.deckId,
                startTime: currentSession.value.startTime,
                endTime: new Date(),
                cardsStudied: currentSession.value.cardsStudied,
                newCards: currentSession.value.newCards,
                reviewCards: currentSession.value.reviewCards,
                accuracy: currentSession.value.accuracy,
            })
            sessions.value.push(savedSession)
        } catch (err) {
            console.error('endStudySession: Failed to save session:', err)
        }

        currentSession.value = null
    }

    function updateSettings(newSettings: Partial<UserSettings>) {
        settings.value = { ...settings.value, ...newSettings }
        if (newSettings.darkMode !== undefined) {
            try {
                localStorage.setItem(DARK_MODE_KEY, String(newSettings.darkMode))
            } catch { /* localStorage unavailable */ }
        }
    }

    return {
        // State
        decks,
        cards,
        settings,
        currentSession,
        sessions,
        loading,
        // Computed
        stats,
        // Actions
        fetchAll,
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
    }
})
