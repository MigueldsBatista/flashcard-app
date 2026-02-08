<script setup lang="ts">
import OcclusionColorPicker from '@/components/OcclusionColorPicker.vue'
import Button from '@/components/ui/Button.vue'
import UndoRedoControls from '@/components/UndoRedoControls.vue'
import { useOcclusionHistory } from '@/composables/useOcclusionHistory'
import type { ImageOcclusion } from '@/types/flashcard'
import { Check, Minus, Plus, RotateCcw, Trash2, X, ZoomIn } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  open: boolean
  imageData: string
  occlusions: ImageOcclusion[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [occlusions: ImageOcclusion[]]
  cancel: []
}>()

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const imageLoaded = ref(false)

// State
const localOcclusions = ref<ImageOcclusion[]>([])
const selectedOcclusionId = ref<string | null>(null)
const occlusionColor = ref('#EF4444')
const canvasScale = ref(1)

// Zoom
const zoom = ref(1)
const MIN_ZOOM = 0.5
const MAX_ZOOM = 4

// Interaction modes
type InteractionMode = 'draw' | 'move' | 'resize'
const interactionMode = ref<InteractionMode>('draw')
const isInteracting = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)

// Resize handles
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null
const activeHandle = ref<ResizeHandle>(null)
const resizeStartRect = ref<ImageOcclusion | null>(null)
const moveStartOcclusion = ref<ImageOcclusion | null>(null)

// History
const { undo, redo, canUndo, canRedo } = useOcclusionHistory(localOcclusions)

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  if (!props.open) return
  
  if (event.key === 'z' && (event.ctrlKey || event.metaKey)) {
    event.preventDefault()
    if (event.shiftKey) {
      if (canRedo.value) redo()
    } else {
      if (canUndo.value) undo()
    }
  }
  
  if (event.key === 'Escape') {
    emit('cancel')
  }
  
  if (event.key === 'Delete' || event.key === 'Backspace') {
    if (selectedOcclusionId.value) {
      deleteSelectedOcclusion()
    }
  }
}

// Computed
const selectedOcclusion = computed(() =>
  localOcclusions.value.find(o => o.id === selectedOcclusionId.value)
)

// Initialize
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    localOcclusions.value = JSON.parse(JSON.stringify(props.occlusions))
    selectedOcclusionId.value = null
    zoom.value = 1
    nextTick(() => loadImage())
  }
}, { immediate: true })

function loadImage() {
  if (!props.imageData) return
  
  const img = new Image()
  img.crossOrigin = 'anonymous'
  
  img.onload = () => {
    imageElement.value = img
    imageLoaded.value = true
    nextTick(() => setupCanvas())
  }
  
  img.src = props.imageData
}

