<script setup lang="ts">
import ImageOcclusionDialog from '@/components/ImageOcclusionDialog.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import { useOcclusionCanvas } from '@/composables/useOcclusionCanvas';
import type { ImageOcclusion } from '@/types/flashcard';
import { Check, Edit2, Upload } from 'lucide-vue-next';
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

interface Props {
  imageData?: string;
  occlusions?: ImageOcclusion[];
  isEditing?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:imageData': [value: string];
  'update:occlusions': [value: ImageOcclusion[]];
  save: [data: { imageData: string; occlusions: ImageOcclusion[] }];
  cancel: [];
}>();

// Refs
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Canvas composable
const {
  imageLoaded,
  loadImageAndSetup,
  setupCanvas,
  redrawCanvas: baseRedraw
} = useOcclusionCanvas(canvasRef, containerRef);

// State
const imageData = ref(props.imageData || '');
const occlusions = ref<ImageOcclusion[]>(props.occlusions || []);
const dialogOpen = ref(false);

// Computed
const hasImage = computed(() => !!imageData.value);
const canSave = computed(() => hasImage.value && occlusions.value.length > 0);

// Canvas setup options for preview mode
const PREVIEW_OPTIONS = { maxHeight: 300 };

function redrawCanvas() {
  baseRedraw(occlusions.value);
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    imageData.value = e.target?.result as string;
    emit('update:imageData', imageData.value);
    nextTick(() => {
      loadImageAndSetup(imageData.value, PREVIEW_OPTIONS).then(() => {
        redrawCanvas();
        dialogOpen.value = true;
      });
    });
  };
  reader.readAsDataURL(file);
}

function triggerFileInput() {
  fileInputRef.value?.click();
}

function openEditor() {
  dialogOpen.value = true;
}

function handleDialogSave(newOcclusions: ImageOcclusion[]) {
  occlusions.value = newOcclusions;
  emit('update:occlusions', occlusions.value);
  dialogOpen.value = false;
  nextTick(() => redrawCanvas());
}

function handleDialogCancel() {
  dialogOpen.value = false;
}

function handleSave() {
  emit('save', {
    imageData: imageData.value,
    occlusions: occlusions.value
  });
}

function handleResize() {
  if (imageLoaded.value) {
    setupCanvas(PREVIEW_OPTIONS);
    redrawCanvas();
  }
}

// Watchers
watch(() => props.imageData, (newVal) => {
  if (newVal !== imageData.value) {
    imageData.value = newVal || '';
    if (imageData.value) {
      nextTick(() => {
        loadImageAndSetup(imageData.value, PREVIEW_OPTIONS).then(() => redrawCanvas());
      });
    }
  }
});

watch(() => props.occlusions, (newVal) => {
  if (newVal) {
    occlusions.value = [...newVal];
    nextTick(() => redrawCanvas());
  }
}, { deep: true });

onMounted(() => {
  if (imageData.value) {
    loadImageAndSetup(imageData.value, PREVIEW_OPTIONS).then(() => redrawCanvas());
  }
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});
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
    >

    <!-- Upload Area (no image) -->
    <div v-if="!hasImage">
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

    <!-- Preview (with image) -->
    <div
      v-else
      class="space-y-3"
    >
      <!-- Preview Card -->
      <Card
        class="relative overflow-hidden cursor-pointer group"
        @click="openEditor"
      >
        <!-- Canvas Preview -->
        <div
          ref="containerRef"
          class="flex items-center justify-center bg-muted p-2"
        >
          <canvas
            v-show="imageLoaded"
            ref="canvasRef"
            class="block max-w-full rounded"
          />
          <div
            v-if="!imageLoaded"
            class="py-8 text-muted-foreground text-sm"
          >
            Carregando...
          </div>
        </div>

        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div class="bg-white/90 rounded-full p-3">
            <Edit2 class="w-6 h-6 text-foreground" />
          </div>
        </div>

        <!-- Occlusion count badge -->
        <div
          v-if="occlusions.length > 0"
          class="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full"
        >
          {{ occlusions.length }}
        </div>
      </Card>

      <!-- Info text -->
      <p class="text-xs text-muted-foreground text-center">
        Toque na imagem para editar as áreas de oclusão
      </p>

      <!-- Action Buttons -->
      <div class="flex flex-col sm:flex-row gap-2">
        <Button
          :disabled="!canSave"
          class="flex-1 text-sm"
          @click="handleSave"
        >
          <Check class="w-4 h-4 mr-1.5" />
          {{ props.isEditing ? 'Salvar' : 'Criar Card' }}
        </Button>
        <Button
          variant="outline"
          class="text-sm"
          @click="emit('cancel')"
        >
          Cancelar
        </Button>
      </div>
    </div>

    <!-- Full-screen Editor Dialog -->
    <ImageOcclusionDialog
      v-model:open="dialogOpen"
      :image-data="imageData"
      :occlusions="occlusions"
      @save="handleDialogSave"
      @cancel="handleDialogCancel"
    />
  </div>
</template>
