<script setup lang="ts">
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import Dialog from '@/components/ui/Dialog.vue';
import Tabs from '@/components/ui/Tabs.vue';
import Textarea from '@/components/ui/Textarea.vue';
import { useDeckOperations } from '@/composables/useDeckOperations';
import { useNotifications } from '@/composables/useNotifications';
import { aiGeneratorService } from '@/services/provider';
import { useFlashcardStore } from '@/stores/flashcard';
import type { CardContent } from '@/types/flashcard';
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Check,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Upload,
  X
} from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const store = useFlashcardStore();
const { createDeck } = useDeckOperations();
const { success, error: showError } = useNotifications();

// Tab state
const activeTab = ref<'image' | 'text'>('image');
const inputTabs = [
  { id: 'image', label: 'Imagem', icon: Camera },
  { id: 'text', label: 'Texto', icon: FileText }
];

// Form state
const imageFile = ref<File | null>(null);
const imagePreview = ref<string>('');
const textContent = ref('');
const contextHint = ref('');
const numCards = ref<number | null>(null);

// Generation state
const isGenerating = ref(false);
const generationError = ref<string | null>(null);

// Preview state
const showPreview = ref(false);
const generatedCards = ref<Array<{
  content: CardContent;
  selected: boolean;
}>>([]);

// Deck selection
const selectedDeckId = ref<string>('');
const showNewDeckInput = ref(false);
const newDeckName = ref('');

// Save state (prevents double-click)
const isSaving = ref(false);

// Card limit
// const MAX_CARDS = 20

// Computed
const availableDecks = computed(() => store.decks);

const canSave = computed(() => {
  if (selectedCardsCount.value === 0) return false;
  if (showNewDeckInput.value) return newDeckName.value.trim().length > 0;
  return !!selectedDeckId.value;
});

const hasInput = computed(() => {
  switch (activeTab.value) {
    case 'image': return !!imageFile.value;
    case 'text': return textContent.value.trim().length > 20;
    default: return false;
  }
});

const selectedCardsCount = computed(() =>
  generatedCards.value.filter(c => c.selected).length
);

// Handlers
function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      showError('Por favor, selecione uma imagem válida');
      return;
    }
    imageFile.value = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer?.files[0];
  if (file && file.type.startsWith('image/')) {
    imageFile.value = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      imagePreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }
}

function clearImage() {
  imageFile.value = null;
  imagePreview.value = '';
}

async function handleGenerate() {
  if (!hasInput.value) return;

  isGenerating.value = true;
  generationError.value = null;

  try {
    const options = {
      context: contextHint.value || undefined,
      numCards: numCards.value && numCards.value > 0 ? numCards.value : undefined
    };

    const result = activeTab.value === 'image' && imageFile.value
      ? await aiGeneratorService.generateFromImage(imageFile.value, options)
      : await aiGeneratorService.generateFromText(textContent.value, options);

    generatedCards.value = result.map(card => ({
      content: card.content,
      selected: true
    }));
    showPreview.value = true;
  } catch (err) {
    generationError.value = err instanceof Error ? err.message : 'Erro desconhecido';
  } finally {
    isGenerating.value = false;
  }
}

function toggleCardSelection(index: number) {
  const card = generatedCards.value[index];
  if (card) {
    card.selected = !card.selected;
  }
}

function selectAllCards() {
  generatedCards.value.forEach(c => c.selected = true);
}

function deselectAllCards() {
  generatedCards.value.forEach(c => c.selected = false);
}

