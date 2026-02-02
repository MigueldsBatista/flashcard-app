// Types for the flashcard system

export type CardDifficulty = 'forgot' | 'hard' | 'good' | 'easy'

export type CardStatus = 'new' | 'learning' | 'review' | 'leech'

export interface ImageOcclusion {
    id: string
    x: number
    y: number
    width: number
    height: number
    label?: string
    revealed?: boolean
}

export interface CardContent {
    front: string
    back: string
    type: 'text' | 'image' | 'code' | 'latex' | 'occlusion'
    language?: string // For code syntax highlighting
    imageUrl?: string
    imageData?: string // Base64 encoded image data for occlusion cards
    imageOcclusions?: ImageOcclusion[]
}

export interface Card {
    id: string
    deckId: string
    content: CardContent
    status: CardStatus
    interval: number // Days until next review
    easeFactor: number // SM-2 ease factor
    repetitions: number
    lapses: number // Times user forgot this card
    lastReviewed?: Date
    nextReview: Date
    created: Date
}

export interface Deck {
    id: string
    name: string
    description?: string
    parentId?: string // For hierarchical decks
    color?: string
    created: Date
    updated: Date
}

export interface StudySession {
    id: string
    deckId: string
    startTime: Date
    endTime?: Date
    cardsStudied: number
    newCards: number
    reviewCards: number
    accuracy: number
}

export interface StudyStats {
    today: {
        cardsReviewed: number
        newCards: number
        accuracy: number
        timeSpent: number // minutes
    }
    streak: number
    totalCards: number
    dueCards: number
    overdueCards: number
    readinessScore: number // 0-100
    nextReviews: {
        today: number
        tomorrow: number
        week: number
    }
}

export interface UserSettings {
    dailyNewCardLimit: number
    dailyReviewLimit: number
    darkMode: boolean
    hapticFeedback: boolean
    autoPlayAudio: boolean
}
