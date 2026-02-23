<script setup lang="ts">
import ShareDeckDialog from '@/components/ShareDeckDialog.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import Dialog from '@/components/ui/Dialog.vue';
import Input from '@/components/ui/Input.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import Textarea from '@/components/ui/Textarea.vue';
import { useDeckIcons } from '@/composables/useDeckIcons';
import { useFlashcardStore } from '@/stores/flashcard';
import type { Deck } from '@/types/flashcard';
import { ChevronDown, ChevronRight, Edit, FolderOpen, FolderPlus, Share2, Trash2 } from 'lucide-vue-next';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const store = useFlashcardStore();
const { icons, getIconComponent } = useDeckIcons();

const isCreating = ref(false);
const editingDeck = ref<Deck | null>(null);
const newDeckName = ref('');
const newDeckDescription = ref('');
const newDeckColor = ref('#3B82F6');
const newDeckIcon = ref('BookOpen');
const showIconPicker = ref(false);
const sharingDeck = ref<Deck | null>(null);
const showShareDialog = ref(false);

const colorOptions = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Laranja', value: '#F59E0B' },
  { name: 'Vermelho', value: '#EF4444' }
];

function handleCreateDeck() {
  if (!newDeckName.value.trim()) return;

  store.addDeck({
    name: newDeckName.value,
    description: newDeckDescription.value,
    color: newDeckColor.value,
    icon: newDeckIcon.value
  });

  resetForm();
  isCreating.value = false;
}

function handleUpdateDeck() {
  if (!editingDeck.value || !newDeckName.value.trim()) return;

  store.updateDeck(editingDeck.value.id, {
    name: newDeckName.value,
    description: newDeckDescription.value,
    color: newDeckColor.value,
    icon: newDeckIcon.value
  });

  resetForm();
  editingDeck.value = null;
}

function handleEditDeck(deck: Deck) {
  editingDeck.value = deck;
  newDeckName.value = deck.name;
  newDeckDescription.value = deck.description || '';
  newDeckColor.value = deck.color || '#3B82F6';
  newDeckIcon.value = deck.icon || 'BookOpen';
}

function resetForm() {
  newDeckName.value = '';
  newDeckDescription.value = '';
  newDeckColor.value = '#3B82F6';
  newDeckIcon.value = 'BookOpen';
  showIconPicker.value = false;
}

function getCardCount(deckId: string): number {
  return store.cards.filter(card => card.deckId === deckId).length;
}

function getDueCardCount(deckId: string): number {
  const now = new Date();
  return store.cards.filter(
    card => card.deckId === deckId && new Date(card.nextReview) <= now
  ).length;
}

function handleDeleteDeck(deck: Deck) {
  if (confirm(`Tem certeza que deseja excluir "${deck.name}"?`)) {
    store.deleteDeck(deck.id);
  }
}

