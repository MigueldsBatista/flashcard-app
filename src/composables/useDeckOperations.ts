/**
 * Composable for deck operations using VueUse's useAsyncState.
 * Provides proper async state management with loading, error, and data states.
 */

import { deckService } from '@/services/provider';
import type { DeckCreateInput } from '@/services/types';
import type { Deck } from '@/types/flashcard';
import { useAsyncState } from '@vueuse/core';
import { computed, ref } from 'vue';

export interface DeckOperationResult<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export function useDeckOperations() {
  // Current input for creating deck
  const pendingInput = ref<DeckCreateInput | null>(null);

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
        throw new Error('No input provided');
      }
      return await deckService.create(pendingInput.value);
    },
    null as Deck | null,
    {
      immediate: false,
      resetOnExecute: true,
      throwError: false
    }
  );

  // useAsyncState for checking duplicates
  const pendingCheckName = ref('');
  const {
    state: deckExists,
    isLoading: isCheckingDuplicate,
    execute: executeCheckDuplicate
  } = useAsyncState(
    async () => {
      if (!pendingCheckName.value) return false;
      return await deckService.existsByName(pendingCheckName.value);
    },
    false,
    {
      immediate: false,
      resetOnExecute: true
    }
  );

  /**
     * Create a new deck.
     * Returns the result with proper typing.
     */
  async function createDeck(input: DeckCreateInput): Promise<DeckOperationResult<Deck>> {
    pendingInput.value = input;

    await executeCreate();

    if (createError.value) {
      const errorMsg = createError.value instanceof Error
        ? createError.value.message
        : String(createError.value);
      console.error('createDeck error:', createError.value);
      return { data: null, error: errorMsg, success: false };
    }

    if (!createdDeck.value) {
      return { data: null, error: 'Erro desconhecido', success: false };
    }

    return { data: createdDeck.value, error: null, success: true };
  }

  /**
     * Check if a deck with the given name already exists.
     */
  async function checkDuplicate(name: string): Promise<boolean> {
    pendingCheckName.value = name;
    await executeCheckDuplicate();
    return deckExists.value;
  }

  return {
    // State (reactive)
    isCreating,
    createReady,
    createError: computed(() => {
      if (!createError.value) return null;
      return createError.value instanceof Error
        ? createError.value.message
        : String(createError.value);
    }),
    createdDeck,

    // Duplicate check state
    isCheckingDuplicate,
    deckExists,

    // Actions
    createDeck,
    checkDuplicate
  };
}
