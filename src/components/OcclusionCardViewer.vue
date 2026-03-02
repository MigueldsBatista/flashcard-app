<script setup lang="ts">
import ImageOcclusionViewerDialog from '@/components/ImageOcclusionViewerDialog.vue';
import { useOcclusionCanvas } from '@/composables/useOcclusionCanvas';
import type { ImageOcclusion } from '@/types/flashcard';
import { Maximize2 } from 'lucide-vue-next';
import { computed, onMounted, ref, watch } from 'vue';

interface Props {
  imageData: string;
  occlusions: ImageOcclusion[];
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true
});

const emit = defineEmits<{
  allRevealed: [];
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Canvas composable
const {
  imageLoaded,
  canvasScale,
  loadImageAndSetup,
  setupCanvas,
  redrawCanvas: baseRedraw
} = useOcclusionCanvas(canvasRef, containerRef);

// Shared state
const revealedIds = ref<Set<string>>(new Set());
const fullscreenOpen = ref(false);

const VIEWER_OPTIONS = { maxHeight: 350 };

const allRevealed = computed(() => {
  return revealedIds.value.size === props.occlusions.length;
});

function redrawCanvas() {
  baseRedraw(props.occlusions, {
    revealedIds: revealedIds.value,
    showQuestionMark: true
  });
}

function handleCanvasClick(event: MouseEvent | TouchEvent) {
  if (!props.interactive) return;

  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  let clientX: number, clientY: number;

  if ('touches' in event) {
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    clientX = touch.clientX;
    clientY = touch.clientY;
  } else {
    clientX = event.clientX;
    clientY = event.clientY;
  }

  const x = (clientX - rect.left) / canvasScale.value;
  const y = (clientY - rect.top) / canvasScale.value;

  const clickedOcclusion = props.occlusions.find(occ =>
    !revealedIds.value.has(occ.id) &&
    x >= occ.x &&
    x <= occ.x + occ.width &&
    y >= occ.y &&
    y <= occ.y + occ.height
  );

  if (clickedOcclusion) {
    revealedIds.value.add(clickedOcclusion.id);

    if (navigator.vibrate) {
      navigator.vibrate(10);
    }

    redrawCanvas();

    if (allRevealed.value) {
      emit('allRevealed');
    }
  }
}

function handleRevealFromDialog(id: string) {
  revealedIds.value.add(id);
  redrawCanvas();

  if (allRevealed.value) {
    emit('allRevealed');
  }
}

function handleRevealAllFromDialog() {
  props.occlusions.forEach(occ => {
    revealedIds.value.add(occ.id);
  });
  redrawCanvas();
  emit('allRevealed');
}

function revealAll() {
  handleRevealAllFromDialog();
}

function resetRevealedState() {
  revealedIds.value.clear();
  redrawCanvas();
}

defineExpose({
  revealAll,
  resetRevealedState
});

function handleResize() {
  if (imageLoaded.value) {
    setupCanvas(VIEWER_OPTIONS);
    redrawCanvas();
  }
}

watch(() => props.imageData, () => {
  loadImageAndSetup(props.imageData, VIEWER_OPTIONS).then(() => redrawCanvas());
});

watch(() => props.occlusions, () => {
  revealedIds.value.clear();
  redrawCanvas();
}, { deep: true });

onMounted(() => {
  loadImageAndSetup(props.imageData, VIEWER_OPTIONS).then(() => redrawCanvas());
  window.addEventListener('resize', handleResize);
});
</script>

<template>
  <div class="space-y-3">
    <div
      ref="containerRef"
      class="relative bg-muted rounded-lg overflow-hidden border border-border group"
    >
      <canvas
        ref="canvasRef"
        :class="[
          'block mx-auto',
          interactive ? 'cursor-pointer' : '',
        ]"
        @click="handleCanvasClick"
        @touchend="handleCanvasClick"
      />

      <!-- Fullscreen expand button -->
      <button
        v-if="interactive"
        class="absolute top-2 right-2 bg-background/80 backdrop-blur hover:bg-background text-foreground rounded-lg p-1.5 opacity-0 group-hover:opacity-100 sm:opacity-70 transition-opacity shadow-md"
        title="Tela cheia"
        @click.stop="fullscreenOpen = true"
      >
        <Maximize2 class="w-4 h-4" />
      </button>
    </div>

    <!-- Reveal Status -->
    <div class="flex items-center justify-between text-sm">
      <span class="text-muted-foreground">
        {{ revealedIds.size }} / {{ occlusions.length }} área(s) revelada(s)
      </span>
      <button
        v-if="!allRevealed && interactive"
        class="text-primary hover:underline text-sm font-medium"
        @click="revealAll"
      >
        Revelar todas
      </button>
    </div>

    <!-- Fullscreen Viewer Dialog -->
    <ImageOcclusionViewerDialog
      v-model:open="fullscreenOpen"
      :image-data="imageData"
      :occlusions="occlusions"
      :revealed-ids="revealedIds"
      @reveal="handleRevealFromDialog"
      @reveal-all="handleRevealAllFromDialog"
    />
  </div>
</template>
