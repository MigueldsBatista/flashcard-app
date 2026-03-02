<script setup lang="ts">
import OcclusionColorPicker from '@/components/OcclusionColorPicker.vue';
import Button from '@/components/ui/Button.vue';
import UndoRedoControls from '@/components/UndoRedoControls.vue';
import { useOcclusionCanvas, type ResizeHandle } from '@/composables/useOcclusionCanvas';
import type { ImageOcclusion } from '@/types/flashcard';
import { useManualRefHistory } from '@vueuse/core';
import { Check, Hand, Minus, Pencil, Plus, RotateCcw, Trash2, X, ZoomIn } from 'lucide-vue-next';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

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

// ── Editor Mode: 'navigate' (default) vs 'edit' ──
type EditorMode = 'navigate' | 'edit';
const editorMode = ref<EditorMode>('navigate');

const isNavigateMode = computed(() => editorMode.value === 'navigate');
const isEditMode = computed(() => editorMode.value === 'edit');

function toggleMode() {
  editorMode.value = editorMode.value === 'navigate' ? 'edit' : 'navigate';
  // Deselect when switching to navigate
  if (isNavigateMode.value) {
    selectedOcclusionId.value = null;
    redrawCanvas();
  }
}

// ── Zoom + Pan ──
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

// Pan drag state (navigate mode)
const isPanDragging = ref(false);
const panDragStart = ref<{ x: number; y: number } | null>(null);
const panDragStartPan = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const hasPanDragged = ref(false);

// Touch state for pinch
const initialPinchDistance = ref<number | null>(null);
const initialPinchZoom = ref(1);
const initialPinchCenter = ref<{ x: number; y: number } | null>(null);
const initialPinchPan = ref<{ x: number; y: number }>({ x: 0, y: 0 });
const isTouchInteracting = ref(false);

// ── Edit mode interaction ──
type InteractionMode = 'draw' | 'move' | 'resize' | 'none';
const interactionMode = ref<InteractionMode>('none');
const isInteracting = ref(false);
const startPoint = ref<{ x: number; y: number } | null>(null);
const currentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null);
const activeHandle = ref<ResizeHandle>(null);
const resizeStartRect = ref<ImageOcclusion | null>(null);
const moveStartOcclusion = ref<ImageOcclusion | null>(null);

// ── History ──
const { commit, undo, redo, canUndo, canRedo, clear: clearHistory } = useManualRefHistory(
  localOcclusions,
  { capacity: 50, clone: (v) => JSON.parse(JSON.stringify(v)) }
);

function commitToHistory() { commit(); }

// ── Redraw ──
function redrawCanvas() {
  baseRedraw(localOcclusions.value, {
    selectedId: isEditMode.value ? selectedOcclusionId.value : null,
    showResizeHandles: isEditMode.value,
    currentDrawingRect: interactionMode.value === 'draw' ? currentRect.value : null,
    drawingColor: occlusionColor.value
  });
}

// ── Zoom-to-point ──
function zoomToPoint(newZoom: number, screenX: number, screenY: number) {
  const container = containerRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const cx = screenX - rect.left - rect.width / 2;
  const cy = screenY - rect.top - rect.height / 2;
  const oldZoom = zoom.value;
  const clamped = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
  panX.value = cx - (cx - panX.value) * (clamped / oldZoom);
  panY.value = cy - (cy - panY.value) * (clamped / oldZoom);
  zoom.value = clamped;
}

function zoomIn() {
  const c = containerRef.value;
  if (!c) return;
  const r = c.getBoundingClientRect();
  zoomToPoint(zoom.value + 0.5, r.left + r.width / 2, r.top + r.height / 2);
}

function zoomOut() {
  const c = containerRef.value;
  if (!c) return;
  const r = c.getBoundingClientRect();
  zoomToPoint(zoom.value - 0.5, r.left + r.width / 2, r.top + r.height / 2);
  if (zoom.value <= 1) { panX.value = 0; panY.value = 0; }
}

function resetZoom() { zoom.value = 1; panX.value = 0; panY.value = 0; }

// ── Keyboard ──
function handleKeyDown(event: KeyboardEvent) {
  if (!props.open) return;

  if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    if (event.shiftKey) { if (canRedo.value) { redo(); redrawCanvas(); } }
    else { if (canUndo.value) { undo(); redrawCanvas(); } }
  }

  if (event.key === 'Escape') {
    if (isEditMode.value) { editorMode.value = 'navigate'; selectedOcclusionId.value = null; redrawCanvas(); }
    else { emit('cancel'); }
  }

  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedOcclusionId.value) {
    deleteSelectedOcclusion();
  }

  // Toggle mode with E key
  if (event.key === 'e' && !event.ctrlKey && !event.metaKey) {
    toggleMode();
  }
}

// ── Initialize ──
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    localOcclusions.value = JSON.parse(JSON.stringify(props.occlusions));
    selectedOcclusionId.value = null;
    editorMode.value = 'navigate';
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
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

// ============================================================
// NAVIGATE MODE: mouse/touch handlers for pan + zoom
// ============================================================

