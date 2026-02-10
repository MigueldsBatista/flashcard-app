/**
 * Service Layer Contracts
 *
 * Interfaces puras que definem os contratos de persistência/fetch.
 * Nenhuma dependência de framework — apenas tipos do domínio.
 */

import type { Card, CardContent, Deck, StudySession } from '@/types/flashcard'

// ── Deck Service ────────────────────────────────────────────

export interface DeckCreateInput {
    name: string
    description?: string
    parentId?: string
    color?: string
}

export interface IDeckService {
    fetchAll(): Promise<Deck[]>
    create(input: DeckCreateInput): Promise<Deck>
    update(id: string, updates: Partial<Deck>): Promise<void>
    delete(id: string): Promise<void>
    existsByName(name: string): Promise<boolean>
}

// ── Card Service ────────────────────────────────────────────

export interface ICardService {
    fetchAll(): Promise<Card[]>
    create(card: Omit<Card, 'id' | 'created'>): Promise<Card>
    update(id: string, updates: Partial<Card>): Promise<void>
    delete(id: string): Promise<void>
}

// ── Session Service ─────────────────────────────────────────

export interface ISessionService {
    fetchAll(): Promise<StudySession[]>
    save(session: Omit<StudySession, 'id'>): Promise<StudySession>
}

// ── AI Generator Service ────────────────────────────────────

export interface GenerateOptions {
    context?: string
    numCards?: number
}

export interface GeneratedCard {
    content: CardContent
}

export interface IAIGeneratorService {
    generateFromImage(image: File, options?: GenerateOptions): Promise<GeneratedCard[]>
    generateFromText(text: string, options?: GenerateOptions): Promise<GeneratedCard[]>
}
