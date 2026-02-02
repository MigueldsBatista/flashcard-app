<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Dialog from '@/components/ui/Dialog.vue'
import Input from '@/components/ui/Input.vue'
import LoadingState from '@/components/ui/LoadingState.vue'
import Textarea from '@/components/ui/Textarea.vue'
import { useFlashcardStore } from '@/stores/flashcard'
import type { Deck } from '@/types/flashcard'
import { BookOpen, ChevronRight, Edit, FolderOpen, FolderPlus, Trash2 } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const store = useFlashcardStore()

const isCreating = ref(false)
const editingDeck = ref<Deck | null>(null)
const newDeckName = ref('')
const newDeckDescription = ref('')
const newDeckColor = ref('#3B82F6')

const colorOptions = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#10B981' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Laranja', value: '#F59E0B' },
  { name: 'Vermelho', value: '#EF4444' },
]

function handleCreateDeck() {
  if (!newDeckName.value.trim()) return

  store.addDeck({
    name: newDeckName.value,
    description: newDeckDescription.value,
    color: newDeckColor.value,
  })

  resetForm()
  isCreating.value = false
}

function handleUpdateDeck() {
  if (!editingDeck.value || !newDeckName.value.trim()) return

  store.updateDeck(editingDeck.value.id, {
    name: newDeckName.value,
    description: newDeckDescription.value,
    color: newDeckColor.value,
  })

  resetForm()
  editingDeck.value = null
}

function handleEditDeck(deck: Deck) {
  editingDeck.value = deck
  newDeckName.value = deck.name
  newDeckDescription.value = deck.description || ''
  newDeckColor.value = deck.color || '#3B82F6'
}

function resetForm() {
  newDeckName.value = ''
  newDeckDescription.value = ''
  newDeckColor.value = '#3B82F6'
}

function getCardCount(deckId: string): number {
  return store.cards.filter(card => card.deckId === deckId).length
}

function getDueCardCount(deckId: string): number {
  const now = new Date()
  return store.cards.filter(
    card => card.deckId === deckId && new Date(card.nextReview) <= now
  ).length
}

