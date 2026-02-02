import { useFlashcards } from '@/context/flashcard-context';
import { Card } from '@/app/components/ui/card';
import { Progress } from '@/app/components/ui/progress';
import { Brain, TrendingUp, Zap, Calendar, Target, Flame } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export function Dashboard({ onStartStudy }: { onStartStudy: () => void }) {
  const { stats, decks } = useFlashcards();

  const getReadinessColor = (score: number) => {
    if (score >= 80) return 'text-[#10B981]'; // Success green
    if (score >= 50) return 'text-[#F59E0B]'; // Warning amber
    return 'text-red-500';
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 50) return 'Atenção Necessária';
    return 'Crítico';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 pb-24">
      {/* Header */}
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Ultra Focus
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de Aprendizado Acelerado
          </p>
        </div>

        {/* Readiness Score - Hero Section */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Score de Prontidão
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getReadinessColor(stats.readinessScore)}`}>
                  {stats.readinessScore}
                </span>
                <span className="text-2xl text-gray-400">/100</span>
              </div>
              <p className={`text-sm mt-1 ${getReadinessColor(stats.readinessScore)}`}>
                {getReadinessLabel(stats.readinessScore)}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <Brain className={`w-16 h-16 ${getReadinessColor(stats.readinessScore)}`} />
            </div>
          </div>
          
          <Progress 
            value={stats.readinessScore} 
            className="h-2 mb-4"
          />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Vencidos</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.overdueCards}
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Para Revisar</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {stats.dueCards}
              </p>
            </div>
          </div>
        </Card>

        {/* Today's Progress */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Progresso de Hoje
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Revisados</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.today.cardsReviewed}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Novos</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.today.newCards}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-[#3B82F6]" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Precisão</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.round(stats.today.accuracy * 100)}%
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-gray-600 dark:text-gray-400">Sequência</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.streak} dias
              </p>
            </div>
          </div>
        </Card>

        {/* Upcoming Reviews */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Próximas Revisões
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Hoje</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.nextReviews.today} cartões
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Amanhã</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.nextReviews.tomorrow} cartões
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Próximos 7 dias</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.nextReviews.week} cartões
              </span>
            </div>
          </div>
        </Card>

        {/* Statistics Overview */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Visão Geral
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total de Cartões</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {stats.totalCards}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total de Baralhos</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {decks.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Tempo de Estudo Hoje</span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {Math.round(stats.today.timeSpent)} min
              </span>
            </div>
          </div>
        </Card>

        {/* Action Button */}
        <Button
          onClick={onStartStudy}
          disabled={stats.dueCards === 0}
          className="w-full h-14 text-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white font-semibold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stats.dueCards > 0 ? (
            <>
              <Zap className="w-5 h-5 mr-2" />
              Estudar Agora ({stats.dueCards} cartões)
            </>
          ) : (
            'Nenhum cartão para revisar hoje!'
          )}
        </Button>
      </div>
    </div>
  );
}
