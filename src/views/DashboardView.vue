<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Progress from '@/components/ui/Progress.vue'
import { useNotifications } from '@/composables/useNotifications'
import { useFlashcardStore } from '@/stores/flashcard'
import { Brain, Calendar, Flame, Target, TrendingUp, Zap } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()
const store = useFlashcardStore()
const { success } = useNotifications()

function startStudy() {
  if (store.stats.dueCards > 0) {
    success('Sessão de estudo iniciada!')
    router.push('/study')
  }
}

function getReadinessColor(score: number): string {
  if (score >= 80) return 'text-success'
  if (score >= 50) return 'text-warning'
  return 'text-destructive'
}

function getReadinessLabel(score: number): string {
  if (score >= 80) return 'Excelente'
  if (score >= 50) return 'Atenção Necessária'
  return 'Crítico'
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-24">
    <!-- Header -->
    <div class="max-w-2xl mx-auto">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-foreground mb-2">
          Ultra Focus
        </h1>
        <p class="text-muted-foreground">
          Sistema de Aprendizado Acelerado
        </p>
      </div>

      <!-- Readiness Score - Hero Section -->
      <Card class="p-6 mb-6">
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
        
        <Progress :value="store.stats.readinessScore" class="mb-4" />

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
      <Card class="p-6 mb-6">
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

      <!-- Upcoming Reviews -->
      <Card class="p-6 mb-6">
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
      <Card class="p-6 mb-6">
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
              {{ Math.round(store.stats.today.timeSpent) }} min
            </span>
          </div>
        </div>
      </Card>

      <!-- Action Button -->
      <Button
        :disabled="store.stats.dueCards === 0"
        class="w-full h-14 text-lg font-semibold rounded-xl shadow-lg"
        @click="startStudy"
      >
        <template v-if="store.stats.dueCards > 0">
          <Zap class="w-5 h-5 mr-2" />
          Estudar Agora ({{ store.stats.dueCards }} cartões)
        </template>
        <template v-else>
          Nenhum cartão para revisar hoje!
        </template>
      </Button>
    </div>
  </div>
</template>
