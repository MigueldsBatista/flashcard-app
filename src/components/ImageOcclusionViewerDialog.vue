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

// Zoom + Pan state
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

// Touch state
const initialPinchDistance = ref<number | null>(null);
const initialPinchZoom = ref(1);
const initialPinchCenter = ref<{ x: number; y: number } | null>(null);
const initialPinchPan = ref<{ x: number; y: number }>({ x: 0, y: 0 });

// Drag-to-pan state
const isDragging = ref(false);
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragStartPan = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const hasDragged = ref(false); // distinguish between tap and drag

function redrawCanvas() {
  baseRedraw(props.occlusions, {
    revealedIds: props.revealedIds,
    showQuestionMark: true
  });
}

// ── Zoom-to-point logic ──

function zoomToPoint(newZoom: number, screenX: number, screenY: number) {
  const container = containerRef.value;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  // Point relative to the container center
  const cx = screenX - rect.left - rect.width / 2;
  const cy = screenY - rect.top - rect.height / 2;

  const oldZoom = zoom.value;
  const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));

  // Adjust pan so the point under cursor stays in place
  panX.value = cx - (cx - panX.value) * (clampedZoom / oldZoom);
  panY.value = cy - (cy - panY.value) * (clampedZoom / oldZoom);

  zoom.value = clampedZoom;
}

function resetView() {
  zoom.value = 1;
  panX.value = 0;
  panY.value = 0;
}

function zoomIn() {
  const container = containerRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  zoomToPoint(zoom.value + 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function zoomOut() {
  const container = containerRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  zoomToPoint(zoom.value - 0.5, rect.left + rect.width / 2, rect.top + rect.height / 2);
  // If zoomed out to 1 or below, reset pan
  if (zoom.value <= 1) { panX.value = 0; panY.value = 0; }
}

// ── Initialize ──

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    resetView();
    nextTick(() => {
      loadImageAndSetup(props.imageData, {
        containerPadding: 32,
        fitToContainer: true
      }).then(() => redrawCanvas());
    });
  }
}, { immediate: true });

watch(() => props.revealedIds.size, () => {
  if (props.open) redrawCanvas();
});

// ── Click-to-reveal ──

function tryRevealAt(screenX: number, screenY: number) {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = (screenX - rect.left) / (canvasScale.value * zoom.value);
  const y = (screenY - rect.top) / (canvasScale.value * zoom.value);

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

// ── Mouse handlers (desktop) ──

function handleMouseDown(event: MouseEvent) {
  if (zoom.value <= 1) return; // No pan needed at 100%
  isDragging.value = true;
  hasDragged.value = false;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragStartPan.value = { x: panX.value, y: panY.value };
}

function handleMouseMove(event: MouseEvent) {
  if (!isDragging.value || !dragStart.value) return;

  const dx = event.clientX - dragStart.value.x;
  const dy = event.clientY - dragStart.value.y;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    hasDragged.value = true;
  }

  panX.value = dragStartPan.value.x + dx;
  panY.value = dragStartPan.value.y + dy;
}

function handleMouseUp(event: MouseEvent) {
  isDragging.value = false;
  dragStart.value = null;

  // If it was a simple click (no drag), try to reveal
  if (!hasDragged.value) {
    tryRevealAt(event.clientX, event.clientY);
  }
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.15 : 0.15;
  zoomToPoint(zoom.value + delta, event.clientX, event.clientY);

  if (zoom.value <= 1) { panX.value = 0; panY.value = 0; }
}

// ── Touch handlers ──

function handleTouchStart(event: TouchEvent) {
  event.preventDefault();

  // Two-finger pinch
  if (event.touches.length === 2) {
    isDragging.value = false;
    initialPinchDistance.value = getPinchDistance(event.touches);
    initialPinchZoom.value = zoom.value;
    initialPinchPan.value = { x: panX.value, y: panY.value };
    initialPinchCenter.value = {
      x: (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2,
      y: (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2
    };
    return;
  }

  // Single finger
  if (event.touches.length === 1) {
    isDragging.value = true;
    hasDragged.value = false;
    dragStart.value = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
    dragStartPan.value = { x: panX.value, y: panY.value };
  }
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault();

  // Pinch zoom
  if (event.touches.length === 2 && initialPinchDistance.value !== null && initialPinchCenter.value) {
    const currentDistance = getPinchDistance(event.touches);
    const scale = currentDistance / initialPinchDistance.value;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialPinchZoom.value * scale));

    const cx = initialPinchCenter.value.x;
    const cy = initialPinchCenter.value.y;
    const container = containerRef.value;
    if (container) {
      const rect = container.getBoundingClientRect();
      const relX = cx - rect.left - rect.width / 2;
      const relY = cy - rect.top - rect.height / 2;

      panX.value = relX - (relX - initialPinchPan.value.x) * (newZoom / initialPinchZoom.value);
      panY.value = relY - (relY - initialPinchPan.value.y) * (newZoom / initialPinchZoom.value);
    }

    zoom.value = newZoom;
    return;
  }

  // Single-finger drag to pan (only when zoomed)
  if (event.touches.length === 1 && isDragging.value && dragStart.value && zoom.value > 1) {
    const dx = event.touches[0]!.clientX - dragStart.value.x;
    const dy = event.touches[0]!.clientY - dragStart.value.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.value = true;
    }

    panX.value = dragStartPan.value.x + dx;
    panY.value = dragStartPan.value.y + dy;
  }
}

function handleTouchEnd(event: TouchEvent) {
  event.preventDefault();

  // End pinch
  if (initialPinchDistance.value !== null) {
    initialPinchDistance.value = null;
    initialPinchCenter.value = null;
    if (zoom.value <= 1) { resetView(); }
    return;
  }

  // Tap to reveal (no drag)
  if (isDragging.value && !hasDragged.value) {
    const touch = event.changedTouches[0];
    if (touch) {
      tryRevealAt(touch.clientX, touch.clientY);
    }
  }

  isDragging.value = false;
  dragStart.value = null;
}

// ── Keyboard & Resize ──

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
  if (event.key === '+' || event.key === '=') zoomIn();
  if (event.key === '-') zoomOut();
  if (event.key === '0') resetView();
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
                @click="resetView"
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
          class="flex-1 overflow-hidden flex items-center justify-center p-4"
          :class="[zoom > 1 ? 'cursor-grab' : 'cursor-pointer', isDragging && zoom > 1 ? 'cursor-grabbing!' : '']"
          @wheel.prevent="handleWheel"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <div
            v-if="!imageLoaded"
            class="text-muted-foreground text-sm"
          >
            Carregando imagem...
          </div>

          <div
            v-else
            class="relative select-none"
            :style="{
              transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }"
          >
            <!-- Zoom indicator -->
            <div
              v-if="zoom !== 1"
              class="absolute -top-8 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs text-muted-foreground flex items-center gap-1 z-10 pointer-events-none"
            >
              <ZoomIn class="w-3 h-3" />
              {{ Math.round(zoom * 100) }}%
            </div>

            <canvas
              ref="canvasRef"
              class="block shadow-2xl rounded-lg touch-none"
            />
          </div>
        </div>

        <!-- Footer hint -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-t border-border p-2 sm:p-3 safe-area-bottom">
          <p class="text-xs text-muted-foreground text-center">
            {{ zoom > 1 ? 'Arraste para navegar · ' : '' }}Toque nas áreas ocultas para revelar · Use pinça ou scroll para zoom
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
