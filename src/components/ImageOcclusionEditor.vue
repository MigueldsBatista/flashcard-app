<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import type { ImageOcclusion } from '@/types/flashcard'
import { Check, RotateCcw, Square, Trash2, Upload } from 'lucide-vue-next'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  imageData?: string
  occlusions?: ImageOcclusion[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:imageData': [value: string]
  'update:occlusions': [value: ImageOcclusion[]]
  save: [data: { imageData: string; occlusions: ImageOcclusion[] }]
  cancel: []
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const imageData = ref(props.imageData || '')
const occlusions = ref<ImageOcclusion[]>(props.occlusions || [])
const isDrawing = ref(false)
const startPoint = ref<{ x: number; y: number } | null>(null)
const currentRect = ref<{ x: number; y: number; width: number; height: number } | null>(null)
const selectedOcclusionId = ref<string | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const canvasScale = ref(1)
const imageLoaded = ref(false)

const hasImage = computed(() => !!imageData.value)
const canSave = computed(() => hasImage.value && occlusions.value.length > 0)

function generateId(): string {
  return `occ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function clearImage() {
  imageData.value = ''
  occlusions.value = []
  imageElement.value = null
  imageLoaded.value = false
  selectedOcclusionId.value = null
  emit('update:imageData', '')
  emit('update:occlusions', [])
  // Reset file input
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  imageLoaded.value = false
  
  const reader = new FileReader()
  reader.onload = (e) => {
    imageData.value = e.target?.result as string
    emit('update:imageData', imageData.value)
    nextTick(() => {
      loadImageAndSetupCanvas()
    })
  }
  reader.readAsDataURL(file)
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

function loadImageAndSetupCanvas() {
  if (!imageData.value) return
  
  const img = new Image()
  img.crossOrigin = 'anonymous'
  
  img.onload = () => {
    imageElement.value = img
    imageLoaded.value = true
    nextTick(() => {
      setupCanvas()
    })
  }
  
  img.onerror = () => {
    console.error('Failed to load image')
    imageLoaded.value = false
  }
  
  img.src = imageData.value
}

function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  const img = imageElement.value

  if (!canvas || !container || !img) {
    console.warn('Canvas setup failed - missing elements', { canvas: !!canvas, container: !!container, img: !!img })
    return
  }

  // Get container width (use a minimum to prevent issues)
  const containerWidth = Math.max(container.clientWidth, 200)
  // For mobile, use a smaller max height
  const isMobile = window.innerWidth < 640
  const maxHeight = isMobile ? 280 : 400

  // Calculate scale to fit container while maintaining aspect ratio
  const scaleX = containerWidth / img.width
  const scaleY = maxHeight / img.height
  const displayScale = Math.min(scaleX, scaleY, 1)
  canvasScale.value = displayScale

  // Calculate display dimensions
  const displayWidth = Math.floor(img.width * displayScale)
  const displayHeight = Math.floor(img.height * displayScale)
  
  // Get device pixel ratio for high DPI displays
  const dpr = window.devicePixelRatio || 1
  
  // Set canvas internal dimensions for high quality rendering
  // Canvas draws at full resolution (or scaled by DPR for retina)
  canvas.width = img.width * Math.min(dpr, 2) // Limit to 2x for performance
  canvas.height = img.height * Math.min(dpr, 2)
  
  // Set CSS dimensions for display
  canvas.style.width = `${displayWidth}px`
  canvas.style.height = `${displayHeight}px`

  redrawCanvas()
}

function redrawCanvas() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  const img = imageElement.value

  if (!canvas || !ctx || !img) return

  // Get device pixel ratio
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  
  // Scale factor from original image to canvas internal dimensions
  const internalScale = canvas.width / img.width

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Enable image smoothing for better quality
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Draw image at full canvas resolution
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  // Draw existing occlusions (using internal scale, not display scale)
  occlusions.value.forEach((occ, index) => {
    const x = occ.x * internalScale
    const y = occ.y * internalScale
    const width = occ.width * internalScale
    const height = occ.height * internalScale

    // Draw filled rectangle
    ctx.fillStyle = selectedOcclusionId.value === occ.id
      ? 'rgba(59, 130, 246, 0.7)'
      : 'rgba(239, 68, 68, 0.6)'
    ctx.fillRect(x, y, width, height)

    // Draw border
    ctx.strokeStyle = selectedOcclusionId.value === occ.id
      ? 'rgba(59, 130, 246, 1)'
      : 'rgba(239, 68, 68, 1)'
    ctx.lineWidth = 2 * dpr
    ctx.strokeRect(x, y, width, height)

    // Draw label number
    ctx.fillStyle = 'white'
    const fontSize = Math.max(14 * dpr, Math.min(width, height) * 0.35)
    ctx.font = `bold ${fontSize}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${index + 1}`, x + width / 2, y + height / 2)
  })

  // Draw current drawing rectangle
  if (currentRect.value) {
    const x = currentRect.value.x * internalScale
    const y = currentRect.value.y * internalScale
    const width = currentRect.value.width * internalScale
    const height = currentRect.value.height * internalScale
    
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)'
    ctx.fillRect(x, y, width, height)
    ctx.strokeStyle = 'rgba(59, 130, 246, 1)'
    ctx.lineWidth = 2 * dpr
    ctx.setLineDash([5 * dpr, 5 * dpr])
    ctx.strokeRect(x, y, width, height)
    ctx.setLineDash([])
  }
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

  // Get coordinates relative to canvas, then convert to original image coordinates
  const x = (clientX - rect.left) / canvasScale.value
  const y = (clientY - rect.top) / canvasScale.value

  return { x, y }
}

function handleTouchStart(event: TouchEvent) {
  event.preventDefault()
  event.stopPropagation()
  handleMouseDown(event)
}

function handleTouchMove(event: TouchEvent) {
  event.preventDefault()
  event.stopPropagation()
  handleMouseMove(event)
}

function handleTouchEnd(event: TouchEvent) {
  event.preventDefault()
  event.stopPropagation()
  handleMouseUp(event)
}

function handleMouseDown(event: MouseEvent | TouchEvent) {
  if (!hasImage.value || !imageLoaded.value) return

  const coords = getCanvasCoordinates(event)

  // Check if clicking on existing occlusion
  const clickedOcclusion = occlusions.value.find(occ =>
    coords.x >= occ.x &&
    coords.x <= occ.x + occ.width &&
    coords.y >= occ.y &&
    coords.y <= occ.y + occ.height
  )

  if (clickedOcclusion) {
    selectedOcclusionId.value = clickedOcclusion.id
    redrawCanvas()
    return
  }

  // Start drawing new rectangle
  selectedOcclusionId.value = null
  isDrawing.value = true
  startPoint.value = coords
  currentRect.value = { x: coords.x, y: coords.y, width: 0, height: 0 }
}

function handleMouseMove(event: MouseEvent | TouchEvent) {
  if (!isDrawing.value || !startPoint.value) return

  const coords = getCanvasCoordinates(event)

  // Calculate rectangle (handle negative dimensions)
  const x = Math.min(startPoint.value.x, coords.x)
  const y = Math.min(startPoint.value.y, coords.y)
  const width = Math.abs(coords.x - startPoint.value.x)
  const height = Math.abs(coords.y - startPoint.value.y)

  currentRect.value = { x, y, width, height }
  redrawCanvas()
}

function handleMouseUp(event: MouseEvent | TouchEvent) {
  if (!isDrawing.value || !currentRect.value) {
    isDrawing.value = false
    return
  }

  // Only add if rectangle has meaningful size (smaller threshold for mobile)
  const minSize = window.innerWidth < 640 ? 5 : 10
  if (currentRect.value.width > minSize && currentRect.value.height > minSize) {
    const newOcclusion: ImageOcclusion = {
      id: generateId(),
      x: currentRect.value.x,
      y: currentRect.value.y,
      width: currentRect.value.width,
      height: currentRect.value.height,
    }
    occlusions.value.push(newOcclusion)
    emit('update:occlusions', occlusions.value)
  }

  isDrawing.value = false
  startPoint.value = null
  currentRect.value = null
  redrawCanvas()
}

function deleteSelectedOcclusion() {
  if (!selectedOcclusionId.value) return

  occlusions.value = occlusions.value.filter(occ => occ.id !== selectedOcclusionId.value)
  selectedOcclusionId.value = null
  emit('update:occlusions', occlusions.value)
  redrawCanvas()
}

function clearAllOcclusions() {
  occlusions.value = []
  selectedOcclusionId.value = null
  emit('update:occlusions', occlusions.value)
  redrawCanvas()
}

function handleSave() {
  emit('save', {
    imageData: imageData.value,
    occlusions: occlusions.value,
  })
}

function handleResize() {
  if (imageLoaded.value) {
    setupCanvas()
  }
}

// Watch for prop changes
watch(() => props.imageData, (newVal) => {
  if (newVal !== imageData.value) {
    imageData.value = newVal || ''
    if (imageData.value) {
      nextTick(() => loadImageAndSetupCanvas())
    }
  }
})

watch(() => props.occlusions, (newVal) => {
  if (newVal) {
    occlusions.value = [...newVal]
    redrawCanvas()
  }
}, { deep: true })

onMounted(() => {
  if (imageData.value) {
    loadImageAndSetupCanvas()
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="space-y-3">
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="handleFileSelect"
    />

    <!-- Image Upload Area -->
    <div v-if="!hasImage" class="space-y-3">
      <Card
        class="p-6 sm:p-8 border-2 border-dashed border-border cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
        @click="triggerFileInput"
      >
        <div class="text-center">
          <Upload class="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-2" />
          <p class="text-foreground font-medium mb-1 text-sm sm:text-base">
            Toque para enviar uma imagem
          </p>
          <p class="text-xs sm:text-sm text-muted-foreground">
            PNG, JPG ou GIF
          </p>
        </div>
      </Card>
    </div>

    <!-- Canvas Editor -->
    <div v-else class="space-y-3">
      <!-- Toolbar - simplified for mobile -->
      <div class="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" @click="triggerFileInput" class="text-xs sm:text-sm">
          <Upload class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span class="hidden xs:inline">Nova </span>Imagem
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="text-xs sm:text-sm"
          @click="clearImage"
        >
          <X class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Remover
        </Button>
        <Button
          v-if="occlusions.length > 0"
          variant="outline"
          size="sm"
          class="text-xs sm:text-sm"
          @click="clearAllOcclusions"
        >
          <RotateCcw class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Limpar
        </Button>
        <Button
          v-if="selectedOcclusionId"
          variant="destructive"
          size="sm"
          class="text-xs sm:text-sm ml-auto"
          @click="deleteSelectedOcclusion"
        >
          <Trash2 class="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          Excluir
        </Button>
      </div>

      <!-- Instructions - compact for mobile -->
      <div class="bg-muted/50 rounded-lg p-2 sm:p-3">
        <div class="flex items-start gap-2">
          <Square class="w-3 h-3 sm:w-4 sm:h-4 text-primary mt-0.5 flex-shrink-0" />
          <div class="text-xs sm:text-sm text-muted-foreground">
            <p class="font-medium text-foreground">Desenhe as áreas de oclusão</p>
            <p class="hidden sm:block">Clique e arraste para criar retângulos nas áreas que devem ficar ocultas.</p>
            <p class="sm:hidden">Toque e arraste para criar os retângulos.</p>
          </div>
        </div>
      </div>

      <!-- Canvas Container - fixed sizing -->
      <div
        ref="containerRef"
        class="relative bg-muted rounded-lg overflow-hidden border border-border flex items-center justify-center"
        style="min-height: 150px;"
      >
        <!-- Loading state -->
        <div v-if="hasImage && !imageLoaded" class="absolute inset-0 flex items-center justify-center">
          <div class="text-muted-foreground text-sm">Carregando imagem...</div>
        </div>
        
        <!-- Canvas -->
        <canvas
          v-show="imageLoaded"
          ref="canvasRef"
          class="block touch-none cursor-crosshair max-w-full"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
          @touchstart.passive="handleTouchStart"
          @touchmove.passive="handleTouchMove"
          @touchend.passive="handleTouchEnd"
        />
      </div>

      <!-- Occlusion List - compact chips -->
      <div v-if="occlusions.length > 0" class="space-y-1">
        <p class="text-xs font-medium text-muted-foreground">
          {{ occlusions.length }} área(s) de oclusão
        </p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="(occ, index) in occlusions"
            :key="occ.id"
            :class="[
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
              selectedOcclusionId === occ.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            ]"
            @click="selectedOcclusionId = occ.id; redrawCanvas()"
          >
            {{ index + 1 }}
          </button>
        </div>
      </div>

      <!-- Action Buttons - stack on mobile -->
      <div class="flex flex-col sm:flex-row gap-2 pt-1">
        <Button
          :disabled="!canSave"
          class="flex-1 text-sm"
          @click="handleSave"
        >
          <Check class="w-4 h-4 mr-1.5" />
          Criar com {{ occlusions.length }} Oclusão
        </Button>
        <Button variant="outline" class="text-sm" @click="emit('cancel')">
          Cancelar
        </Button>
      </div>
    </div>
  </div>
</template>
