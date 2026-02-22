<script setup lang="ts">
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import Checkbox from '@/components/ui/Checkbox.vue';
import LoadingState from '@/components/ui/LoadingState.vue';
import Progress from '@/components/ui/Progress.vue';
import Tabs from '@/components/ui/Tabs.vue';
import { useNotifications } from '@/composables/useNotifications';
import { getDueCards, getNewCards } from '@/services/spaced-repetition';
import { useFlashcardStore } from '@/stores/flashcard';
import { Brain, Calendar, Filter, Flame, Target, TrendingUp, Zap } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const store = useFlashcardStore();
const { success } = useNotifications();

const studyMode = ref('random');
const selectedDecks = ref<string[]>([]);

const studyTabs = [
  { id: 'random', label: 'Modo Aleatório', icon: Zap },
  { id: 'select', label: 'Selecionar Baralhos', icon: Filter }
];

// Compute available cards (due + new) per deck
const deckAvailableCards = computed(() => {
  const result: Record<string, number> = {};
  for (const deck of store.decks) {
    const deckCards = store.cards.filter(c => c.deckId === deck.id);
    const due = getDueCards(deckCards).length;
    const newCards = getNewCards(deckCards, store.settings.dailyNewCardLimit).length;
    result[deck.id] = due + newCards;
  }
  return result;
});

// Total cards available for random study mode (due + new, excluding empty decks)
const totalStudyableCards = computed(() => {
  return Object.values(deckAvailableCards.value).reduce((sum, count) => sum + count, 0);
});

function toggleDeckSelection(deckId: string, isSelected: boolean) {
  // Prevent selecting decks with no available cards
  if (isSelected && (deckAvailableCards.value[deckId] ?? 0) === 0) return;
  if (isSelected) {
    selectedDecks.value.push(deckId);
  } else {
    selectedDecks.value = selectedDecks.value.filter(id => id !== deckId);
  }
}

function startStudy() {
  if (studyMode.value === 'select') {
    if (selectedDecks.value.length > 0) {
      success('Sessão de estudo iniciada!');
      router.push({ path: '/study', query: { decks: selectedDecks.value.join(',') } });
    }
    return;
  }

  if (totalStudyableCards.value > 0) {
    success('Sessão de estudo iniciada!');
    router.push('/study');
  }
}

function getReadinessColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-destructive';
}

function getReadinessLabel(score: number): string {
  if (score >= 80) return 'Excelente';
  if (score >= 50) return 'Atenção Necessária';
  return 'Crítico';
}

