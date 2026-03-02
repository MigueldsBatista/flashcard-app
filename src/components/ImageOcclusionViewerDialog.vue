<script setup lang="ts">
import Button from '@/components/ui/Button.vue';
import { useOcclusionCanvas } from '@/composables/useOcclusionCanvas';
import type { ImageOcclusion } from '@/types/flashcard';
import { Minus, Plus, X, ZoomIn } from 'lucide-vue-next';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

interface Props {
  open: boolean;
  imageData: string;
  occlusions: ImageOcclusion[];
  revealedIds: Set<string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  reveal: [id: string];
  revealAll: [];
}>();

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);

// Canvas composable
const {
  imageLoaded,
  canvasScale,
  loadImageAndSetup,
  setupCanvas,
  redrawCanvas: baseRedraw,
  getPinchDistance
} = useOcclusionCanvas(canvasRef, containerRef);

// Zoom
const zoom = ref(1);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

// Touch state for pinch detection
const initialPinchDistance = ref<number | null>(null);
const initialPinchZoom = ref(1);

function redrawCanvas() {
  baseRedraw(props.occlusions, {
    revealedIds: props.revealedIds,
    showQuestionMark: true
  });
}

// Initialize when opened
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    zoom.value = 1;
    nextTick(() => {
      loadImageAndSetup(props.imageData, {
        containerPadding: 32,
        fitToContainer: true
      }).then(() => redrawCanvas());
    });
  }
}, { immediate: true });

// Redraw when reveal state changes
watch(() => props.revealedIds.size, () => {
  if (props.open) redrawCanvas();
});

// Click-to-reveal in fullscreen
function handleCanvasClick(event: MouseEvent | TouchEvent) {
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

  const x = (clientX - rect.left) / (canvasScale.value * zoom.value);
  const y = (clientY - rect.top) / (canvasScale.value * zoom.value);

  const clickedOcclusion = props.occlusions.find(occ =>
    !props.revealedIds.has(occ.id) &&
    x >= occ.x &&
    x <= occ.x + occ.width &&
    y >= occ.y &&
    y <= occ.y + occ.height
  );

  if (clickedOcclusion) {
    if (navigator.vibrate) navigator.vibrate(10);
    emit('reveal', clickedOcclusion.id);
  }
}

// Touch handlers for pinch zoom
function handleTouchStart(event: TouchEvent) {
  if (event.touches.length === 2) {
    event.preventDefault();
    initialPinchDistance.value = getPinchDistance(event.touches);
    initialPinchZoom.value = zoom.value;
  }
}

function handleTouchMove(event: TouchEvent) {
  if (event.touches.length === 2 && initialPinchDistance.value !== null) {
    event.preventDefault();
    const currentDistance = getPinchDistance(event.touches);
    const scale = currentDistance / initialPinchDistance.value;
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialPinchZoom.value * scale));
  }
}

function handleTouchEnd(event: TouchEvent) {
  if (initialPinchDistance.value !== null) {
    initialPinchDistance.value = null;
  }
}

// Zoom controls
function zoomIn() { zoom.value = Math.min(MAX_ZOOM, zoom.value + 0.25); }
function zoomOut() { zoom.value = Math.max(MIN_ZOOM, zoom.value - 0.25); }
function resetZoom() { zoom.value = 1; }

function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta));
}

function handleClose() {
  emit('update:open', false);
}

function handleResize() {
  if (imageLoaded.value && props.open) {
    setupCanvas({ containerPadding: 32, fitToContainer: true });
    redrawCanvas();
  }
}

function handleKeyDown(event: KeyboardEvent) {
  if (!props.open) return;
  if (event.key === 'Escape') handleClose();
}

watch(zoom, () => { redrawCanvas(); });

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex flex-col backdrop-blur-xl bg-black/80"
      >
        <!-- Header -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-b border-border px-3 py-2 sm:px-4 sm:py-3 safe-area-top">
          <div class="flex items-center gap-2 sm:gap-3 max-w-5xl mx-auto">
            <!-- Reveal status -->
            <div class="text-sm text-muted-foreground">
              {{ revealedIds.size }} / {{ occlusions.length }} revelada(s)
            </div>

            <!-- Reveal all button -->
            <button
              v-if="revealedIds.size < occlusions.length"
              class="text-primary text-sm font-medium hover:underline"
              @click="emit('revealAll')"
            >
              Revelar todas
            </button>

            <!-- Spacer -->
            <div class="flex-1" />

            <!-- Zoom controls -->
            <div class="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                :disabled="zoom <= MIN_ZOOM"
                class="p-1.5"
                @click="zoomOut"
              >
                <Minus class="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                class="px-2 py-1 text-xs font-medium text-muted-foreground min-w-12 text-center"
                @click="resetZoom"
              >
                {{ Math.round(zoom * 100) }}%
              </Button>
              <Button
                variant="ghost"
                size="sm"
                :disabled="zoom >= MAX_ZOOM"
                class="p-1.5"
                @click="zoomIn"
              >
                <Plus class="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>

            <!-- Close -->
            <Button
              variant="ghost"
              size="sm"
              class="p-2"
              @click="handleClose"
            >
              <X class="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <!-- Canvas Area -->
        <div
          ref="containerRef"
          class="flex-1 overflow-auto flex items-center justify-center p-4 touch-none"
          @wheel="handleWheel"
        >
          <div
            v-if="!imageLoaded"
            class="text-muted-foreground text-sm"
          >
            Carregando imagem...
          </div>

          <div
            v-else
            class="relative"
            :style="{ transform: `scale(${zoom})`, transformOrigin: 'center center' }"
          >
            <!-- Zoom indicator -->
            <div
              v-if="zoom !== 1"
              class="absolute -top-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs text-muted-foreground flex items-center gap-1 z-10"
            >
              <ZoomIn class="w-3 h-3" />
              {{ Math.round(zoom * 100) }}%
            </div>

            <canvas
              ref="canvasRef"
              class="block shadow-2xl rounded-lg cursor-pointer touch-none"
              @click="handleCanvasClick"
              @touchend.prevent="handleCanvasClick"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
            />
          </div>
        </div>

        <!-- Footer hint -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-t border-border p-2 sm:p-3 safe-area-bottom">
          <p class="text-xs text-muted-foreground text-center">
            Toque nas áreas ocultas para revelar · Use pinça para zoom
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
