<script setup lang="ts">
import OcclusionColorPicker from '@/components/OcclusionColorPicker.vue';
import Button from '@/components/ui/Button.vue';
import UndoRedoControls from '@/components/UndoRedoControls.vue';
import { useOcclusionCanvas, type ResizeHandle } from '@/composables/useOcclusionCanvas';
import type { ImageOcclusion } from '@/types/flashcard';
import { useManualRefHistory } from '@vueuse/core';
import { Check, Minus, Plus, RotateCcw, Trash2, X, ZoomIn } from 'lucide-vue-next';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

interface Props {
  open: boolean;
  imageData: string;
  occlusions: ImageOcclusion[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  save: [occlusions: ImageOcclusion[]];
  cancel: [];
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
  getCanvasCoordinates,
  getHandleAtPosition,
  generateOcclusionId,
  getPinchDistance
} = useOcclusionCanvas(canvasRef, containerRef);

// State
const localOcclusions = ref<ImageOcclusion[]>([]);
const selectedOcclusionId = ref<string | null>(null);
const occlusionColor = ref('#EF4444');

// Zoom
const zoom = ref(1);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;

// Touch state for pinch detection
const initialPinchDistance = ref<number | null>(null);
const initialPinchZoom = ref(1);
const isTouchInteracting = ref(false);

// Interaction modes
type InteractionMode = 'draw' | 'move' | 'resize' | 'none';
const interactionMode = ref<InteractionMode>('none');
const isInteracting = ref(false);
const startPoint = ref<{ x: number; y: number } | null>(null);
const currentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null);

// Resize handles
const activeHandle = ref<ResizeHandle>(null);
const resizeStartRect = ref<ImageOcclusion | null>(null);
const moveStartOcclusion = ref<ImageOcclusion | null>(null);

// History with manual commits
const { commit, undo, redo, canUndo, canRedo, clear: clearHistory } = useManualRefHistory(
  localOcclusions,
  {
    capacity: 50,
    clone: (v) => JSON.parse(JSON.stringify(v))
  }
);

function commitToHistory() {
  commit();
}

// Redraw wrapper that passes current interaction state
function redrawCanvas() {
  baseRedraw(localOcclusions.value, {
    selectedId: selectedOcclusionId.value,
    showResizeHandles: true,
    currentDrawingRect: interactionMode.value === 'draw' ? currentRect.value : null,
    drawingColor: occlusionColor.value
  });
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  if (!props.open) return;

  if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (event.shiftKey) {
      if (canRedo.value) { redo(); redrawCanvas(); }
    } else {
      if (canUndo.value) { undo(); redrawCanvas(); }
    }
  }

  if (event.key === 'Escape') { emit('cancel'); }

  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedOcclusionId.value) { deleteSelectedOcclusion(); }
  }
}

// Initialize
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    localOcclusions.value = JSON.parse(JSON.stringify(props.occlusions));
    selectedOcclusionId.value = null;
    zoom.value = 1;
    clearHistory();
    commit();
    nextTick(() => {
      loadImageAndSetup(props.imageData, {
        containerPadding: 32,
        fitToContainer: true
      }).then(() => redrawCanvas());
    });
  }
}, { immediate: true });

// Mouse event handlers
function handleMouseDown(event: MouseEvent) {
  if (!imageLoaded.value) return;
  handlePointerDown(getCanvasCoordinates(event, zoom.value));
}

function handleMouseMove(event: MouseEvent) {
  if (!isInteracting.value || !startPoint.value) return;
  handlePointerMove(getCanvasCoordinates(event, zoom.value));
}

function handleMouseUp() { handlePointerUp(); }

// Touch event handlers with pinch detection
function handleTouchStart(event: TouchEvent) {
  if (!imageLoaded.value) return;
  event.preventDefault();

  if (event.touches.length === 2) {
    isTouchInteracting.value = false;
    isInteracting.value = false;
    initialPinchDistance.value = getPinchDistance(event.touches);
    initialPinchZoom.value = zoom.value;
    return;
  }

  if (event.touches.length === 1) {
    isTouchInteracting.value = true;
    handlePointerDown(getCanvasCoordinates(event.touches[0]!, zoom.value));
  }
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault();

  if (event.touches.length === 2 && initialPinchDistance.value !== null) {
    const currentDistance = getPinchDistance(event.touches);
    const scale = currentDistance / initialPinchDistance.value;
    zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialPinchZoom.value * scale));
    return;
  }

  if (event.touches.length === 1 && isTouchInteracting.value && isInteracting.value) {
    handlePointerMove(getCanvasCoordinates(event.touches[0]!, zoom.value));
  }
}

