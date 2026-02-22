import { useFlashcardStore } from '@/stores/flashcard';
import { computed } from 'vue';

export function useStatistics() {
  const store = useFlashcardStore();

  // Chart Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgb(148, 163, 184)',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 7
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)'
        },
        ticks: {
          color: 'rgb(148, 163, 184)'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgb(148, 163, 184)',
          padding: 16,
          usePointStyle: true
        }
      }
    }
  };

  // --- Real Data Computations ---

  // Activity: Cards reviewed per day (Last 30 days)
  const activityData = computed(() => {
    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

    // Initialize map for last 30 days
    const daysMap = new Map<string, number>();

    // Fill map from sessions
    store.sessions.forEach(session => {
      const date = new Date(session.startTime);
      const dateKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      // Only count valid reviews (avoid counting sessions with 0 cards if any)
      if (session.cardsStudied > 0) {
        const currentCount = daysMap.get(dateKey) || 0;
        daysMap.set(dateKey, currentCount + session.cardsStudied);
      }
    });

    // Generate last 30 days labels and data
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const dateKey = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const displayLabel = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      labels.push(displayLabel);
      data.push(daysMap.get(dateKey) || 0);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Cartões Revisados',
          data,
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderRadius: 4
        }
      ]
    };
  });

  // Accuracy Trend: Average accuracy per day (Last 7 days)
  const accuracyData = computed(() => {
    const labels = [];
    const data = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Map date -> { totalAccuracy: number, sessionCount: number }
    const daysMap = new Map<string, { sum: number; count: number }>();

    store.sessions.forEach(session => {
      const date = new Date(session.startTime);
      const dateKey = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

      if (session.cardsStudied > 0) {
        const current = daysMap.get(dateKey) || { sum: 0, count: 0 };
        daysMap.set(dateKey, {
          sum: current.sum + session.accuracy, // Session accuracy is 0-1
          count: current.count + 1
        });
      }
    });

    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);

      const dateKey = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const displayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' });

      labels.push(displayLabel);

      const entry = daysMap.get(dateKey);
      const avgDetails = entry ? Math.round((entry.sum / entry.count) * 100) : 0;
      // Use previous day's data if today has no data yet, to avoid dropping to 0 line directly?
      // Or just showing 0? Let's show 0 or null. 0 is fine for now but might look like a "bad" day.
      // Actually, charts usually handle null nicely for gaps. Let's try 0 first as per requirement to be "real".
      data.push(avgDetails);
    }

    return {
      labels,
      datasets: [
        {
          label: 'Precisão %',
          data,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: 'rgba(16, 185, 129, 1)'
        }
      ]
    };
  });

  // Card Distribution
  const distributionData = computed(() => {
    const newCards = store.cards.filter(c => c.status === 'new').length;
    const learning = store.cards.filter(c => c.status === 'learning').length;
    const review = store.cards.filter(c => c.status === 'review').length;
    const leech = store.cards.filter(c => c.status === 'leech').length;

    return {
      labels: ['Novos', 'Aprendendo', 'Em Revisão', 'Problemáticos'],
      datasets: [
        {
          data: [newCards, learning, review, leech],
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(239, 68, 68, 0.8)'
          ],
          borderWidth: 0
        }
      ]
    };
  });

  return {
    chartOptions,
    doughnutOptions,
    activityData,
    accuracyData,
    distributionData
  };
}
