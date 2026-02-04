import { supabase } from '@/lib/supabase'
import {
    calculateNextReview,
    calculateReadinessScore,
    getDueCards,
} from '@/services/spaced-repetition'
import type { Card, CardDifficulty, Deck, StudySession, StudyStats, UserSettings } from '@/types/flashcard'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const DEFAULT_SETTINGS: UserSettings = {
    dailyNewCardLimit: 20,
    dailyReviewLimit: 200,
    darkMode: false,
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
    const settings = ref<UserSettings>(DEFAULT_SETTINGS) // Settings still local for now or maybe profile? Let's keep local or fetch from profile if we added it.
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
                return sum + duration / 1000 / 60 // Convert to minutes
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

        // Find the next available card date (minimum nextReview for cards not yet due)
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

    // Actions
    async function fetchAll() {
        loading.value = true

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch Decks
        const { data: decksData } = await supabase
            .from('decks')
            .select('*')
            .order('created_at', { ascending: false })

        if (decksData) {
            decks.value = decksData.map(d => ({
                id: d.id,
                name: d.name,
                description: d.description,
                parentId: d.parent_id,
                color: d.color,
                created: new Date(d.created_at),
                updated: new Date(d.updated_at)
            }))
        }

        // Fetch Cards
        const { data: cardsData } = await supabase
            .from('cards')
            .select('*')

        if (cardsData) {
            cards.value = cardsData.map(c => ({
                id: c.id,
                deckId: c.deck_id,
                content: c.content, // JSONB automatically parsed
                status: c.status,
                interval: c.interval,
                easeFactor: c.ease_factor,
                repetitions: c.repetitions,
                lapses: c.lapses,
                lastReviewed: c.last_reviewed ? new Date(c.last_reviewed) : undefined,
                nextReview: new Date(c.next_review),
                created: new Date(c.created_at)
            }))
        }

        // Fetch Sessions
        const { data: sessionsData } = await supabase
            .from('study_sessions')
            .select('*')
            .order('start_time', { ascending: false })

        if (sessionsData) {
            sessions.value = sessionsData.map(s => ({
                id: s.id,
                deckId: s.deck_id,
                startTime: new Date(s.start_time),
                endTime: s.end_time ? new Date(s.end_time) : undefined,
                cardsStudied: s.cards_studied,
                newCards: s.new_cards,
                reviewCards: s.review_cards,
                accuracy: s.accuracy
            }))
        }

        loading.value = false
    }

    async function addDeck(deck: Omit<Deck, 'id' | 'created' | 'updated'>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('decks')
            .insert({
                user_id: user.id,
                name: deck.name,
                description: deck.description,
                parent_id: deck.parentId,
                color: deck.color
            })
            .select()
            .single()

        if (data && !error) {
            decks.value.push({
                id: data.id!,
                name: data.name,
                description: data.description || undefined,
                parentId: data.parent_id || undefined,
                color: data.color || undefined,
                created: new Date(data.created_at),
                updated: new Date(data.updated_at)
            })
        }
    }

    async function updateDeck(id: string, updates: Partial<Deck>) {
        const { error } = await supabase
            .from('decks')
            .update({
                name: updates.name,
                description: updates.description,
                parent_id: updates.parentId,
                color: updates.color,
                updated_at: new Date()
            })
            .eq('id', id)

        if (!error) {
            const index = decks.value.findIndex(deck => deck.id === id)
            if (index !== -1) {
                const currentDeck = decks.value[index]!
                decks.value[index] = {
                    ...currentDeck,
                    ...updates,
                    id: currentDeck.id,
                    name: updates.name ?? currentDeck.name,
                    created: currentDeck.created,
                    updated: new Date()
                }
            }
        }
    }

    async function deleteDeck(id: string) {
        const { error } = await supabase
            .from('decks')
            .delete()
            .eq('id', id)

        if (!error) {
            decks.value = decks.value.filter(deck => deck.id !== id)
            cards.value = cards.value.filter(card => card.deckId !== id)
        }
    }

    async function addCard(card: Omit<Card, 'id' | 'created'>) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('cards')
            .insert({
                user_id: user.id,
                deck_id: card.deckId,
                content: card.content,
                status: card.status,
                interval: card.interval,
                ease_factor: card.easeFactor,
                repetitions: card.repetitions,
                lapses: card.lapses,
                next_review: card.nextReview
            })
            .select()
            .single()

        if (data && !error) {
            cards.value.push({
                id: data.id!,
                deckId: data.deck_id!,
                content: data.content,
                status: data.status,
                interval: data.interval,
                easeFactor: data.ease_factor,
                repetitions: data.repetitions,
                lapses: data.lapses,
                lastReviewed: data.last_reviewed ? new Date(data.last_reviewed) : undefined,
                nextReview: new Date(data.next_review),
                created: new Date(data.created_at)
            })
        }
    }

    async function updateCard(id: string, updates: Partial<Card>) {
        const { error } = await supabase
            .from('cards')
            .update({
                content: updates.content,
                status: updates.status,
                interval: updates.interval,
                ease_factor: updates.easeFactor,
                repetitions: updates.repetitions,
                lapses: updates.lapses,
                next_review: updates.nextReview,
                last_reviewed: updates.lastReviewed
            })
            .eq('id', id)

        if (!error) {
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
                    created: currentCard.created
                }
            }
        }
    }

    async function deleteCard(id: string) {
        const { error } = await supabase
            .from('cards')
            .delete()
            .eq('id', id)

        if (!error) {
            cards.value = cards.value.filter(card => card.id !== id)
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
            currentSession.value = {
                ...currentSession.value,
                cardsStudied: currentSession.value.cardsStudied + 1,
                accuracy: ((currentSession.value.accuracy * currentSession.value.cardsStudied) + (wasCorrect ? 1 : 0)) / (currentSession.value.cardsStudied + 1),
            }
        }
    }

    function startStudySession(deckId: string) {
        // Just local state for the session start, we save it when it ends
        const session: StudySession = {
            id: 'temp-' + Date.now(), // Temp ID
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
        if (currentSession.value) {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const sessionToSave = {
                    user_id: user.id,
                    deck_id: currentSession.value.deckId,
                    start_time: currentSession.value.startTime,
                    end_time: new Date(),
                    cards_studied: currentSession.value.cardsStudied,
                    new_cards: currentSession.value.newCards,
                    review_cards: currentSession.value.reviewCards,
                    accuracy: currentSession.value.accuracy
                }

                const { data, error } = await supabase
                    .from('study_sessions')
                    .insert(sessionToSave)
                    .select()
                    .single()

                if (data && !error) {
                    sessions.value.push({
                        id: data.id,
                        deckId: data.deck_id,
                        startTime: new Date(data.start_time),
                        endTime: data.end_time ? new Date(data.end_time) : undefined,
                        cardsStudied: data.cards_studied,
                        newCards: data.new_cards,
                        reviewCards: data.review_cards,
                        accuracy: data.accuracy
                    })
                }
            }
            currentSession.value = null
        }
    }

    function updateSettings(newSettings: Partial<UserSettings>) {
        settings.value = { ...settings.value, ...newSettings }
        // TODO: Persist settings to Supabase profile
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