function navMouseDown(event: MouseEvent) {
  isPanDragging.value = true;
  hasPanDragged.value = false;
  panDragStart.value = { x: event.clientX, y: event.clientY };
  panDragStartPan.value = { x: panX.value, y: panY.value };
}

function navMouseMove(event: MouseEvent) {
  if (!isPanDragging.value || !panDragStart.value) return;
  const dx = event.clientX - panDragStart.value.x;
  const dy = event.clientY - panDragStart.value.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasPanDragged.value = true;
  panX.value = panDragStartPan.value.x + dx;
  panY.value = panDragStartPan.value.y + dy;
}

function navMouseUp() {
  isPanDragging.value = false;
  panDragStart.value = null;
}

function navTouchStart(event: TouchEvent) {
  event.preventDefault();

  if (event.touches.length === 2) {
    isPanDragging.value = false;
    initialPinchDistance.value = getPinchDistance(event.touches);
    initialPinchZoom.value = zoom.value;
    initialPinchPan.value = { x: panX.value, y: panY.value };
    initialPinchCenter.value = {
      x: (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2,
      y: (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2
    };
    return;
  }

  if (event.touches.length === 1) {
    isPanDragging.value = true;
    hasPanDragged.value = false;
    panDragStart.value = { x: event.touches[0]!.clientX, y: event.touches[0]!.clientY };
    panDragStartPan.value = { x: panX.value, y: panY.value };
  }
}

function navTouchMove(event: TouchEvent) {
  event.preventDefault();

  if (event.touches.length === 2 && initialPinchDistance.value !== null && initialPinchCenter.value) {
    const currentDistance = getPinchDistance(event.touches);
    const scale = currentDistance / initialPinchDistance.value;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialPinchZoom.value * scale));

    const container = containerRef.value;
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = initialPinchCenter.value.x - rect.left - rect.width / 2;
      const cy = initialPinchCenter.value.y - rect.top - rect.height / 2;
      panX.value = cx - (cx - initialPinchPan.value.x) * (newZoom / initialPinchZoom.value);
      panY.value = cy - (cy - initialPinchPan.value.y) * (newZoom / initialPinchZoom.value);
    }

    zoom.value = newZoom;
    return;
  }

  if (event.touches.length === 1 && isPanDragging.value && panDragStart.value) {
    const dx = event.touches[0]!.clientX - panDragStart.value.x;
    const dy = event.touches[0]!.clientY - panDragStart.value.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasPanDragged.value = true;
    panX.value = panDragStartPan.value.x + dx;
    panY.value = panDragStartPan.value.y + dy;
  }
}

function navTouchEnd(event: TouchEvent) {
  event.preventDefault();
  if (initialPinchDistance.value !== null) {
    initialPinchDistance.value = null;
    initialPinchCenter.value = null;
    if (zoom.value <= 1) resetZoom();
    return;
  }
  isPanDragging.value = false;
  panDragStart.value = null;
}

// ============================================================
// EDIT MODE: mouse/touch handlers for draw/move/resize
// ============================================================

function editMouseDown(event: MouseEvent) {
  if (!imageLoaded.value) return;
  handlePointerDown(getCanvasCoordinates(event, zoom.value));
}

function editMouseMove(event: MouseEvent) {
  if (!isInteracting.value || !startPoint.value) return;
  handlePointerMove(getCanvasCoordinates(event, zoom.value));
}

function editMouseUp() { handlePointerUp(); }

function editTouchStart(event: TouchEvent) {
  if (!imageLoaded.value) return;
  event.preventDefault();

  // Pinch zoom still works in edit mode
  if (event.touches.length === 2) {
    isTouchInteracting.value = false;
    isInteracting.value = false;
    initialPinchDistance.value = getPinchDistance(event.touches);
    initialPinchZoom.value = zoom.value;
    initialPinchPan.value = { x: panX.value, y: panY.value };
    initialPinchCenter.value = {
      x: (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2,
      y: (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2
    };
    return;
  }

  if (event.touches.length === 1) {
    isTouchInteracting.value = true;
    handlePointerDown(getCanvasCoordinates(event.touches[0]!, zoom.value));
  }
}

function editTouchMove(event: TouchEvent) {
  event.preventDefault();

  if (event.touches.length === 2 && initialPinchDistance.value !== null && initialPinchCenter.value) {
    const currentDistance = getPinchDistance(event.touches);
    const scale = currentDistance / initialPinchDistance.value;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, initialPinchZoom.value * scale));

    const container = containerRef.value;
    if (container) {
      const rect = container.getBoundingClientRect();
      const cx = initialPinchCenter.value.x - rect.left - rect.width / 2;
      const cy = initialPinchCenter.value.y - rect.top - rect.height / 2;
      panX.value = cx - (cx - initialPinchPan.value.x) * (newZoom / initialPinchZoom.value);
      panY.value = cy - (cy - initialPinchPan.value.y) * (newZoom / initialPinchZoom.value);
    }

    zoom.value = newZoom;
    return;
  }

  if (event.touches.length === 1 && isTouchInteracting.value && isInteracting.value) {
    handlePointerMove(getCanvasCoordinates(event.touches[0]!, zoom.value));
  }
}