function handleTouchEnd(event: TouchEvent) {
  event.preventDefault();
  if (initialPinchDistance.value !== null) { initialPinchDistance.value = null; return; }
  if (isTouchInteracting.value) { handlePointerUp(); isTouchInteracting.value = false; }
}

// Unified pointer handlers
function handlePointerDown(coords: { x: number; y: number }) {
  if (selectedOcclusionId.value) {
    const selectedOcc = localOcclusions.value.find(o => o.id === selectedOcclusionId.value);
    if (selectedOcc) {
      const handle = getHandleAtPosition(coords.x, coords.y, selectedOcc);
      if (handle) {
        interactionMode.value = 'resize';
        isInteracting.value = true;
        activeHandle.value = handle;
        startPoint.value = coords;
        resizeStartRect.value = { ...selectedOcc };
        return;
      }
    }
  }

  const clickedOcclusion = [...localOcclusions.value].reverse().find(occ =>
    coords.x >= occ.x && coords.x <= occ.x + occ.width &&
    coords.y >= occ.y && coords.y <= occ.y + occ.height
  );

  if (clickedOcclusion) {
    if (selectedOcclusionId.value === clickedOcclusion.id) {
      interactionMode.value = 'move';
      isInteracting.value = true;
      startPoint.value = coords;
      moveStartOcclusion.value = { ...clickedOcclusion };
    } else {
      selectedOcclusionId.value = clickedOcclusion.id;
      redrawCanvas();
    }
    return;
  }

  selectedOcclusionId.value = null;
  interactionMode.value = 'draw';
  isInteracting.value = true;
  startPoint.value = coords;
  currentRect.value = { x: coords.x, y: coords.y, width: 0, height: 0 };
}

function handlePointerMove(coords: { x: number; y: number }) {
  if (!startPoint.value) return;

  if (interactionMode.value === 'resize' && activeHandle.value && resizeStartRect.value) {
    const dx = coords.x - startPoint.value.x;
    const dy = coords.y - startPoint.value.y;
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value);

    if (occ) {
      const original = resizeStartRect.value;
      switch (activeHandle.value) {
        case 'nw': occ.x = original.x + dx; occ.y = original.y + dy; occ.width = original.width - dx; occ.height = original.height - dy; break;
        case 'n': occ.y = original.y + dy; occ.height = original.height - dy; break;
        case 'ne': occ.y = original.y + dy; occ.width = original.width + dx; occ.height = original.height - dy; break;
        case 'e': occ.width = original.width + dx; break;
        case 'se': occ.width = original.width + dx; occ.height = original.height + dy; break;
        case 's': occ.height = original.height + dy; break;
        case 'sw': occ.x = original.x + dx; occ.width = original.width - dx; occ.height = original.height + dy; break;
        case 'w': occ.x = original.x + dx; occ.width = original.width - dx; break;
      }
      if (occ.width < 20) occ.width = 20;
      if (occ.height < 20) occ.height = 20;
      redrawCanvas();
    }
    return;
  }

  if (interactionMode.value === 'move' && moveStartOcclusion.value) {
    const dx = coords.x - startPoint.value.x;
    const dy = coords.y - startPoint.value.y;
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value);
    if (occ) {
      occ.x = moveStartOcclusion.value.x + dx;
      occ.y = moveStartOcclusion.value.y + dy;
      redrawCanvas();
    }
    return;
  }

  if (interactionMode.value === 'draw') {
    const x = Math.min(startPoint.value.x, coords.x);
    const y = Math.min(startPoint.value.y, coords.y);
    const width = Math.abs(coords.x - startPoint.value.x);
    const height = Math.abs(coords.y - startPoint.value.y);
    currentRect.value = { x, y, width, height };
    redrawCanvas();
  }
}