function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  const img = imageElement.value

  if (!canvas || !container || !img) return

  const containerWidth = container.clientWidth - 32 // Padding
  const containerHeight = container.clientHeight - 32
  
  const scaleX = containerWidth / img.width
  const scaleY = containerHeight / img.height
  const displayScale = Math.min(scaleX, scaleY, 1)
  canvasScale.value = displayScale

  const displayWidth = Math.floor(img.width * displayScale)
  const displayHeight = Math.floor(img.height * displayScale)
  
  const dpr = window.devicePixelRatio || 1
  
  canvas.width = img.width * Math.min(dpr, 2)
  canvas.height = img.height * Math.min(dpr, 2)
  
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`

  redrawCanvas()
}

function redrawCanvas() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  const img = imageElement.value

  if (!canvas || !ctx || !img) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const internalScale = canvas.width / img.width

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Draw occlusions with SOLID colors
  localOcclusions.value.forEach((occ, index) => {
    const x = occ.x * internalScale
    const y = occ.y * internalScale
    const width = occ.width * internalScale
    const height = occ.height * internalScale
    const isSelected = selectedOcclusionId.value === occ.id
    const color = occ.label || occlusionColor.value // Use stored color or current

    // Draw SOLID filled rectangle
    ctx.fillStyle = color
    ctx.fillRect(x, y, width, height)

    // Draw border
    ctx.strokeStyle = isSelected ? 'white' : 'rgba(0,0,0,0.3)'
    ctx.lineWidth = isSelected ? 3 * dpr : 1 * dpr
    ctx.strokeRect(x, y, width, height)

    // Draw label number
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'
    ctx.lineWidth = 2 * dpr
    const fontSize = Math.max(16 * dpr, Math.min(width, height) * 0.4)
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.strokeText(`${index + 1}`, x + width / 2, y + height / 2)
    ctx.fillText(`${index + 1}`, x + width / 2, y + height / 2)

    // Draw resize handles for selected
    if (isSelected) {
      drawResizeHandles(ctx, x, y, width, height, dpr)
    }
  })

  // Draw current drawing rectangle
  if (currentRect.value && interactionMode.value === 'draw') {
    const x = currentRect.value.x * internalScale
    const y = currentRect.value.y * internalScale
    const width = currentRect.value.width * internalScale
    const height = currentRect.value.height * internalScale
    
    ctx.fillStyle = occlusionColor.value
    ctx.globalAlpha = 0.7
    ctx.fillRect(x, y, width, height)
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2 * dpr
    ctx.setLineDash([5 * dpr, 5 * dpr])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])
  }
}

function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  dpr: number
) {
  const handleSize = 10 * dpr
  const halfHandle = handleSize / 2
  
  ctx.fillStyle = 'white'
  ctx.strokeStyle = 'rgba(0,0,0,0.5)'
  ctx.lineWidth = 1.5 * dpr

  const handles = [
    { x: x - halfHandle, y: y - halfHandle },
    { x: x + width / 2 - halfHandle, y: y - halfHandle },
    { x: x + width - halfHandle, y: y - halfHandle },
    { x: x + width - halfHandle, y: y + height / 2 - halfHandle },
    { x: x + width - halfHandle, y: y + height - halfHandle },
    { x: x + width / 2 - halfHandle, y: y + height - halfHandle },
    { x: x - halfHandle, y: y + height - halfHandle },
    { x: x - halfHandle, y: y + height / 2 - halfHandle },
  ]

  handles.forEach(handle => {
    ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
    ctx.strokeRect(handle.x, handle.y, handleSize, handleSize)
  })
}

function getHandleAtPosition(x: number, y: number, occ: ImageOcclusion): ResizeHandle {
  const handleSize = 16
  const halfHandle = handleSize / 2

  const handles: { pos: { x: number; y: number }; handle: ResizeHandle }[] = [
    { pos: { x: occ.x, y: occ.y }, handle: 'nw' },
    { pos: { x: occ.x + occ.width / 2, y: occ.y }, handle: 'n' },
    { pos: { x: occ.x + occ.width, y: occ.y }, handle: 'ne' },
    { pos: { x: occ.x + occ.width, y: occ.y + occ.height / 2 }, handle: 'e' },
    { pos: { x: occ.x + occ.width, y: occ.y + occ.height }, handle: 'se' },
    { pos: { x: occ.x + occ.width / 2, y: occ.y + occ.height }, handle: 's' },
    { pos: { x: occ.x, y: occ.y + occ.height }, handle: 'sw' },
    { pos: { x: occ.x, y: occ.y + occ.height / 2 }, handle: 'w' },
  ]

  for (const { pos, handle } of handles) {
    if (
      x >= pos.x - halfHandle &&
      x <= pos.x + halfHandle &&
      y >= pos.y - halfHandle &&
      y <= pos.y + halfHandle
    ) {
      return handle
    }
  }

  return null
}

function getCanvasCoordinates(event: MouseEvent | TouchEvent): { x: number; y: number } {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }

  const rect = canvas.getBoundingClientRect()
  let clientX: number
  let clientY: number

  if ('touches' in event && event.touches.length > 0) {
    clientX = event.touches[0]!.clientX
    clientY = event.touches[0]!.clientY
  } else if ('changedTouches' in event && event.changedTouches.length > 0) {
    clientX = event.changedTouches[0]!.clientX
    clientY = event.changedTouches[0]!.clientY
  } else if ('clientX' in event) {
    clientX = event.clientX
    clientY = event.clientY
  } else {
    return { x: 0, y: 0 }
  }

  const x = (clientX - rect.left) / (canvasScale.value * zoom.value)
  const y = (clientY - rect.top) / (canvasScale.value * zoom.value)

  return { x, y }
}

function generateId(): string {
  return `occ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function handlePointerDown(event: MouseEvent | TouchEvent) {
  if (!imageLoaded.value) return

  const coords = getCanvasCoordinates(event)

  // Check if clicking on a resize handle of selected occlusion
  if (selectedOcclusionId.value) {
    const selectedOcc = localOcclusions.value.find(o => o.id === selectedOcclusionId.value)
    if (selectedOcc) {
      const handle = getHandleAtPosition(coords.x, coords.y, selectedOcc)
      if (handle) {
        interactionMode.value = 'resize'
        isInteracting.value = true
        activeHandle.value = handle
        startPoint.value = coords
        resizeStartRect.value = { ...selectedOcc }
        return
      }
    }
  }

  // Check if clicking inside an existing occlusion
  const clickedOcclusion = [...localOcclusions.value].reverse().find(occ =>
    coords.x >= occ.x &&
    coords.x <= occ.x + occ.width &&
    coords.y >= occ.y &&
    coords.y <= occ.y + occ.height
  )

  if (clickedOcclusion) {
    // If already selected, start moving
    if (selectedOcclusionId.value === clickedOcclusion.id) {
      interactionMode.value = 'move'
      isInteracting.value = true
      startPoint.value = coords
      moveStartOcclusion.value = { ...clickedOcclusion }
    } else {
      // Select it
      selectedOcclusionId.value = clickedOcclusion.id
      redrawCanvas()
    }
    return
  }

  // Start drawing new rectangle
  selectedOcclusionId.value = null
  interactionMode.value = 'draw'
  isInteracting.value = true
  startPoint.value = coords
  currentRect.value = { x: coords.x, y: coords.y, width: 0, height: 0 }
}