function editTouchEnd(event: TouchEvent) {
  event.preventDefault();
  if (initialPinchDistance.value !== null) {
    initialPinchDistance.value = null;
    initialPinchCenter.value = null;
    return;
  }
  if (isTouchInteracting.value) { handlePointerUp(); isTouchInteracting.value = false; }
}

// Unified pointer handlers (edit mode only)
function handlePointerDown(coords: { x: number; y: number }) {
  // Check resize handles
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

  // Check click on existing occlusion
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

  // Start drawing new rectangle
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

// ── Actions ──
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

// Wheel zoom (both modes)
function handleWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -0.15 : 0.15;
  zoomToPoint(zoom.value + delta, event.clientX, event.clientY);
  if (zoom.value <= 1) { panX.value = 0; panY.value = 0; }
}

function handleResize() {
  if (imageLoaded.value) {
    setupCanvas({ containerPadding: 32, fitToContainer: true });
    redrawCanvas();
  }
}

// Watch color changes
watch(occlusionColor, (newColor) => {
  if (selectedOcclusionId.value) {
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value);
    if (occ) { occ.label = newColor; commitToHistory(); redrawCanvas(); }
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
            <!-- Edit tools (only in edit mode) -->
            <template v-if="isEditMode">
              <!-- Color Picker -->
              <OcclusionColorPicker v-model="occlusionColor" />

              <!-- Undo/Redo -->
              <UndoRedoControls
                :can-undo="canUndo"
                :can-redo="canRedo"
                @undo="() => { undo(); redrawCanvas() }"
                @redo="() => { redo(); redrawCanvas() }"
              />

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
            </template>

            <!-- Navigate mode hint -->
            <div
              v-else
              class="text-xs text-muted-foreground"
            >
              Arraste para mover · Scroll para zoom
            </div>

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
          class="flex-1 overflow-hidden flex items-center justify-center p-4"
          :class="[
            isNavigateMode ? 'cursor-grab' : '',
            isNavigateMode && isPanDragging ? 'cursor-grabbing!' : '',
          ]"
          @wheel.prevent="handleWheel"
          @mousedown="isNavigateMode ? navMouseDown($event) : editMouseDown($event)"
          @mousemove="isNavigateMode ? navMouseMove($event) : editMouseMove($event)"
          @mouseup="isNavigateMode ? navMouseUp() : editMouseUp()"
          @mouseleave="isNavigateMode ? navMouseUp() : editMouseUp()"
          @touchstart="isNavigateMode ? navTouchStart($event) : editTouchStart($event)"
          @touchmove="isNavigateMode ? navTouchMove($event) : editTouchMove($event)"
          @touchend="isNavigateMode ? navTouchEnd($event) : editTouchEnd($event)"
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
              transition: isPanDragging ? 'none' : 'transform 0.1s ease-out',
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
              :class="[
                'block shadow-2xl rounded-lg touch-none',
                isEditMode ? 'cursor-crosshair' : '',
              ]"
            />
          </div>
        </div>

        <!-- Floating Mode Toggle (mobile FAB) -->
        <Button
          class="fixed bottom-24 right-4 rounded-full shadow-lg flex items-center gap-2 px-4 py-3 transition-all active:scale-95 z-60 md:hidden"
          :class="isEditMode ? 'bg-primary hover:bg-primary-hover text-primary-foreground' : 'bg-background hover:bg-muted text-foreground border border-border'"
          @click="toggleMode"
        >
          <component
            :is="isEditMode ? Hand : Pencil"
            class="w-5 h-5"
          />
          <span class="text-sm font-medium">{{ isEditMode ? 'Navegar' : 'Editar' }}</span>
        </Button>

        <!-- Footer -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-t border-border p-2 sm:p-3 safe-area-bottom">
          <div class="flex items-center justify-between gap-2 max-w-5xl mx-auto">
            <!-- Mode Toggle (desktop only) -->
            <div class="hidden md:flex rounded-lg border border-border overflow-hidden shrink-0">
              <button
                :class="[
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                  isNavigateMode ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                ]"
                @click="editorMode = 'navigate'"
              >
                <Hand class="w-4 h-4" />
                Navegar
              </button>
              <button
                :class="[
                  'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors',
                  isEditMode ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                ]"
                @click="editorMode = 'edit'"
              >
                <Pencil class="w-4 h-4" />
                Editar
              </button>
            </div>

            <!-- Mobile: area count + mode label -->
            <div class="text-xs text-muted-foreground md:hidden">
              {{ localOcclusions.length }} área(s) · {{ isNavigateMode ? 'Navegar' : 'Editar' }}
            </div>

            <!-- Desktop: area count -->
            <div class="text-xs text-muted-foreground hidden md:block">
              {{ localOcclusions.length }} área(s)
            </div>

            <!-- Save / Cancel -->
            <div class="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                @click="handleCancel"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                :disabled="localOcclusions.length === 0"
                @click="handleSave"
              >
                <Check class="w-4 h-4 mr-1" />
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