function formatCooldown(date: Date | null): string {
  if (!date) return 'Nenhum cartão para revisar!';

  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff <= 0) return 'Pronto para revisar!';

  const minutes = Math.ceil(diff / (1000 * 60));
  if (minutes < 60) return `Próxima revisão em ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Próxima revisão em ${hours}h`;

  return 'Próxima revisão amanhã';
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-24 md:pb-8">
    <!-- Header -->
    <div class="max-w-5xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Ultra Focus
        </h1>
        <p class="text-muted-foreground">
          Sistema de Aprendizado Acelerado
        </p>
      </div>

      <template v-if="store.loading">
        <LoadingState message="Carregando dados..." />
      </template>

      <div
        v-else
        class="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <!-- Left Column -->
        <div class="space-y-6">
          <!-- Readiness Score - Hero Section -->
          <Card class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div>
                <p class="text-sm text-muted-foreground mb-1">
                  Score de Prontidão
                </p>
                <div class="flex items-baseline gap-2">
                  <span :class="['text-5xl font-bold', getReadinessColor(store.stats.readinessScore)]">
                    {{ store.stats.readinessScore }}
                  </span>
                  <span class="text-2xl text-muted-foreground">/100</span>
                </div>
                <p :class="['text-sm mt-1', getReadinessColor(store.stats.readinessScore)]">
                  {{ getReadinessLabel(store.stats.readinessScore) }}
                </p>
              </div>
              <div class="flex flex-col items-center">
                <Brain :class="['w-16 h-16', getReadinessColor(store.stats.readinessScore)]" />
              </div>
            </div>

            <Progress
              :value="store.stats.readinessScore"
              class="mb-4"
            />

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-muted-foreground">Vencidos</p>
                <p class="text-xl font-bold text-foreground">
                  {{ store.stats.overdueCards }}
                </p>
              </div>
              <div>
                <p class="text-muted-foreground">Para Revisar</p>
                <p class="text-xl font-bold text-foreground">
                  {{ store.stats.dueCards }}
                </p>
              </div>
            </div>
          </Card>

          <!-- Today's Progress -->
          <Card class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <Target class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold text-foreground">
                Progresso de Hoje
              </h2>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div class="bg-muted/50 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-1">
                  <Zap class="w-4 h-4 text-warning" />
                  <p class="text-xs text-muted-foreground">Revisados</p>
                </div>
                <p class="text-2xl font-bold text-foreground">
                  {{ store.stats.today.cardsReviewed }}
                </p>
              </div>

              <div class="bg-muted/50 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-1">
                  <TrendingUp class="w-4 h-4 text-success" />
                  <p class="text-xs text-muted-foreground">Novos</p>
                </div>
                <p class="text-2xl font-bold text-foreground">
                  {{ store.stats.today.newCards }}
                </p>
              </div>

              <div class="bg-muted/50 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-1">
                  <Brain class="w-4 h-4 text-primary" />
                  <p class="text-xs text-muted-foreground">Precisão</p>
                </div>
                <p class="text-2xl font-bold text-foreground">
                  {{ Math.round(store.stats.today.accuracy * 100) }}%
                </p>
              </div>

              <div class="bg-muted/50 rounded-lg p-4">
                <div class="flex items-center gap-2 mb-1">
                  <Flame class="w-4 h-4 text-orange-500" />
                  <p class="text-xs text-muted-foreground">Sequência</p>
                </div>
                <p class="text-2xl font-bold text-foreground">
                  {{ store.stats.streak }} dias
                </p>
              </div>
            </div>
          </Card>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Upcoming Reviews -->
          <Card class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <Calendar class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold text-foreground">
                Próximas Revisões
              </h2>
            </div>

            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Hoje</span>
                <span class="text-lg font-semibold text-foreground">
                  {{ store.stats.nextReviews.today }} cartões
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Amanhã</span>
                <span class="text-lg font-semibold text-foreground">
                  {{ store.stats.nextReviews.tomorrow }} cartões
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Próximos 7 dias</span>
                <span class="text-lg font-semibold text-foreground">
                  {{ store.stats.nextReviews.week }} cartões
                </span>
              </div>
            </div>
          </Card>

          <!-- Statistics Overview -->
          <Card class="p-6">
            <h2 class="text-lg font-semibold text-foreground mb-4">
              Visão Geral
            </h2>

            <div class="space-y-3">
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Total de Cartões</span>
                <span class="text-lg font-semibold text-foreground">
                  {{ store.stats.totalCards }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Total de Baralhos</span>
                <span class="text-lg font-semibold text-foreground">
                  {{ store.decks.length }}
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-muted-foreground">Tempo de Estudo Hoje</span>
                <span class="text-lg font-semibold text-foreground">
                  {{ store.stats.today.timeSpent >= 1 ? Math.round(store.stats.today.timeSpent) + ' min' : Math.round(store.stats.today.timeSpent * 60) + 's' }}
                </span>
              </div>
            </div>
          </Card>

          <!-- Study Actions -->
          <Card class="p-6">
            <h2 class="text-lg font-semibold text-foreground mb-4">
              Iniciar Sessão
            </h2>
            <Tabs
              v-model="studyMode"
              :tabs="studyTabs"
            >
              <template #default="{ activeTab }">
                <!-- Random Mode -->
                <div
                  v-if="activeTab === 'random'"
                  class="space-y-4"
                >
                  <p class="text-sm text-muted-foreground">
                    Estude cartões de todos os seus baralhos misturados. O algoritmo prioriza cartões vencidos.
                  </p>
                  <Button
                    :disabled="totalStudyableCards === 0"
                    class="w-full h-14 text-lg font-semibold rounded-xl shadow-lg"
                    @click="startStudy"
                  >
                    <template v-if="totalStudyableCards > 0">
                      <Zap class="w-5 h-5 mr-2" />
                      Estudar Agora ({{ totalStudyableCards }} cartões)
                    </template>
                    <template v-else>
                      <Calendar class="w-5 h-5 mr-2" />
                      {{ formatCooldown(store.stats.nextAvailableCardDate) }}
                    </template>
                  </Button>
                </div>

                <!-- Select Mode -->
                <div
                  v-if="activeTab === 'select'"
                  class="space-y-4"
                >
                  <p class="text-sm text-muted-foreground">
                    Selecione os baralhos que deseja estudar nesta sessão.
                  </p>

                  <div class="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                    <div
                      v-if="store.decks.length === 0"
                      class="text-center text-sm text-muted-foreground py-4"
                    >
                      Nenhum baralho encontrado.
                    </div>
                    <div
                      v-for="deck in store.decks"
                      :key="deck.id"
                      :class="[
                        'flex items-center justify-between p-2 rounded-md transition-colors',
                        (deckAvailableCards[deck.id] ?? 0) === 0
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-muted/50 cursor-pointer',
                      ]"
                    >
                      <Checkbox
                        :model-value="selectedDecks.includes(deck.id)"
                        :label="deck.name"
                        :disabled="(deckAvailableCards[deck.id] ?? 0) === 0"
                        @update:model-value="(val) => toggleDeckSelection(deck.id, val)"
                      />
                      <span
                        :class="[
                          'text-xs font-medium shrink-0 ml-2 px-2 py-0.5 rounded-full',
                          (deckAvailableCards[deck.id] ?? 0) > 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground',
                        ]"
                      >
                        {{ (deckAvailableCards[deck.id] ?? 0) > 0
                          ? `${deckAvailableCards[deck.id]} cartões`
                          : 'Sem cartões'
                        }}
                      </span>
                    </div>
                  </div>

                  <Button
                    :disabled="selectedDecks.length === 0"
                    class="w-full h-14 text-lg font-semibold rounded-xl shadow-lg"
                    @click="startStudy"
                  >
                    <Filter class="w-5 h-5 mr-2" />
                    Estudar Selecionados ({{ selectedDecks.length }})
                  </Button>
                </div>
              </template>
            </Tabs>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
