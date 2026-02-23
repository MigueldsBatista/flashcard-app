<script setup lang="ts">
import CardRenderer from '@/components/CardRenderer.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import { useDeckIcons } from '@/composables/useDeckIcons';
import { useNotifications } from '@/composables/useNotifications';
import { shareService } from '@/services/provider';
import type { SharedDeckData } from '@/services/types';
import type { SharePermission } from '@/types/flashcard';
import {
  AlertTriangle,
  ArrowLeft,
  BookCopy,
  Eye,
  Loader2,
  Pencil,
  Play,
  Plus,
  Trash2,
  Users
} from 'lucide-vue-next';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const { success, error: showError } = useNotifications();
const { getIconComponent } = useDeckIcons();

const token = computed(() => route.params.token as string);
const loading = ref(true);
const cloning = ref(false);
const errorState = ref(false);
const data = ref<SharedDeckData | null>(null);

const permission = computed<SharePermission>(() => data.value?.share.permission ?? 'read');
const canEdit = computed(() => permission.value === 'write' || permission.value === 'admin');
const canManage = computed(() => permission.value === 'admin');

const permissionLabel = computed(() => {
  switch (permission.value) {
    case 'read': return 'Somente Leitura';
    case 'write': return 'Pode Editar';
    case 'admin': return 'Pode Editar e Adicionar';
    default: return '';
  }
});

onMounted(async () => {
  try {
    data.value = await shareService.getSharedDeckWithCards(token.value);
  } catch (_err) {
    errorState.value = true;
  } finally {
    loading.value = false;
  }
});

async function handleClone() {
  if (!data.value) return;
  cloning.value = true;
  try {
    const cloned = await shareService.cloneDeck(data.value.deck.id, data.value.deck.name);
    success('Baralho salvo na sua biblioteca!');
    router.push(`/decks/${cloned.id}/cards`);
  } catch {
    showError('Erro ao clonar baralho');
  } finally {
    cloning.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-28 md:pb-8">
    <div class="max-w-3xl mx-auto">
      <!-- Loading -->
      <div
        v-if="loading"
        class="pt-20"
      >
        <LoadingState message="Carregando baralho compartilhado..." />
      </div>

      <!-- Error State -->
      <div
        v-else-if="errorState"
        class="pt-20 text-center"
      >
        <Card class="p-8 sm:p-12 max-w-md mx-auto">
          <AlertTriangle class="w-16 h-16 mx-auto text-warning mb-4" />
          <h2 class="text-xl font-bold text-foreground mb-2">
            Link inválido
          </h2>
          <p class="text-muted-foreground mb-6">
            Este link de compartilhamento não existe ou foi desativado.
          </p>
          <Button @click="router.push('/')">
            Voltar para o início
          </Button>
        </Card>
      </div>

      <!-- Shared Deck Content -->
      <template v-else-if="data">
        <!-- Header -->
        <div class="mb-6">
          <button
            class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
            @click="router.push('/')"
          >
            <ArrowLeft class="w-4 h-4" />
            Voltar
          </button>

          <div class="flex items-start gap-4">
            <div
              class="w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              :style="{ backgroundColor: data.deck.color || '#3B82F6' }"
            >
              <component
                :is="getIconComponent(data.deck.icon)"
                class="w-7 h-7 text-white"
              />
            </div>

            <div class="flex-1 min-w-0">
              <h1 class="text-2xl font-bold text-foreground">
                {{ data.deck.name }}
              </h1>
              <p
                v-if="data.deck.description"
                class="text-sm text-muted-foreground mt-1"
              >
                {{ data.deck.description }}
              </p>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <!-- Shared By badge -->
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Users class="w-3.5 h-3.5" />
                  Compartilhado por {{ data.ownerUsername ? `@${data.ownerUsername}` : 'outro usuário' }}
                </span>
                <!-- Permission badge -->
                <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  <Eye
                    v-if="permission === 'read'"
                    class="w-3.5 h-3.5"
                  />
                  <Pencil
                    v-else
                    class="w-3.5 h-3.5"
                  />
                  {{ permissionLabel }}
                </span>
                <!-- Card count -->
                <span class="text-xs text-muted-foreground">
                  {{ data.cards.length }} {{ data.cards.length === 1 ? 'cartão' : 'cartões' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-3 mb-6">
          <Button
            class="flex items-center gap-2"
            @click="router.push(`/study/${data.deck.id}`)"
          >
            <Play class="w-4 h-4" />
            Estudar
          </Button>
          <Button
            variant="outline"
            class="flex items-center gap-2"
            :disabled="cloning"
            @click="handleClone"
          >
            <Loader2
              v-if="cloning"
              class="w-4 h-4 animate-spin"
            />
            <BookCopy
              v-else
              class="w-4 h-4"
            />
            Salvar na Minha Biblioteca
          </Button>
        </div>

        <!-- Card List -->
        <div class="space-y-3">
          <h2 class="text-lg font-semibold text-foreground">
            Cartões
          </h2>
          <div
            v-if="data.cards.length === 0"
            class="text-center py-8"
          >
            <p class="text-muted-foreground">
              Este baralho ainda não tem cartões.
            </p>
          </div>
          <Card
            v-for="card in data.cards"
            :key="card.id"
            class="p-4"
          >
            <div class="flex items-start gap-3">
              <div class="flex-1 min-w-0">
                <CardRenderer
                  :card="card"
                  :show-answer="false"
                />
              </div>
              <!-- Edit/Delete actions (permission-based) -->
              <div
                v-if="canEdit || canManage"
                class="flex items-center gap-1 shrink-0"
              >
                <button
                  v-if="canEdit"
                  type="button"
                  class="h-8 w-8 p-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="Editar"
                >
                  <Pencil class="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  class="h-8 w-8 p-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="Adicionar"
                >
                  <Plus class="w-4 h-4 text-muted-foreground" />
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  class="h-8 w-8 p-0 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                  title="Excluir"
                >
                  <Trash2 class="w-4 h-4 text-destructive" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </template>
    </div>
  </div>
</template>
