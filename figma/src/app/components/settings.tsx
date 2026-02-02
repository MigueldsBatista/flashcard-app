import { useFlashcards } from '@/context/flashcard-context';
import { Card } from '@/app/components/ui/card';
import { Switch } from '@/app/components/ui/switch';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Separator } from '@/app/components/ui/separator';
import { Settings as SettingsIcon, Smartphone, Zap, Volume2, Moon, Database } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function Settings() {
  const { settings, updateSettings, cards, decks } = useFlashcards();

  const handleExportData = () => {
    const data = {
      cards,
      decks,
      settings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ultra-focus-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          
          if (confirm('Isso irá substituir todos os seus dados atuais. Continuar?')) {
            localStorage.setItem('flashcards_cards', JSON.stringify(data.cards || []));
            localStorage.setItem('flashcards_decks', JSON.stringify(data.decks || []));
            localStorage.setItem('flashcards_settings', JSON.stringify(data.settings || settings));
            window.location.reload();
          }
        } catch (error) {
          alert('Erro ao importar dados. Verifique se o arquivo está correto.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const clearAllData = () => {
    if (confirm('ATENÇÃO: Isso irá apagar todos os seus baralhos, cartões e progresso. Esta ação não pode ser desfeita!')) {
      if (confirm('Tem certeza absoluta? Todos os dados serão perdidos permanentemente.')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Configurações
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Personalize sua experiência de estudo
          </p>
        </div>

        {/* Study Settings */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <SettingsIcon className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configurações de Estudo
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="newCardLimit" className="text-gray-700 dark:text-gray-300">
                Limite de Novos Cartões por Dia
              </Label>
              <Input
                id="newCardLimit"
                type="number"
                min="1"
                max="100"
                value={settings.dailyNewCardLimit}
                onChange={(e) => updateSettings({ dailyNewCardLimit: parseInt(e.target.value) || 20 })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Recomendado: 10-30 cartões por dia
              </p>
            </div>

            <Separator />

            <div>
              <Label htmlFor="reviewLimit" className="text-gray-700 dark:text-gray-300">
                Limite de Revisões por Dia
              </Label>
              <Input
                id="reviewLimit"
                type="number"
                min="10"
                max="500"
                value={settings.dailyReviewLimit}
                onChange={(e) => updateSettings({ dailyReviewLimit: parseInt(e.target.value) || 200 })}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Recomendado: 100-300 cartões por dia
              </p>
            </div>
          </div>
        </Card>

        {/* Interface Settings */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Interface
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="darkMode" className="text-gray-700 dark:text-gray-300">
                  Modo Escuro
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Otimizado para OLED
                </p>
              </div>
              <Switch
                id="darkMode"
                checked={settings.darkMode}
                onCheckedChange={(checked) => {
                  updateSettings({ darkMode: checked });
                  document.documentElement.classList.toggle('dark', checked);
                }}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="haptic" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Feedback Háptico
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Vibração ao responder cartões
                </p>
              </div>
              <Switch
                id="haptic"
                checked={settings.hapticFeedback}
                onCheckedChange={(checked) => updateSettings({ hapticFeedback: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="audio" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Volume2 className="w-4 h-4" />
                  Reproduzir Áudio Automaticamente
                </Label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Para cartões com áudio
                </p>
              </div>
              <Switch
                id="audio"
                checked={settings.autoPlayAudio}
                onCheckedChange={(checked) => updateSettings({ autoPlayAudio: checked })}
              />
            </div>
          </div>
        </Card>

        {/* Data Management */}
        <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Gerenciamento de Dados
            </h2>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="w-full justify-start"
            >
              Exportar Todos os Dados
            </Button>

            <Button
              onClick={handleImportData}
              variant="outline"
              className="w-full justify-start"
            >
              Importar Dados
            </Button>

            <Separator />

            <Button
              onClick={clearAllData}
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Limpar Todos os Dados
            </Button>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Total armazenado: {cards.length} cartões em {decks.length} baralhos
            </p>
          </div>
        </Card>

        {/* About */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          <p>Ultra Focus v1.0.0</p>
          <p className="mt-1">Sistema de Aprendizado Acelerado</p>
        </div>
      </div>
    </div>
  );
}
