/**
 * Composable for deck operations using VueUse's useAsyncState.
 * Provides proper async state management with loading, error, and data states.
 */

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Deck } from '@/types/flashcard'
import { useAsyncState } from '@vueuse/core'
import { computed, ref } from 'vue'

// Types
export interface DeckCreateInput {
    name: string
    description?: string
    parentId?: string
    color?: string
}

export interface DeckOperationResult<T> {
    data: T | null
    error: string | null
    success: boolean
}

/**
 * Create a deck using Supabase.
 * Standalone async function for use with useAsyncState.
 */
async function createDeckAsync(input: DeckCreateInput): Promise<Deck> {
    // Get current user from auth store
    const authStore = useAuthStore()
    const user = authStore.user

    if (!user) {
        throw new Error('Usuário não autenticado')
    }

    // Insert deck
    const { data, error: insertError } = await supabase
        .from('decks')
        .insert({
            user_id: user.id,
            name: input.name,
            description: input.description || null,
            parent_id: input.parentId || null,
            color: input.color || null
        })
        .select()
        .single()

    if (insertError) {
        throw new Error(`Erro ao criar baralho: ${insertError.message}`)
    }

    if (!data || !data.id) {
        throw new Error('Resposta inválida do servidor')
    }

    // Transform to Deck type
    const newDeck: Deck = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        parentId: data.parent_id || undefined,
        color: data.color || undefined,
        created: new Date(data.created_at),
        updated: new Date(data.updated_at)
    }

    console.log('createDeck success:', newDeck)
    return newDeck
}

/**
 * Check if a deck with the given name already exists.
 */
async function checkDeckExistsAsync(name: string): Promise<boolean> {
    const authStore = useAuthStore()
    const user = authStore.user
    if (!user) return false

    const { data, error } = await supabase
        .from('decks')
        .select('id')
        .eq('user_id', user.id)
        .eq('name', name)
        .maybeSingle()

    return !error && data !== null
}

export function useDeckOperations() {
    // Current input for creating deck
    const pendingInput = ref<DeckCreateInput | null>(null)

    // useAsyncState for deck creation
    const {
        state: createdDeck,
        isLoading: isCreating,
        isReady: createReady,
        error: createError,
        execute: executeCreate
    } = useAsyncState(
        async () => {
            if (!pendingInput.value) {
                throw new Error('No input provided')
            }
            return await createDeckAsync(pendingInput.value)
        },
        null as Deck | null,
        {
            immediate: false, // Don't execute on mount
            resetOnExecute: true,
            throwError: false, // Handle errors via the error ref
        }
    )

    // useAsyncState for checking duplicates
    const pendingCheckName = ref('')
    const {
        state: deckExists,
        isLoading: isCheckingDuplicate,
        execute: executeCheckDuplicate
    } = useAsyncState(
        async () => {
            if (!pendingCheckName.value) return false
            return await checkDeckExistsAsync(pendingCheckName.value)
        },
        false,
        {
            immediate: false,
            resetOnExecute: true,
        }
    )

    /**
     * Create a new deck.
     * Returns the result with proper typing.
     */
    async function createDeck(input: DeckCreateInput): Promise<DeckOperationResult<Deck>> {
        pendingInput.value = input

        await executeCreate()

        if (createError.value) {
            const errorMsg = createError.value instanceof Error
                ? createError.value.message
                : String(createError.value)
            console.error('createDeck error:', createError.value)
            return { data: null, error: errorMsg, success: false }
        }

        if (!createdDeck.value) {
            return { data: null, error: 'Erro desconhecido', success: false }
        }

        return { data: createdDeck.value, error: null, success: true }
    }

    /**
     * Check if a deck with the given name already exists.
     */
    async function checkDuplicate(name: string): Promise<boolean> {
        pendingCheckName.value = name
        await executeCheckDuplicate()
        return deckExists.value
    }

    return {
        // State (reactive)
        isCreating,
        createReady,
        createError: computed(() => {
            if (!createError.value) return null
            return createError.value instanceof Error
                ? createError.value.message
                : String(createError.value)
        }),
        createdDeck,

        // Duplicate check state
        isCheckingDuplicate,
        deckExists,

        // Actions
        createDeck,
        checkDuplicate
    }
}
