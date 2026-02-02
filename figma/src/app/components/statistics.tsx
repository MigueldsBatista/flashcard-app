import { useFlashcards } from '@/context/flashcard-context';
import { Card } from '@/app/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, Target, Zap, Award } from 'lucide-react';
import { useMemo } from 'react';

export function Statistics() {
  const { stats, cards } = useFlashcards();

  // Generate mock data for the last 30 days
  const dailyData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Mock data - in real app, this would come from actual session data
      const cardsStudied = Math.floor(Math.random() * 50) + (i < 7 ? 20 : 5);
      
      data.push({
        date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        cards: cardsStudied,
        accuracy: Math.floor(Math.random() * 30) + 70,
      });
    }
    
    return data;
  }, []);

  const statusData = useMemo(() => {
    const statusCount = {
      new: 0,
      learning: 0,
      review: 0,
      leech: 0,
    };

    cards.forEach(card => {
      statusCount[card.status]++;
    });

    return [
      { name: 'Novos', value: statusCount.new, color: '#3B82F6' },
      { name: 'Aprendendo', value: statusCount.learning, color: '#F59E0B' },
      { name: 'Revisão', value: statusCount.review, color: '#10B981' },
      { name: 'Sanguessugas', value: statusCount.leech, color: '#EF4444' },
    ];
  }, [cards]);

  const totalStudyTime = useMemo(() => {
    // Mock calculation - in real app, would sum actual session times
    return stats.today.timeSpent;
  }, [stats]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            Estatísticas
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Acompanhe seu progresso e desempenho
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4 bg-white dark:bg-gray-800 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total de Cartões</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCards}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-800 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Precisão Hoje</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(stats.today.accuracy * 100)}%
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-800 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Sequência</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.streak} dias</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white dark:bg-gray-800 border-0 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Tempo Hoje</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(totalStudyTime)} min
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Activity Chart */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Atividade dos Últimos 30 Dias
            </h2>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                interval={6}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Bar dataKey="cards" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Accuracy Trend */}
        <Card className="p-6 mb-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Tendência de Precisão
            </h2>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                interval={6}
              />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="accuracy" 
                stroke="#10B981" 
                strokeWidth={2}
                dot={{ fill: '#10B981', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Card Status Distribution */}
        <Card className="p-6 bg-white dark:bg-gray-800 border-0 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-[#3B82F6]" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Distribuição de Cartões
            </h2>
          </div>

          <div className="space-y-3">
            {statusData.map((item) => {
              const percentage = stats.totalCards > 0 
                ? (item.value / stats.totalCards) * 100 
                : 0;

              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.value} ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${percentage}%`,
                        backgroundColor: item.color
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
