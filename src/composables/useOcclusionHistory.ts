/**
 * Composable for occlusion history (undo/redo).
 * Wraps VueUse's useRefHistory for managing ImageOcclusion[] state.
 */

import type { ImageOcclusion } from '@/types/flashcard';
import { useRefHistory } from '@vueuse/core';
import { computed, type Ref } from 'vue';

export interface OcclusionHistoryOptions {
  capacity?: number;
}

const DEFAULT_OPTIONS: Required<OcclusionHistoryOptions> = {
  capacity: 50
};

export function useOcclusionHistory(
  occlusions: Ref<ImageOcclusion[]>,
  options: OcclusionHistoryOptions = {}
) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const { history, undo, redo, canUndo, canRedo, clear } = useRefHistory(
    occlusions,
    {
      deep: true,
      capacity: opts.capacity,
      clone: (v) => JSON.parse(JSON.stringify(v))
    }
  );

  const historyCount = computed(() => history.value.length);

  return {
    // Actions
    undo,
    redo,
    clear,

    // State
    canUndo,
    canRedo,
    historyCount
  };
}
