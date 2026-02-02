<script setup lang="ts">
import Card from '@/components/ui/Card.vue'
import { useStatistics } from '@/composables/useStatistics'
import { useFlashcardStore } from '@/stores/flashcard'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { BarChart3, Calendar, Clock, Flame, Target, TrendingUp } from 'lucide-vue-next'
import { Bar, Doughnut, Line } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const store = useFlashcardStore()
const { 
  chartOptions, 
  doughnutOptions, 
  activityData, 
  accuracyData, 
  distributionData 
} = useStatistics()
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-24">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-foreground mb-1">
          Estatísticas
        </h1>
        <p class="text-sm text-muted-foreground">
          Acompanhe seu progresso de aprendizado
        </p>
      </div>

      <!-- Key Metrics -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target class="w-5 h-5 text-primary" />
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Total de Cartões</p>
              <p class="text-2xl font-bold text-foreground">{{ store.stats.totalCards }}</p>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
              <TrendingUp class="w-5 h-5 text-success" />
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Precisão Hoje</p>
              <p class="text-2xl font-bold text-foreground">{{ Math.round(store.stats.today.accuracy * 100) }}%</p>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Flame class="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Sequência</p>
              <p class="text-2xl font-bold text-foreground">{{ store.stats.streak }} dias</p>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Clock class="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p class="text-xs text-muted-foreground">Tempo Hoje</p>
              <p class="text-2xl font-bold text-foreground">{{ Math.round(store.stats.today.timeSpent) }}min</p>
            </div>
          </div>
        </Card>
      </div>

      <!-- Activity Chart -->
      <Card class="p-6 mb-6">
        <div class="flex items-center gap-2 mb-4">
          <BarChart3 class="w-5 h-5 text-primary" />
          <h2 class="text-lg font-semibold text-foreground">
            Atividade (Últimos 30 dias)
          </h2>
        </div>
        <div class="h-48">
          <Bar :data="activityData" :options="chartOptions" />
        </div>
      </Card>

      <!-- Accuracy Trend -->
      <Card class="p-6 mb-6">
        <div class="flex items-center gap-2 mb-4">
          <TrendingUp class="w-5 h-5 text-success" />
          <h2 class="text-lg font-semibold text-foreground">
            Tendência de Precisão
          </h2>
        </div>
        <div class="h-48">
          <Line :data="accuracyData" :options="chartOptions" />
        </div>
      </Card>

      <!-- Card Distribution -->
      <Card class="p-6">
        <div class="flex items-center gap-2 mb-4">
          <Calendar class="w-5 h-5 text-primary" />
          <h2 class="text-lg font-semibold text-foreground">
            Distribuição de Cartões
          </h2>
        </div>
        <div class="h-64">
          <Doughnut :data="distributionData" :options="doughnutOptions" />
        </div>
      </Card>
    </div>
  </div>
</template>