function handleShareDeck(deck: Deck) {
  sharingDeck.value = deck;
  showShareDialog.value = true;
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-28 md:pb-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header - improved for mobile -->
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-3xl font-bold text-foreground mb-1">
            Meus Baralhos
          </h1>
          <p class="text-sm text-muted-foreground">
            {{ store.decks.length }} {{ store.decks.length === 1 ? 'baralho' : 'baralhos' }}
          </p>
        </div>

        <!-- Desktop Create Button -->
        <div class="hidden md:block">
          <Button
            class="flex items-center gap-2 px-6 shadow-md"
            @click="isCreating = true"
          >
            <FolderPlus class="w-5 h-5" />
            <span>Criar Novo Baralho</span>
          </Button>
        </div>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog
        :open="isCreating || editingDeck !== null"
        @update:open="(v) => { if (!v) { isCreating = false; editingDeck = null; resetForm() } }"
      >
        <template #default="{ close }">
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-foreground">
              {{ editingDeck ? 'Editar Baralho' : 'Novo Baralho' }}
            </h2>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                Nome
              </label>
              <Input
                v-model="newDeckName"
                type="text"
                placeholder="Nome do baralho"
                class="bg-background"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                Descrição (opcional)
              </label>
              <Textarea
                v-model="newDeckDescription"
                placeholder="Descrição do baralho"
                :rows="2"
                class="bg-background"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Cor
              </label>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="color in colorOptions"
                  :key="color.value"
                  type="button"
                  class="w-8 h-8 rounded-lg transition-all"
                  :class="newDeckColor === color.value ? 'ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'"
                  :style="{ backgroundColor: color.value }"
                  :title="color.name"
                  @click="newDeckColor = color.value"
                />
              </div>
            </div>

            <!-- Icon Picker (collapsed by default) -->
            <div>
              <label class="text-sm font-medium text-muted-foreground mb-1.5 block">
                Ícone
              </label>
              <!-- Collapsed: show selected icon + expand button -->
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="flex items-center gap-2 px-3 py-2 border border-border rounded-lg bg-muted/30 hover:bg-muted transition-colors"
                  @click="showIconPicker = !showIconPicker"
                >
                  <component
                    :is="getIconComponent(newDeckIcon)"
                    class="w-5 h-5 text-foreground"
                  />
                  <span class="text-sm text-muted-foreground">{{ icons.find(i => i.name === newDeckIcon)?.label || 'Livro' }}</span>
                  <ChevronDown
                    class="w-4 h-4 text-muted-foreground transition-transform"
                    :class="showIconPicker ? 'rotate-180' : ''"
                  />
                </button>
              </div>
              <!-- Expanded: icon grid -->
              <div
                v-if="showIconPicker"
                class="mt-2 grid grid-cols-7 sm:grid-cols-9 gap-1.5 max-h-36 overflow-y-auto p-1 border border-border rounded-lg bg-muted/30"
              >
                <button
                  v-for="icon in icons"
                  :key="icon.name"
                  type="button"
                  class="w-9 h-9 flex items-center justify-center rounded-lg transition-all"
                  :class="[
                    newDeckIcon === icon.name
                      ? 'bg-primary text-primary-foreground shadow-md ring-2 ring-primary/30 scale-110'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-105',
                  ]"
                  :title="icon.label"
                  @click="newDeckIcon = icon.name; showIconPicker = false"
                >
                  <component
                    :is="icon.component"
                    class="w-4.5 h-4.5"
                  />
                </button>
              </div>
            </div>

            <div class="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                class="sm:flex-none"
                @click="close(); resetForm()"
              >
                Cancelar
              </Button>
              <Button
                :disabled="!newDeckName.trim()"
                class="flex-1"
                @click="editingDeck ? handleUpdateDeck() : handleCreateDeck()"
              >
                {{ editingDeck ? 'Salvar' : 'Criar' }}
              </Button>
            </div>
          </div>
        </template>
      </Dialog>

      <!-- Deck List - responsive grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <template v-if="store.loading">
          <div class="col-span-full">
            <LoadingState message="Carregando baralhos..." />
          </div>
        </template>

        <template v-else-if="store.decks.length === 0">
          <div class="col-span-full">
            <Card class="p-8 sm:p-12 text-center">
              <FolderOpen class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
              <h3 class="text-base sm:text-lg font-semibold text-foreground mb-2">
                Nenhum baralho ainda
              </h3>
              <p class="text-sm text-muted-foreground mb-4">
                Crie seu primeiro baralho para começar a estudar
              </p>
            </Card>
          </div>
        </template>

        <template v-else>
          <Card
            v-for="deck in store.decks"
            :key="deck.id"
            class="p-4 hover:shadow-xl transition-all duration-200 cursor-pointer group"
            @click="router.push(`/decks/${deck.id}/cards`)"
          >
            <div class="flex flex-col h-full">
              <div class="flex items-start gap-4 mb-4">
                <div
                  class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                  :style="{ backgroundColor: deck.color }"
                >
                  <component
                    :is="getIconComponent(deck.icon)"
                    class="w-6 h-6 text-white"
                  />
                </div>

                <div class="flex-1 min-w-0">
                  <h3 class="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors">
                    {{ deck.name }}
                  </h3>
                  <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <span>{{ getCardCount(deck.id) }} cartões</span>
                    <span
                      v-if="getDueCardCount(deck.id) > 0"
                      class="inline-flex items-center px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium"
                    >
                      {{ getDueCardCount(deck.id) }} pendentes
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    class="h-10 w-10 md:h-8 md:w-8 p-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    title="Compartilhar"
                    @click.stop="handleShareDeck(deck)"
                  >
                    <Share2 class="w-5 h-5 md:w-4 md:h-4 text-primary" />
                  </button>
                  <button
                    type="button"
                    class="h-10 w-10 md:h-8 md:w-8 p-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    title="Editar"
                    @click.stop="handleEditDeck(deck)"
                  >
                    <Edit class="w-5 h-5 md:w-4 md:h-4" />
                  </button>
                  <button
                    type="button"
                    class="h-10 w-10 md:h-8 md:w-8 p-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                    title="Excluir"
                    @click.stop="handleDeleteDeck(deck)"
                  >
                    <Trash2 class="w-5 h-5 md:w-4 md:h-4 text-destructive" />
                  </button>
                </div>
              </div>

              <div class="mt-auto pt-4 border-t border-border/50 flex items-center justify-between">
                <p
                  v-if="deck.description"
                  class="text-xs text-muted-foreground truncate flex-1 mr-4"
                >
                  {{ deck.description }}
                </p>
                <div class="flex items-center text-primary text-sm font-medium">
                  Ver Cartões
                  <ChevronRight class="w-4 h-4 ml-1" />
                </div>
              </div>
            </div>
          </Card>
        </template>
      </div>
    </div>

    <!-- Share Dialog -->
    <ShareDeckDialog
      :deck="sharingDeck"
      :open="showShareDialog"
      @update:open="showShareDialog = $event"
    />

    <!-- Floating Action Button - hidden on desktop -->
    <Button
      class="fixed bottom-24 right-4 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full shadow-lg flex items-center gap-2 px-4 py-3 transition-all active:scale-95 z-30 md:hidden"
      @click="isCreating = true"
    >
      <FolderPlus class="w-5 h-5" />
      <span class="text-sm font-medium">Baralho</span>
    </Button>
  </div>
</template>