function handlePointerMove(event: MouseEvent | TouchEvent) {
  if (!isInteracting.value || !startPoint.value) return

  const coords = getCanvasCoordinates(event)

  if (interactionMode.value === 'resize' && activeHandle.value && resizeStartRect.value) {
    const dx = coords.x - startPoint.value.x
    const dy = coords.y - startPoint.value.y
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value)
    
    if (occ) {
      const original = resizeStartRect.value
      
      switch (activeHandle.value) {
        case 'nw':
          occ.x = original.x + dx
          occ.y = original.y + dy
          occ.width = original.width - dx
          occ.height = original.height - dy
          break
        case 'n':
          occ.y = original.y + dy
          occ.height = original.height - dy
          break
        case 'ne':
          occ.y = original.y + dy
          occ.width = original.width + dx
          occ.height = original.height - dy
          break
        case 'e':
          occ.width = original.width + dx
          break
        case 'se':
          occ.width = original.width + dx
          occ.height = original.height + dy
          break
        case 's':
          occ.height = original.height + dy
          break
        case 'sw':
          occ.x = original.x + dx
          occ.width = original.width - dx
          occ.height = original.height + dy
          break
        case 'w':
          occ.x = original.x + dx
          occ.width = original.width - dx
          break
      }

      if (occ.width < 20) occ.width = 20
      if (occ.height < 20) occ.height = 20

      redrawCanvas()
    }
    return
  }

  if (interactionMode.value === 'move' && moveStartOcclusion.value) {
    const dx = coords.x - startPoint.value.x
    const dy = coords.y - startPoint.value.y
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value)
    
    if (occ) {
      occ.x = moveStartOcclusion.value.x + dx
      occ.y = moveStartOcclusion.value.y + dy
      redrawCanvas()
    }
    return
  }

  if (interactionMode.value === 'draw') {
    const x = Math.min(startPoint.value.x, coords.x)
    const y = Math.min(startPoint.value.y, coords.y)
    const width = Math.abs(coords.x - startPoint.value.x)
    const height = Math.abs(coords.y - startPoint.value.y)

    currentRect.value = { x, y, width, height }
    redrawCanvas()
  }
}

function handlePointerUp() {
  if (interactionMode.value === 'resize') {
    isInteracting.value = false
    activeHandle.value = null
    resizeStartRect.value = null
    startPoint.value = null
    return
  }

  if (interactionMode.value === 'move') {
    isInteracting.value = false
    moveStartOcclusion.value = null
    startPoint.value = null
    return
  }

  if (interactionMode.value === 'draw' && currentRect.value) {
    const minSize = 20
    if (currentRect.value.width > minSize && currentRect.value.height > minSize) {
      const newOcclusion: ImageOcclusion = {
        id: generateId(),
        x: currentRect.value.x,
        y: currentRect.value.y,
        width: currentRect.value.width,
        height: currentRect.value.height,
        label: occlusionColor.value, // Store the color
      }
      localOcclusions.value.push(newOcclusion)
      selectedOcclusionId.value = newOcclusion.id
    }
  }

  isInteracting.value = false
  startPoint.value = null
  currentRect.value = null
  redrawCanvas()
}