async function saveSelectedCards() {
  if (isSaving.value) return; // Prevent double-click

  // Handle new deck creation
  if (showNewDeckInput.value) {
    if (!newDeckName.value.trim()) {
      showError('Digite o nome do baralho');
      return;
    }

    isSaving.value = true;
    const result = await createDeck({
      name: newDeckName.value.trim(),
      description: 'Criado via geração IA',
      color: '#8B5CF6' // Purple for AI-generated
    });

    if (!result.success || !result.data) {
      showError(result.error || 'Erro ao criar baralho');
      isSaving.value = false;
      return;
    }

    selectedDeckId.value = result.data.id;
    // Also add to store so it shows in the list
    store.decks.push(result.data);
  } else if (!selectedDeckId.value) {
    showError('Selecione um baralho');
    return;
  }

  isSaving.value = true;
  const cardsToSave = generatedCards.value.filter(c => c.selected);

  try {
    for (const card of cardsToSave) {
      await store.addCard({
        deckId: selectedDeckId.value,
        content: card.content,
        status: 'new',
        interval: 0,
        easeFactor: 2.5,
        repetitions: 0,
        lapses: 0,
        nextReview: new Date()
      });
    }

    success(`${cardsToSave.length} cartões salvos com sucesso!`);
    showPreview.value = false;
    generatedCards.value = [];
    resetForm();
  } catch {
    showError('Erro ao salvar cartões');
  } finally {
    isSaving.value = false;
  }
}

function resetForm() {
  imageFile.value = null;
  imagePreview.value = '';
  textContent.value = '';
  contextHint.value = '';
  numCards.value = null;
  generationError.value = null;
  showNewDeckInput.value = false;
  newDeckName.value = '';
  selectedDeckId.value = '';
}

