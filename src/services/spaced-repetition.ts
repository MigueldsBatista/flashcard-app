// SM-2 Spaced Repetition Algorithm (Modified)
import type { Card, CardDifficulty } from '@/types/flashcard'

const DIFFICULTY_MULTIPLIERS = {
    forgot: 0, // Reset
    hard: 1.2,
    good: 2.5,
    easy: 4.0,
}

const MINIMUM_EASE_FACTOR = 1.3
const LEECH_THRESHOLD = 8 // Mark as leech after 8 lapses

export interface ReviewResult {
    card: Card
    nextReview: Date
    interval: number
    easeFactor: number
    isLeech: boolean
}

export function calculateNextReview(
    card: Card,
    difficulty: CardDifficulty
): ReviewResult {
    let interval = card.interval
    let easeFactor = card.easeFactor
    let repetitions = card.repetitions
    let lapses = card.lapses
    let status = card.status

    const now = new Date()

    // Handle "Forgot" response
    if (difficulty === 'forgot') {
        interval = 0.00694 // 10 minutes in days
        repetitions = 0
        lapses += 1
        status = lapses >= LEECH_THRESHOLD ? 'leech' : 'learning'
        easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor - 0.2)
    } else {
        // Calculate new ease factor based on difficulty
        if (difficulty === 'hard') {
            easeFactor = Math.max(MINIMUM_EASE_FACTOR, easeFactor - 0.15)
        } else if (difficulty === 'easy') {
            easeFactor += 0.15
        }

        // Calculate new interval
        if (repetitions === 0) {
            interval = 1 // First review: 1 day
        } else if (repetitions === 1) {
            interval = 6 // Second review: 6 days
        } else {
            interval = Math.round(interval * easeFactor * DIFFICULTY_MULTIPLIERS[difficulty])
        }

        repetitions += 1

        // Update status
        if (repetitions >= 2) {
            status = 'review'
        } else {
            status = 'learning'
        }
    }

    // Calculate next review date
    const nextReview = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000)

    const updatedCard: Card = {
        ...card,
        interval,
        easeFactor,
        repetitions,
        lapses,
        status,
        lastReviewed: now,
        nextReview,
    }

    return {
        card: updatedCard,
        nextReview,
        interval,
        easeFactor,
        isLeech: status === 'leech',
    }
}

export function getDueCards(cards: Card[]): Card[] {
    const now = new Date()
    return cards.filter(card => new Date(card.nextReview) <= now)
}

export function getNewCards(cards: Card[], limit: number): Card[] {
    return cards
        .filter(card => card.status === 'new')
        .slice(0, limit)
}

export function prioritizeCards(cards: Card[]): Card[] {
    const now = new Date()

    return cards.sort((a, b) => {
        // Overdue cards first
        const aOverdue = new Date(a.nextReview) < now
        const bOverdue = new Date(b.nextReview) < now

        if (aOverdue && !bOverdue) return -1
        if (!aOverdue && bOverdue) return 1

        // Then by due date (earliest first)
        return new Date(a.nextReview).getTime() - new Date(b.nextReview).getTime()
    })
}

export function calculateReadinessScore(
    totalCards: number,
    dueCards: number,
    overdueCards: number
): number {
    if (totalCards === 0) return 100

    const dueRatio = dueCards / totalCards
    const overdueRatio = overdueCards / totalCards

    // Score decreases more dramatically with overdue cards
    const score = 100 - (dueRatio * 30) - (overdueRatio * 70)

    return Math.max(0, Math.min(100, Math.round(score)))
}
