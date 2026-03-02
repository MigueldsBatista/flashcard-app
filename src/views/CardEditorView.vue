<script setup lang="ts">
import CardRenderer from '@/components/CardRenderer.vue';
import ImageOcclusionEditor from '@/components/ImageOcclusionEditor.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import Dialog from '@/components/ui/Dialog.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import Tabs from '@/components/ui/Tabs.vue';
import Textarea from '@/components/ui/Textarea.vue';
import { useFlashcardStore } from '@/stores/flashcard';
import type { CardContent, Card as FlashCard, ImageOcclusion } from '@/types/flashcard';
import { ArrowLeft, Edit, Eye, FilePlus, FileText, Grid3X3, Trash2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const store = useFlashcardStore();

const deckId = computed(() => route.params.id as string);

const isCreating = ref(false);
const editingCard = ref<FlashCard | null>(null);
const previewCard = ref<FlashCard | null>(null);

const cardType = ref<'text' | 'occlusion'>('text');
const frontContent = ref('');
const backContent = ref('');

// Occlusion-specific state
const occlusionImageData = ref('');
const occlusionAreas = ref<ImageOcclusion[]>([]);

const deck = computed(() => store.decks.find(d => d.id === deckId.value));
const deckCards = computed(() => store.cards.filter(card => card.deckId === deckId.value));

// Only text and occlusion are editable
const cardTypeTabs = [
  { id: 'text', label: 'Texto', icon: FileText },
  { id: 'occlusion', label: 'Oclusão', icon: Grid3X3 }
];

// Computed: check if form is valid for current card type
const isFormValid = computed(() => {
  if (cardType.value === 'occlusion') {
    return occlusionImageData.value && occlusionAreas.value.length > 0;
  }
  return frontContent.value.trim() && backContent.value.trim();
});

function handleCreateCard() {
  if (cardType.value === 'occlusion') {
    handleCreateOcclusionCard();
    return;
  }

  if (!frontContent.value.trim() || !backContent.value.trim()) return;

  const content: CardContent = {
    front: frontContent.value,
    back: backContent.value,
    type: cardType.value
  };

  store.addCard({
    deckId: deckId.value,
    content,
    status: 'new',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    nextReview: new Date()
  });

  resetForm();
  isCreating.value = false;
}

function handleCreateOcclusionCard() {
  if (!occlusionImageData.value || occlusionAreas.value.length === 0) return;

  const content: CardContent = {
    front: `Identifique as ${occlusionAreas.value.length} área(s) oculta(s)`,
    back: 'Clique nas áreas para revelar',
    type: 'occlusion',
    imageData: occlusionImageData.value,
    imageOcclusions: occlusionAreas.value
  };

  store.addCard({
    deckId: deckId.value,
    content,
    status: 'new',
    interval: 0,
    easeFactor: 2.5,
    repetitions: 0,
    lapses: 0,
    nextReview: new Date()
  });

  resetForm();
  isCreating.value = false;
}

function handleOcclusionSave(data: { imageData: string; occlusions: ImageOcclusion[] }) {
  occlusionImageData.value = data.imageData;
  occlusionAreas.value = data.occlusions;
  handleCreateOcclusionCard();
}

function handleUpdateCard() {
  if (!editingCard.value) return;

  if (cardType.value === 'occlusion') {
    if (!occlusionImageData.value || occlusionAreas.value.length === 0) return;

    const content: CardContent = {
      front: `Identifique as ${occlusionAreas.value.length} área(s) oculta(s)`,
      back: 'Clique nas áreas para revelar',
      type: 'occlusion',
      imageData: occlusionImageData.value,
      imageOcclusions: occlusionAreas.value
    };
    store.updateCard(editingCard.value.id, { content });
  } else {
    if (!frontContent.value.trim() || !backContent.value.trim()) return;

    const content: CardContent = {
      front: frontContent.value,
      back: backContent.value,
      type: cardType.value
    };
    store.updateCard(editingCard.value.id, { content });
  }

  resetForm();
  editingCard.value = null;
}

function handleEditCard(card: FlashCard) {
  editingCard.value = card;
  frontContent.value = card.content.front;
  backContent.value = card.content.back;
  // Map unsupported legacy types to text for backwards compatibility
  const isSupportedEditorType = card.content.type === 'text' || card.content.type === 'occlusion';
  cardType.value = (isSupportedEditorType ? card.content.type : 'text') as 'text' | 'occlusion';
  occlusionImageData.value = card.content.imageData || '';
  occlusionAreas.value = card.content.imageOcclusions ? [...card.content.imageOcclusions] : [];
}

function resetForm() {
  frontContent.value = '';
  backContent.value = '';
  cardType.value = 'text';
  occlusionImageData.value = '';
  occlusionAreas.value = [];
}

function handleOpenCreate() {
  resetForm();
  isCreating.value = true;
}

function getCardTypeIcon(type: string) {
  switch (type) {
    case 'text': return FileText;
    case 'code': return FileText;
    case 'occlusion': return Grid3X3;
    default: return FileText;
  }
}

function getCardTypeLabel(type: string) {
  switch (type) {
    case 'text': return 'Texto';
    case 'code': return 'Código';
    case 'occlusion': return 'Oclusão';
    default: return 'Texto';
  }
}

function handleDeleteCard(card: FlashCard) {
  if (confirm('Tem certeza que deseja excluir este cartão?')) {
    store.deleteCard(card.id);
  }
}

function handleCancelOcclusion() {
  if (editingCard.value) {
    editingCard.value = null;
  } else {
    isCreating.value = false;
  }
  resetForm();
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-28">
    <div class="max-w-2xl mx-auto">
      <!-- Header - compact for mobile -->
      <div class="mb-4 sm:mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          class="p-2"
          @click="router.push('/decks')"
        >
          <ArrowLeft class="w-5 h-5" />
        </Button>
        <div class="flex-1 min-w-0">
          <h1 class="text-lg sm:text-2xl font-bold text-foreground truncate">
            {{ deck?.name || 'Baralho' }}
          </h1>
          <p class="text-xs sm:text-sm text-muted-foreground">
            {{ deckCards.length }} {{ deckCards.length === 1 ? 'cartão' : 'cartões' }}
          </p>
        </div>

        <!-- Desktop Create Button -->
        <div class="hidden md:block">
          <Button
            class="flex items-center gap-2 px-6 shadow-md"
            @click="handleOpenCreate"
          >
            <FilePlus class="w-5 h-5" />
            <span>Novo Cartão</span>
          </Button>
        </div>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog
        :open="isCreating || editingCard !== null"
        @update:open="(v) => { if (!v) { isCreating = false; editingCard = null; resetForm() } }"
      >
        <template #default="{ close }">
          <div class="space-y-3">
            <h2 class="text-lg font-semibold text-foreground">
              {{ editingCard ? 'Editar Cartão' : 'Novo Cartão' }}
            </h2>

            <!-- Tabs: only shown when creating a new card -->
            <Tabs
              v-if="!editingCard"
              v-model="cardType"
              :tabs="cardTypeTabs"
            >
              <template #default="{ activeTab }">
                <!-- Text Type -->
                <div
                  v-if="activeTab === 'text'"
                  class="space-y-3"
                >
                  <div>
                    <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Pergunta
                    </label>
                    <Textarea
                      v-model="frontContent"
                      placeholder="Digite a pergunta..."
                      :rows="2"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                      Resposta
                    </label>
                    <Textarea
                      v-model="backContent"
                      placeholder="Digite a resposta..."
                      :rows="3"
                    />
                  </div>
                </div>

                <!-- Occlusion Type -->
                <div v-if="activeTab === 'occlusion'">
                  <ImageOcclusionEditor
                    :image-data="occlusionImageData"
                    :occlusions="occlusionAreas"
                    @update:image-data="occlusionImageData = $event"
                    @update:occlusions="occlusionAreas = $event"
                    @save="handleOcclusionSave"
                    @cancel="handleCancelOcclusion"
                  />
                </div>
              </template>
            </Tabs>

            <!-- Edit mode: show only the card's own content type (no tabs) -->
            <template v-else>
              <!-- Editing Text Card -->
              <div
                v-if="cardType === 'text'"
                class="space-y-3"
              >
                <div>
                  <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                    Pergunta
                  </label>
                  <Textarea
                    v-model="frontContent"
                    placeholder="Digite a pergunta..."
                    :rows="2"
                  />
                </div>
                <div>
                  <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                    Resposta
                  </label>
                  <Textarea
                    v-model="backContent"
                    placeholder="Digite a resposta..."
                    :rows="3"
                  />
                </div>
              </div>

              <!-- Editing Occlusion Card -->
              <div v-else-if="cardType === 'occlusion'">
                <ImageOcclusionEditor
                  :image-data="occlusionImageData"
                  :occlusions="occlusionAreas"
                  :is-editing="true"
                  @update:image-data="occlusionImageData = $event"
                  @update:occlusions="occlusionAreas = $event"
                  @save="handleOcclusionSave"
                  @cancel="handleCancelOcclusion"
                />
              </div>
            </template>

            <!-- Action buttons for non-occlusion types -->
            <div
              v-if="cardType !== 'occlusion'"
              class="flex flex-col-reverse sm:flex-row gap-2 pt-2"
            >
              <Button
                variant="outline"
                class="sm:flex-none"
                @click="close(); resetForm()"
              >
                Cancelar
              </Button>
              <Button
                :disabled="!isFormValid"
                class="flex-1"
                @click="editingCard ? handleUpdateCard() : handleCreateCard()"
              >
                {{ editingCard ? 'Salvar' : 'Criar' }}
              </Button>
            </div>
          </div>
        </template>
      </Dialog>

      <!-- Preview Dialog -->
      <Dialog
        :open="previewCard !== null"
        @update:open="(v) => !v && (previewCard = null)"
      >
        <template #default>
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-foreground">Prévia</h2>
            <CardRenderer
              v-if="previewCard"
              :card="previewCard"
              :show-answer="true"
            />
          </div>
        </template>
      </Dialog>

      <!-- Card List - improved for mobile -->
      <div class="space-y-2">
        <template v-if="store.loading">
          <LoadingState message="Carregando cartões..." />
        </template>

        <template v-else-if="deckCards.length === 0">
          <Card class="p-8 sm:p-12 text-center">
            <FileText class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-3" />
            <h3 class="text-base sm:text-lg font-semibold text-foreground mb-2">
              Nenhum cartão ainda
            </h3>
            <p class="text-sm text-muted-foreground">
              Toque no + para criar seu primeiro cartão
            </p>
          </Card>
        </template>

        <template v-else>
          <Card
            v-for="card in deckCards"
            :key="card.id"
            class="p-3 hover:shadow-lg transition-shadow"
          >
            <div class="flex items-start gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <component
                  :is="getCardTypeIcon(card.content.type)"
                  class="w-3.5 h-3.5"
                />
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm text-foreground leading-snug line-clamp-2">
                  {{ card.content.type === 'occlusion' ? `Oclusão - ${card.content.imageOcclusions?.length || 0} área(s)` : card.content.front }}
                </p>
                <div class="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <span>{{ getCardTypeLabel(card.content.type) }}</span>
                  <template v-if="new Date(card.nextReview) <= new Date()">
                    <span>·</span>
                    <span class="text-warning font-medium">
                      Para revisar
                    </span>
                  </template>
                </div>
              </div>

              <div class="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  @click="previewCard = card"
                >
                  <Eye class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleEditCard(card)"
                >
                  <Edit class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click="handleDeleteCard(card)"
                >
                  <Trash2 class="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        </template>
      </div>
    </div>

    <!-- Floating Action Button - hidden on desktop -->
    <button
      class="fixed bottom-24 right-4 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full shadow-lg flex items-center gap-2 px-4 py-3 transition-all active:scale-95 z-30 md:hidden"
      @click="handleOpenCreate"
    >
      <FilePlus class="w-5 h-5" />
      <span class="text-sm font-medium">Cartão</span>
    </button>
  </div>
</template>