function handleDeleteDeck(deck: Deck) {
  if (confirm(`Tem certeza que deseja excluir "${deck.name}"?`)) {
    store.deleteDeck(deck.id)
  }
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-28">
    <div class="max-w-2xl mx-auto">
      <!-- Header - improved for mobile -->
      <div class="mb-6">
        <h1 class="text-xl sm:text-2xl font-bold text-foreground mb-1">
          Meus Baralhos
        </h1>
        <p class="text-sm text-muted-foreground">
          {{ store.decks.length }} {{ store.decks.length === 1 ? 'baralho' : 'baralhos' }}
        </p>
      </div>

      <!-- Create/Edit Dialog -->
      <Dialog v-model:open="isCreating">
        <template #default="{ close }">
          <div class="space-y-4">
            <h2 class="text-lg sm:text-xl font-semibold text-foreground">Criar Novo Baralho</h2>
            
            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Nome do Baralho
              </label>
              <Input
                v-model="newDeckName"
                placeholder="Ex: Anatomia Humana"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Descrição (opcional)
              </label>
              <Textarea
                v-model="newDeckDescription"
                placeholder="Adicione uma descrição..."
                :rows="2"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Cor do Baralho
              </label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="color in colorOptions"
                  :key="color.value"
                  :class="[
                    'w-9 h-9 rounded-full border-2 transition-transform',
                    newDeckColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-border',
                  ]"
                  :style="{ backgroundColor: color.value }"
                  :title="color.name"
                  @click="newDeckColor = color.value"
                />
              </div>
            </div>

            <div class="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button variant="outline" class="sm:flex-none" @click="close(); resetForm()">
                Cancelar
              </Button>
              <Button class="flex-1" @click="handleCreateDeck">
                Criar Baralho
              </Button>
            </div>
          </div>
        </template>
      </Dialog>

      <!-- Edit Dialog -->
      <Dialog :open="editingDeck !== null" @update:open="(v) => !v && (editingDeck = null)">
        <template #default="{ close }">
          <div class="space-y-4">
            <h2 class="text-lg sm:text-xl font-semibold text-foreground">Editar Baralho</h2>
            
            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Nome do Baralho
              </label>
              <Input
                v-model="newDeckName"
                placeholder="Ex: Anatomia Humana"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Descrição (opcional)
              </label>
              <Textarea
                v-model="newDeckDescription"
                placeholder="Adicione uma descrição..."
                :rows="2"
              />
            </div>

            <div>
              <label class="text-sm font-medium text-muted-foreground mb-2 block">
                Cor do Baralho
              </label>
              <div class="flex gap-2 flex-wrap">
                <button
                  v-for="color in colorOptions"
                  :key="color.value"
                  :class="[
                    'w-9 h-9 rounded-full border-2 transition-transform',
                    newDeckColor === color.value
                      ? 'border-foreground scale-110'
                      : 'border-border',
                  ]"
                  :style="{ backgroundColor: color.value }"
                  :title="color.name"
                  @click="newDeckColor = color.value"
                />
              </div>
            </div>

            <div class="flex flex-col-reverse sm:flex-row gap-2 pt-2">
              <Button variant="outline" class="sm:flex-none" @click="close(); resetForm()">
                Cancelar
              </Button>
              <Button class="flex-1" @click="handleUpdateDeck">
                Salvar Alterações
              </Button>
            </div>
          </div>
        </template>
      </Dialog>

      <!-- Deck List - improved vertical layout for mobile -->
      <div class="space-y-3">
        <template v-if="store.loading">
          <LoadingState message="Carregando baralhos..." />
        </template>

        <template v-else-if="store.decks.length === 0">
          <Card class="p-8 sm:p-12 text-center">
            <FolderOpen class="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground mb-4" />
            <h3 class="text-base sm:text-lg font-semibold text-foreground mb-2">
              Nenhum baralho ainda
            </h3>
            <p class="text-sm text-muted-foreground mb-4">
              Crie seu primeiro baralho para começar a estudar
            </p>
          </Card>
        </template>

        <template v-else>
          <Card
            v-for="deck in store.decks"
            :key="deck.id"
            class="p-3 sm:p-4 hover:shadow-xl transition-shadow cursor-pointer"
            @click="router.push(`/decks/${deck.id}/cards`)"
          >
            <!-- Vertical layout for better mobile display -->
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                :style="{ backgroundColor: deck.color }"
              >
                <BookOpen class="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>

              <div class="flex-1 min-w-0">
                <h3 class="font-semibold text-foreground text-sm sm:text-base leading-tight">
                  {{ deck.name }}
                </h3>
                <p v-if="deck.description" class="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                  {{ deck.description }}
                </p>
                <div class="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{{ getCardCount(deck.id) }} cartões</span>
                  <span v-if="getDueCardCount(deck.id) > 0" class="text-warning font-medium">
                    · {{ getDueCardCount(deck.id) }} para revisar
                  </span>
                </div>
              </div>

              <div class="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  @click.stop="handleEditDeck(deck)"
                >
                  <Edit class="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  @click.stop="handleDeleteDeck(deck)"
                >
                  <Trash2 class="w-4 h-4 text-destructive" />
                </Button>
                <ChevronRight class="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </Card>
        </template>
      </div>
    </div>

    <!-- Floating Action Button - with label for decks -->
    <button
      class="fixed bottom-24 right-4 bg-primary hover:bg-primary-hover text-primary-foreground rounded-full shadow-lg flex items-center gap-2 px-4 py-3 transition-all active:scale-95 z-30"
      @click="isCreating = true"
    >
      <FolderPlus class="w-5 h-5" />
      <span class="text-sm font-medium">Baralho</span>
    </button>
  </div>
</template>
