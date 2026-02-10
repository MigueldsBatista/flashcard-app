import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { StudySession } from '@/types/flashcard'
import type { ISessionService } from '../types'

export class SupabaseSessionService implements ISessionService {
    private getUserId(): string {
        const authStore = useAuthStore()
        const user = authStore.user
        if (!user) throw new Error('Usuário não autenticado')
        return user.id
    }

    async fetchAll(): Promise<StudySession[]> {
        const { data, error } = await supabase
            .from('study_sessions')
            .select('*')
            .order('start_time', { ascending: false })

        if (error) throw new Error(`Erro ao buscar sessões: ${error.message}`)

        return (data ?? []).map(s => ({
            id: s.id,
            deckId: s.deck_id,
            startTime: new Date(s.start_time),
            endTime: s.end_time ? new Date(s.end_time) : undefined,
            cardsStudied: s.cards_studied,
            newCards: s.new_cards,
            reviewCards: s.review_cards,
            accuracy: s.accuracy,
        }))
    }

    async save(session: Omit<StudySession, 'id'>): Promise<StudySession> {
        const userId = this.getUserId()

        const { data, error } = await supabase
            .from('study_sessions')
            .insert({
                user_id: userId,
                deck_id: session.deckId,
                start_time: session.startTime instanceof Date
                    ? session.startTime.toISOString()
                    : session.startTime,
                end_time: session.endTime instanceof Date
                    ? session.endTime.toISOString()
                    : session.endTime,
                cards_studied: session.cardsStudied,
                new_cards: session.newCards,
                review_cards: session.reviewCards,
                accuracy: session.accuracy,
            })
            .select()
            .single()

        if (error) throw new Error(`Erro ao salvar sessão: ${error.message}`)
        if (!data) throw new Error('Resposta inválida do servidor')

        return {
            id: data.id,
            deckId: data.deck_id,
            startTime: new Date(data.start_time),
            endTime: data.end_time ? new Date(data.end_time) : undefined,
            cardsStudied: data.cards_studied,
            newCards: data.new_cards,
            reviewCards: data.review_cards,
            accuracy: data.accuracy,
        }
    }
}
