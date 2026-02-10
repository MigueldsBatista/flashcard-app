<script setup lang="ts">
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Separator from '@/components/ui/Separator.vue'
import Switch from '@/components/ui/Switch.vue'
import { useAuthStore } from '@/stores/auth'
import { useFlashcardStore } from '@/stores/flashcard'
import { Database, LogOut, Settings as SettingsIcon, Smartphone, User, Volume2, Zap } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const store = useFlashcardStore()
const authStore = useAuthStore()
const router = useRouter()

async function handleLogout() {
  await authStore.signOut()
  router.push('/login')
}

function handleExportData() {
  const data = {
    cards: store.cards,
    decks: store.decks,
    settings: store.settings,
    exportedAt: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ultra-focus-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function handleImportData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        
        if (confirm('Isso irá substituir todos os seus dados atuais. Continuar?')) {
          localStorage.setItem('flashcards_cards', JSON.stringify(data.cards || []))
          localStorage.setItem('flashcards_decks', JSON.stringify(data.decks || []))
          localStorage.setItem('flashcards_settings', JSON.stringify(data.settings || store.settings))
          window.location.reload()
        }
      } catch  {
        alert('Erro ao importar dados. Verifique se o arquivo está correto.')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function clearAllData() {
  if (confirm('ATENÇÃO: Isso irá apagar todos os seus baralhos, cartões e progresso. Esta ação não pode ser desfeita!')) {
    if (confirm('Tem certeza absoluta? Todos os dados serão perdidos permanentemente.')) {
      localStorage.clear()
      window.location.reload()
    }
  }
}

function toggleDarkMode(value: boolean) {
  store.updateSettings({ darkMode: value })
  document.documentElement.classList.toggle('dark', value)
}
</script>

<template>
  <div class="min-h-screen bg-background p-4 pb-24 md:pb-8">
    <div class="max-w-5xl mx-auto" >
      <!-- Header -->
      <div class="mb-6" >
        <h1 class="text-2xl md:text-3xl font-bold text-foreground mb-1">
          Configurações
        </h1>
        <p class="text-sm text-muted-foreground">
          Personalize sua experiência de estudo
        </p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start" >
        <!-- Left Column -->
        <div class="space-y-6" >
          <!-- Study Settings -->
          <Card class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <SettingsIcon class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold text-foreground">
                Configurações de Estudo
              </h2>
            </div>

            <div class="space-y-6">
              <div>
                <label class="text-sm font-medium text-foreground block mb-2">
                  Limite de Novos Cartões por Dia
                </label>
                <Input
                  type="number"
                  :model-value="String(store.settings.dailyNewCardLimit)"
                  @update:model-value="store.updateSettings({ dailyNewCardLimit: parseInt($event) || 20 })"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  Recomendado: 10-30 cartões por dia
                </p>
              </div>

              <Separator />

              <div>
                <label class="text-sm font-medium text-foreground block mb-2">
                  Limite de Revisões por Dia
                </label>
                <Input
                  type="number"
                  :model-value="String(store.settings.dailyReviewLimit)"
                  @update:model-value="store.updateSettings({ dailyReviewLimit: parseInt($event) || 200 })"
                />
                <p class="text-xs text-muted-foreground mt-1">
                  Recomendado: 100-300 cartões por dia
                </p>
              </div>
            </div>
          </Card>

          <!-- Interface Settings -->
          <Card class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <Smartphone class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold text-foreground">
                Interface
              </h2>
            </div>

            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="text-sm font-medium text-foreground">
                    Modo Escuro
                  </label>
                  <p class="text-xs text-muted-foreground mt-1">
                    Otimizado para OLED
                  </p>
                </div>
                <Switch
                  :model-value="store.settings.darkMode"
                  @update:model-value="toggleDarkMode"
                />
              </div>

              <Separator />

              <div class="flex items-center justify-between" v-if="false">
                <div>
                  <label class="text-sm font-medium text-foreground flex items-center gap-2">
                    <Zap class="w-4 h-4" />
                    Feedback Háptico
                  </label>
                  <p class="text-xs text-muted-foreground mt-1">
                    Vibração ao responder cartões
                  </p>
                </div>
                <Switch
                  :model-value="store.settings.hapticFeedback"
                  @update:model-value="store.updateSettings({ hapticFeedback: $event })"
                />
              </div>

              <Separator v-if="false" />

              <div class="flex items-center justify-between" v-if="false">
                <div>
                  <label class="text-sm font-medium text-foreground flex items-center gap-2">
                    <Volume2 class="w-4 h-4" />
                    Reproduzir Áudio Automaticamente
                  </label>
                  <p class="text-xs text-muted-foreground mt-1">
                    Para cartões com áudio
                  </p>
                </div>
                <Switch
                  :model-value="store.settings.autoPlayAudio"
                  @update:model-value="store.updateSettings({ autoPlayAudio: $event })"
                />
              </div>
            </div>
          </Card>
        </div>

        <!-- Right Column -->
        <div class="space-y-6">
          <!-- Account -->
          <Card class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <User class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold text-foreground">
                Conta
              </h2>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="bg-primary/10 p-2 rounded-full">
                    <User class="w-4 h-4 text-primary" />
                  </div>
                  <div class="text-sm">
                    <p class="font-medium text-foreground">Usuário</p>
                    <p class="text-xs text-muted-foreground truncate max-w-[150px]">{{ authStore.user?.email }}</p>
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                class="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-200 dark:border-red-900/30 shadow-sm"
                @click="handleLogout"
              >
                <LogOut class="w-4 h-4 mr-2" />
                Sair da Conta
              </Button>
            </div>
          </Card>

          <!-- Data Management -->
          <Card class="p-6">
            <div class="flex items-center gap-2 mb-4">
              <Database class="w-5 h-5 text-primary" />
              <h2 class="text-lg font-semibold text-foreground">
                Gerenciamento de Dados
              </h2>
            </div>

            <div class="space-y-3">
              <Button variant="outline" class="w-full justify-start shadow-sm" @click="handleExportData">
                Exportar Todos os Dados
              </Button>

              <Button variant="outline" class="w-full justify-start shadow-sm" @click="handleImportData">
                Importar Dados
              </Button>

              <Separator />

              <Button 
                variant="outline" 
                class="w-full justify-start text-destructive hover:bg-destructive/10 shadow-sm"
                @click="clearAllData"
              >
                Limpar Todos os Dados
              </Button>

              <p class="text-xs text-muted-foreground">
                Total armazenado: {{ store.cards.length }} cartões em {{ store.decks.length }} baralhos
              </p>
            </div>
          </Card>

          <!-- About -->
          <Card class="p-6 bg-muted/30 border-none shadow-none text-center">
            <p class="text-foreground font-semibold">Ultra Focus v1.0.0</p>
            <p class="mt-1 text-sm text-muted-foreground">Sistema de Aprendizado Acelerado</p>
          </Card>
        </div>
      </div>
    </div>
  </div>
</template>