function deleteSelectedOcclusion() {
  if (!selectedOcclusionId.value) return
  localOcclusions.value = localOcclusions.value.filter(o => o.id !== selectedOcclusionId.value)
  selectedOcclusionId.value = null
  redrawCanvas()
}

function clearAllOcclusions() {
  localOcclusions.value = []
  selectedOcclusionId.value = null
  redrawCanvas()
}

function handleSave() {
  emit('save', localOcclusions.value)
  emit('update:open', false)
}

function handleCancel() {
  emit('cancel')
  emit('update:open', false)
}

function zoomIn() {
  zoom.value = Math.min(MAX_ZOOM, zoom.value + 0.25)
}

function zoomOut() {
  zoom.value = Math.max(MIN_ZOOM, zoom.value - 0.25)
}

function resetZoom() {
  zoom.value = 1
}

function handleWheel(event: WheelEvent) {
  if (!event.ctrlKey && !event.metaKey) return
  event.preventDefault()
  
  const delta = event.deltaY > 0 ? -0.1 : 0.1
  zoom.value = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom.value + delta))
}

function handleResize() {
  if (imageLoaded.value) {
    setupCanvas()
  }
}

// Watch color changes to update selected occlusion
watch(occlusionColor, (newColor) => {
  if (selectedOcclusionId.value) {
    const occ = localOcclusions.value.find(o => o.id === selectedOcclusionId.value)
    if (occ) {
      occ.label = newColor
      redrawCanvas()
    }
  }
})

// Watch zoom changes
watch(zoom, () => {
  redrawCanvas()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleResize)
})
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
        <div class="shrink-0 bg-background/90 backdrop-blur border-b border-border px-3 py-2 sm:px-4 sm:py-3">
          <div class="flex items-center gap-2 sm:gap-3 max-w-5xl mx-auto">
            <!-- Color Picker -->
            <OcclusionColorPicker v-model="occlusionColor" />

            <!-- Undo/Redo -->
            <UndoRedoControls
              :can-undo="canUndo"
              :can-redo="canRedo"
              @undo="undo"
              @redo="redo"
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
              <button
                type="button"
                :disabled="zoom <= MIN_ZOOM"
                class="p-1.5 rounded-lg transition-colors disabled:opacity-40 hover:bg-muted"
                @click="zoomOut"
              >
                <Minus class="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                type="button"
                class="px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted rounded min-w-12 text-center"
                @click="resetZoom"
              >
                {{ Math.round(zoom * 100) }}%
              </button>
              <button
                type="button"
                :disabled="zoom >= MAX_ZOOM"
                class="p-1.5 rounded-lg transition-colors disabled:opacity-40 hover:bg-muted"
                @click="zoomIn"
              >
                <Plus class="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <!-- Close -->
            <button
              type="button"
              class="p-2 rounded-lg hover:bg-muted transition-colors"
              @click="handleCancel"
            >
              <X class="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <!-- Canvas Area -->
        <div
          ref="containerRef"
          class="flex-1 overflow-auto flex items-center justify-center p-4"
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
              class="block shadow-2xl rounded-lg cursor-crosshair"
              @mousedown="handlePointerDown"
              @mousemove="handlePointerMove"
              @mouseup="handlePointerUp"
              @mouseleave="handlePointerUp"
              @touchstart.prevent="handlePointerDown"
              @touchmove.prevent="handlePointerMove"
              @touchend.prevent="handlePointerUp"
            />
          </div>
        </div>

        <!-- Footer -->
        <div class="shrink-0 bg-background/90 backdrop-blur border-t border-border p-3 sm:p-4">
          <div class="flex items-center justify-between gap-3 max-w-5xl mx-auto">
            <div class="text-sm text-muted-foreground">
              {{ localOcclusions.length }} área(s) de oclusão
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
