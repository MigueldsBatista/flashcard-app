import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Deck } from '@/types/flashcard'
import type { DeckCreateInput, IDeckService } from '../types'

export class SupabaseDeckService implements IDeckService {
    private getUserId(): string {
        const authStore = useAuthStore()
        const user = authStore.user
        if (!user) throw new Error('Usuário não autenticado')
        return user.id
    }

    async fetchAll(): Promise<Deck[]> {
        const { data, error } = await supabase
            .from('decks')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw new Error(`Erro ao buscar baralhos: ${error.message}`)

        return (data ?? []).map(d => ({
            id: d.id,
            name: d.name,
            description: d.description,
            parentId: d.parent_id,
            color: d.color,
            created: new Date(d.created_at),
            updated: new Date(d.updated_at),
        }))
    }

    async create(input: DeckCreateInput): Promise<Deck> {
        const userId = this.getUserId()

        const { data, error } = await supabase
            .from('decks')
            .insert({
                user_id: userId,
                name: input.name,
                description: input.description ?? null,
                parent_id: input.parentId ?? null,
                color: input.color ?? null,
            })
            .select()
            .single()

        if (error) throw new Error(`Erro ao criar baralho: ${error.message}`)
        if (!data?.id) throw new Error('Resposta inválida do servidor')

        return {
            id: data.id,
            name: data.name,
            description: data.description || undefined,
            parentId: data.parent_id || undefined,
            color: data.color || undefined,
            created: new Date(data.created_at),
            updated: new Date(data.updated_at),
        }
    }

    async update(id: string, updates: Partial<Deck>): Promise<void> {
        const { error } = await supabase
            .from('decks')
            .update({
                name: updates.name,
                description: updates.description,
                parent_id: updates.parentId,
                color: updates.color,
                updated_at: new Date(),
            })
            .eq('id', id)

        if (error) throw new Error(`Erro ao atualizar baralho: ${error.message}`)
    }

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('decks')
            .delete()
            .eq('id', id)

        if (error) throw new Error(`Erro ao deletar baralho: ${error.message}`)
    }

    async existsByName(name: string): Promise<boolean> {
        const userId = this.getUserId()

        const { data, error } = await supabase
            .from('decks')
            .select('id')
            .eq('user_id', userId)
            .eq('name', name)
            .maybeSingle()

        return !error && data !== null
    }
}
