<script setup lang="ts">
import type { ImageOcclusion } from '@/types/flashcard'
import { computed, onMounted, ref, watch } from 'vue'

interface Props {
  imageData: string
  occlusions: ImageOcclusion[]
  interactive?: boolean // Allow clicking to reveal
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
})

const emit = defineEmits<{
  allRevealed: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const imageElement = ref<HTMLImageElement | null>(null)
const canvasScale = ref(1)
const revealedIds = ref<Set<string>>(new Set())

const allRevealed = computed(() => {
  return revealedIds.value.size === props.occlusions.length
})

function loadImage() {
  if (!props.imageData) return
  
  const img = new Image()
  img.onload = () => {
    imageElement.value = img
    setupCanvas()
  }
  img.src = props.imageData
}

function setupCanvas() {
  const canvas = canvasRef.value
  const container = containerRef.value
  const img = imageElement.value
  
  if (!canvas || !container || !img) return
  
  const containerWidth = container.clientWidth
  const maxHeight = 350
  
  const scale = Math.min(containerWidth / img.width, maxHeight / img.height, 1)
  canvasScale.value = scale
  
  canvas.width = img.width * scale
  canvas.height = img.height * scale
  
  redrawCanvas()
}

function redrawCanvas() {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  const img = imageElement.value
  
  if (!canvas || !ctx || !img) return
  
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  
  // Draw occlusions (hidden areas)
  props.occlusions.forEach((occ, index) => {
    const x = occ.x * canvasScale.value
    const y = occ.y * canvasScale.value
    const width = occ.width * canvasScale.value
    const height = occ.height * canvasScale.value
    
    const isRevealed = revealedIds.value.has(occ.id)
    
    if (!isRevealed) {
      // Draw covered area with individual occlusion color (fully opaque)
      const color = occ.label || '#EF4444'
      ctx.fillStyle = color
      ctx.fillRect(x, y, width, height)
      
      // Draw border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, width, height)
      
      // Draw question mark or number
      ctx.fillStyle = 'white'
      ctx.font = `bold ${Math.min(width, height) * 0.4}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('?', x + width / 2, y + height / 2)
    } else {
      // Draw revealed indicator (green border)
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, width, height)
    }
  })
}

function handleCanvasClick(event: MouseEvent | TouchEvent) {
  if (!props.interactive) return
  
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  let clientX: number, clientY: number
  
  if ('touches' in event) {
    const touch = event.touches[0] || event.changedTouches[0]
    if (!touch) return
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = event.clientX
    clientY = event.clientY
  }
  
  const x = (clientX - rect.left) / canvasScale.value
  const y = (clientY - rect.top) / canvasScale.value
  
  // Check if click is on an unrevealed occlusion
  const clickedOcclusion = props.occlusions.find(occ => 
    !revealedIds.value.has(occ.id) &&
    x >= occ.x && 
    x <= occ.x + occ.width &&
    y >= occ.y && 
    y <= occ.y + occ.height
  )
  
  if (clickedOcclusion) {
    revealedIds.value.add(clickedOcclusion.id)
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
    
    redrawCanvas()
    
    if (allRevealed.value) {
      emit('allRevealed')
    }
  }
}

function revealAll() {
  props.occlusions.forEach(occ => {
    revealedIds.value.add(occ.id)
  })
  redrawCanvas()
  emit('allRevealed')
}

function resetRevealedState() {
  revealedIds.value.clear()
  redrawCanvas()
}

// Expose methods
defineExpose({
  revealAll,
  resetRevealedState,
})

watch(() => props.imageData, () => {
  loadImage()
})

watch(() => props.occlusions, () => {
  revealedIds.value.clear()
  redrawCanvas()
}, { deep: true })

onMounted(() => {
  loadImage()
  window.addEventListener('resize', setupCanvas)
})
</script>

<template>
  <div class="space-y-3">
    <div 
      ref="containerRef" 
      class="relative bg-muted rounded-lg overflow-hidden border border-border"
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
  </div>
</template>