function handlePointerUp() {
  if (interactionMode.value === 'resize') {
    commitToHistory();
    isInteracting.value = false;
    activeHandle.value = null;
    resizeStartRect.value = null;
    startPoint.value = null;
    interactionMode.value = 'none';
    return;
  }

  if (interactionMode.value === 'move') {
    commitToHistory();
    isInteracting.value = false;
    moveStartOcclusion.value = null;
    startPoint.value = null;
    interactionMode.value = 'none';
    return;
  }

  if (interactionMode.value === 'draw' && currentRect.value) {
    const minSize = 20;
    if (currentRect.value.width > minSize && currentRect.value.height > minSize) {
      const newOcclusion: ImageOcclusion = {
        id: generateOcclusionId(),
        x: currentRect.value.x,
        y: currentRect.value.y,
        width: currentRect.value.width,
        height: currentRect.value.height,
        label: occlusionColor.value
      };
      localOcclusions.value.push(newOcclusion);
      selectedOcclusionId.value = newOcclusion.id;
      commitToHistory();
    }
  }

  isInteracting.value = false;
  startPoint.value = null;
  currentRect.value = null;
  interactionMode.value = 'none';
  redrawCanvas();
}

function deleteSelectedOcclusion() {
  if (!selectedOcclusionId.value) return;
  localOcclusions.value = localOcclusions.value.filter(o => o.id !== selectedOcclusionId.value);
  selectedOcclusionId.value = null;
  commitToHistory();
  redrawCanvas();
}

function clearAllOcclusions() {
  localOcclusions.value = [];
  selectedOcclusionId.value = null;
  commitToHistory();
  redrawCanvas();
}

function handleSave() {
  emit('save', localOcclusions.value);
  emit('update:open', false);
}

function handleCancel() {
  emit('cancel');
  emit('update:open', false);
}

function zoomIn() { zoom.value = Math.min(MAX_ZOOM, zoom.value + 0.25); }
function zoomOut() { zoom.value = Math.max(MIN_ZOOM, zoom.value - 0.25); }
function resetZoom() { zoom.value = 1; }

function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.1 : 0.1;
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta));
}

function handleResize() {
  if (imageLoaded.value) {
    setupCanvas({ containerPadding: 32, fitToContainer: true });
    redrawCanvas();
  }
}

// Watch color changes to update selected occlusion
watch(occlusionColor, (newColor) => {
  if (selectedOcclusionId.value) {
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value);
    if (occ) {
      occ.label = newColor;
      commitToHistory();
      redrawCanvas();
    }
  }
});

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
        class="fixed inset-0 z-50 flex flex-col backdrop-blur-xl bg-black/70"
      >
        <!-- Header Toolbar -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-b border-border px-3 py-2 sm:px-4 sm:py-3 safe-area-top">
          <div class="flex items-center gap-2 sm:gap-3 max-w-5xl mx-auto">
            <!-- Color Picker -->
            <OcclusionColorPicker v-model="occlusionColor" />

            <!-- Undo/Redo -->
            <UndoRedoControls
              :can-undo="canUndo"
              :can-redo="canRedo"
              @undo="() => { undo(); redrawCanvas() }"
              @redo="() => { redo(); redrawCanvas() }"
            />

            <!-- Divider -->
            <div class="w-px h-6 bg-border hidden sm:block" />

            <!-- Clear -->
            <Button
              v-if="localOcclusions.length > 0"
              variant="ghost"
              size="sm"
              class="text-xs"
              @click="clearAllOcclusions"
            >
              <RotateCcw class="w-4 h-4 sm:mr-1" />
              <span class="hidden sm:inline">Limpar</span>
            </Button>

            <!-- Delete selected -->
            <Button
              v-if="selectedOcclusionId"
              variant="ghost"
              size="sm"
              class="text-destructive text-xs"
              @click="deleteSelectedOcclusion"
            >
              <Trash2 class="w-4 h-4 sm:mr-1" />
              <span class="hidden sm:inline">Excluir</span>
            </Button>

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
              @click="handleCancel"
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
              class="block shadow-2xl rounded-lg cursor-crosshair touch-none"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @mouseleave="handleMouseUp"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="handleTouchEnd"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-t border-border p-3 sm:p-4 safe-area-bottom">
          <div class="flex items-center justify-between gap-3 max-w-5xl mx-auto">
            <div class="text-sm text-muted-foreground">
              {{ localOcclusions.length }} área(s)
            </div>
            <div class="flex gap-2">
              <Button
                variant="outline"
                @click="handleCancel"
              >
                Cancelar
              </Button>
              <Button
                :disabled="localOcclusions.length === 0"
                @click="handleSave"
              >
                <Check class="w-4 h-4 mr-1.5" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