function closePreview() {
  showPreview.value = false;
  generatedCards.value = [];
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-24 md:pb-8">
    <div class="max-w-3xl mx-auto">
      <!-- Header -->
      <div class="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          class="p-2"
          @click="router.push('/')"
        >
          <ArrowLeft class="w-5 h-5" />
        </Button>
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles class="w-6 h-6 text-primary" />
            Gerar com IA
          </h1>
          <p class="text-sm text-muted-foreground">
            Crie flashcards automaticamente
          </p>
        </div>
      </div>

      <!-- Main Card -->
      <Card class="p-4 sm:p-6">
        <!-- Tabs -->
        <Tabs
          v-model="activeTab"
          :tabs="inputTabs"
        >
          <template #default="{ activeTab: tab }">
            <!-- Image Upload Tab -->
            <div
              v-if="tab === 'image'"
              class="space-y-4"
            >
              <div
                v-if="!imagePreview"
                class="border-2 border-dashed border-border rounded-xl p-8 sm:p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                @click="($refs.fileInput as HTMLInputElement)?.click()"
                @dragover.prevent
                @drop="handleDrop"
              >
                <Upload class="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p class="text-foreground font-medium mb-2">
                  Arraste uma imagem ou clique para selecionar
                </p>
                <p class="text-sm text-muted-foreground">
                  PNG, JPG ou JPEG até 10MB
                </p>
                <input
                  ref="fileInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleFileSelect"
                >
              </div>

              <div
                v-else
                class="relative"
              >
                <img
                  :src="imagePreview"
                  alt="Imagem selecionada"
                  class="w-full max-h-64 object-contain rounded-xl border border-border"
                >
                <button
                  class="absolute top-2 right-2 p-2 bg-destructive/90 text-white rounded-full hover:bg-destructive transition-colors"
                  @click="clearImage"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>

              <!-- Context hint for image -->
              <div>
                <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Contexto adicional (opcional)
                </label>
                <Textarea
                  v-model="contextHint"
                  placeholder="Ex: focar nos termos em latim, ignorar títulos..."
                  :rows="2"
                />
              </div>
            </div>

            <!-- Text Input Tab -->
            <div
              v-if="tab === 'text'"
              class="space-y-4"
            >
              <div>
                <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                  Cole ou digite o texto
                </label>
                <Textarea
                  v-model="textContent"
                  placeholder="Cole aqui o conteúdo de um livro, slide, ou anotações de aula..."
                  :rows="8"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  {{ textContent.length }} caracteres (máx. 4000)
                </p>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                Quantidade de cards (opcional)
              </label>
              <input
                v-model.number="numCards"
                type="number"
                min="1"
                max="20"
                placeholder="5"
                class="w-24 px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </div>
          </template>
        </Tabs>

        <!-- Error Message -->
        <div
          v-if="generationError"
          class="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3"
        >
          <AlertCircle class="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p class="text-sm text-destructive font-medium">Erro na geração</p>
            <p class="text-sm text-muted-foreground">{{ generationError }}</p>
          </div>
        </div>

        <!-- Generate Button -->
        <div class="mt-6">
          <Button
            :disabled="!hasInput || isGenerating"
            class="w-full h-12 text-base font-semibold"
            @click="handleGenerate"
          >
            <template v-if="isGenerating">
              <Loader2 class="w-5 h-5 mr-2 animate-spin" />
              Gerando flashcards...
            </template>
            <template v-else>
              <Sparkles class="w-5 h-5 mr-2" />
              Gerar Flashcards
            </template>
          </Button>
        </div>
      </Card>

      <!-- Preview Dialog -->
      <Dialog
        :open="showPreview"
        @update:open="(v) => !v && closePreview()"
      >
        <template #default>
          <div class="space-y-4 max-h-[80vh] overflow-y-auto">
            <div class="flex items-center justify-between sticky top-0 bg-card pb-2 border-b border-border -mx-6 px-6 -mt-6 pt-6">
              <h2 class="text-lg font-semibold text-foreground">
                Cards Gerados ({{ generatedCards.length }})
              </h2>
              <div class="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="selectAllCards"
                >
                  Selecionar todos
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="deselectAllCards"
                >
                  Limpar
                </Button>
              </div>
            </div>

            <!-- Deck Selection -->
            <div class="p-4 bg-muted/50 rounded-lg space-y-3">
              <label class="text-sm font-medium text-muted-foreground block">
                Salvar no baralho:
              </label>

              <!-- Toggle between existing and new deck -->
              <div class="flex gap-2">
                <Button
                  :variant="!showNewDeckInput ? 'default' : 'outline'"
                  size="sm"
                  class="flex-1"
                  @click="showNewDeckInput = false"
                >
                  Baralho existente
                </Button>
                <Button
                  :variant="showNewDeckInput ? 'default' : 'outline'"
                  size="sm"
                  class="flex-1"
                  @click="showNewDeckInput = true"
                >
                  <Plus class="w-4 h-4 mr-1" />
                  Novo baralho
                </Button>
              </div>

              <!-- Existing deck selector -->
              <select
                v-if="!showNewDeckInput"
                v-model="selectedDeckId"
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option
                  value=""
                  disabled
                >
                  Selecione um baralho
                </option>
                <option
                  v-for="deck in availableDecks"
                  :key="deck.id"
                  :value="deck.id"
                >
                  {{ deck.name }}
                </option>
              </select>

              <!-- New deck input -->
              <input
                v-else
                v-model="newDeckName"
                type="text"
                placeholder="Nome do novo baralho..."
                class="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </div>

            <!-- Generated Cards List -->
            <div class="space-y-3">
              <div
                v-for="(card, index) in generatedCards"
                :key="index"
                :class="[
                  'p-4 rounded-xl border transition-all cursor-pointer',
                  card.selected
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/30 opacity-60'
                ]"
                @click="toggleCardSelection(index)"
              >
                <div class="flex items-start gap-3">
                  <div
                    :class="[
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors',
                      card.selected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    ]"
                  >
                    <Check
                      v-if="card.selected"
                      class="w-4 h-4"
                    />
                    <span
                      v-else
                      class="text-xs"
                    >{{ index + 1 }}</span>
                  </div>

                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-foreground mb-1">
                      {{ card.content.front }}
                    </p>
                    <p class="text-sm text-muted-foreground line-clamp-2">
                      {{ card.content.back }}
                    </p>
                    <span class="inline-block mt-2 px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                      {{ card.content.type === 'code' ? 'Código' : 'Texto' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Save Actions -->
            <div class="flex flex-col-reverse sm:flex-row gap-2 sticky bottom-0 bg-card pt-4 border-t border-border -mx-6 px-6 -mb-6 pb-6">
              <Button
                variant="outline"
                class="flex-1"
                @click="closePreview"
                :disabled="isSaving"
              >
                Cancelar
              </Button>
              <Button
                :disabled="!canSave || isSaving"
                class="flex-1"
                @click="saveSelectedCards"
              >
                <template v-if="isSaving">
                  <Loader2 class="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </template>
                <template v-else>
                  <Check class="w-4 h-4 mr-2" />
                  Salvar {{ selectedCardsCount }} cards
                </template>
              </Button>
            </div>
          </div>
        </template>
      </Dialog>
    </div>
  </div>
</template>
