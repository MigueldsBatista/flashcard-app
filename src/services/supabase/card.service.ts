import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Card } from '@/types/flashcard'
import type { ICardService } from '../types'

export class SupabaseCardService implements ICardService {
    private getUserId(): string {
        const authStore = useAuthStore()
        const user = authStore.user
        if (!user) throw new Error('Usuário não autenticado')
        return user.id
    }

    async fetchAll(): Promise<Card[]> {
        const { data, error } = await supabase
            .from('cards')
            .select('*')

        if (error) throw new Error(`Erro ao buscar cartões: ${error.message}`)

        return (data ?? []).map(c => ({
            id: c.id,
            deckId: c.deck_id,
            content: c.content,
            status: c.status,
            interval: c.interval,
            easeFactor: c.ease_factor,
            repetitions: c.repetitions,
            lapses: c.lapses,
            lastReviewed: c.last_reviewed ? new Date(c.last_reviewed) : undefined,
            nextReview: new Date(c.next_review),
            created: new Date(c.created_at),
        }))
    }

    async create(card: Omit<Card, 'id' | 'created'>): Promise<Card> {
        const userId = this.getUserId()

        const { data, error } = await supabase
            .from('cards')
            .insert({
                user_id: userId,
                deck_id: card.deckId,
                content: card.content,
                status: card.status,
                interval: card.interval,
                ease_factor: card.easeFactor,
                repetitions: card.repetitions,
                lapses: card.lapses,
                next_review: card.nextReview,
            })
            .select()
            .single()

        if (error) throw new Error(`Erro ao criar cartão: ${error.message}`)
        if (!data) throw new Error('Resposta inválida do servidor')

        return {
            id: data.id,
            deckId: data.deck_id,
            content: data.content,
            status: data.status,
            interval: data.interval,
            easeFactor: data.ease_factor,
            repetitions: data.repetitions,
            lapses: data.lapses,
            lastReviewed: data.last_reviewed ? new Date(data.last_reviewed) : undefined,
            nextReview: new Date(data.next_review),
            created: new Date(data.created_at),
        }
    }

    async update(id: string, updates: Partial<Card>): Promise<void> {
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
                last_reviewed: updates.lastReviewed,
            })
            .eq('id', id)

        if (error) throw new Error(`Erro ao atualizar cartão: ${error.message}`)
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('cards')
            .delete()
            .eq('id', id)

        if (error) throw new Error(`Erro ao deletar cartão: ${error.message}`)
    }
}
