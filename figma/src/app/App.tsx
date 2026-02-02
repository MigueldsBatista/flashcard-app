import { useState, useEffect } from 'react';
import { FlashcardProvider, useFlashcards } from '@/context/flashcard-context';
import { Dashboard } from './components/dashboard';
import { DeckManager } from './components/deck-manager';
import { CardEditor } from './components/card-editor';
import { StudySession } from './components/study-session';
import { Statistics } from './components/statistics';
import { Settings } from './components/settings';
import { BottomNav } from './components/bottom-nav';
import { ImageOcclusionEditor } from './components/image-occlusion-editor';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';

type View = 'home' | 'decks' | 'stats' | 'settings' | 'study' | 'editCards' | 'imageOcclusion';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [imageOcclusionData, setImageOcclusionData] = useState<{
    cardId?: string;
    imageUrl: string;
  } | null>(null);

  const { settings, addCard, addDeck, decks, cards } = useFlashcards();

  // Apply dark mode on mount
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  // Initialize with sample data if empty
  useEffect(() => {
    if (decks.length === 0 && cards.length === 0) {
      // Create sample decks
      const jsDeckId = `${Date.now()}-js`;
      const mathDeckId = `${Date.now() + 1}-math`;
      
      addDeck({
        name: 'Programação - JavaScript',
        description: 'Conceitos fundamentais de JavaScript',
        color: '#F59E0B',
      });

      addDeck({
        name: 'Matemática - Cálculo',
        description: 'Fórmulas e conceitos de cálculo',
        color: '#8B5CF6',
      });

      // Wait a bit for the decks to be added
      setTimeout(() => {
        const jsDeck = decks.find(d => d.name === 'Programação - JavaScript') || { id: jsDeckId };
        const mathDeck = decks.find(d => d.name === 'Matemática - Cálculo') || { id: mathDeckId };
        
        // Add JavaScript sample cards
        addCard({
          deckId: jsDeck.id,
          content: {
            front: 'O que é hoisting em JavaScript?',
            back: 'Hoisting é o comportamento padrão do JavaScript de mover declarações para o topo do escopo atual antes da execução do código. Isso afeta declarações de variáveis (var) e funções.',
            type: 'text',
          },
          status: 'new',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          nextReview: new Date(),
        });

        addCard({
          deckId: jsDeck.id,
          content: {
            front: 'Qual é a sintaxe de uma arrow function?',
            back: 'const funcao = (param) => {\n  return param * 2;\n};\n\n// ou simplificada:\nconst funcao = param => param * 2;',
            type: 'code',
            language: 'javascript',
          },
          status: 'new',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          nextReview: new Date(),
        });

        addCard({
          deckId: jsDeck.id,
          content: {
            front: 'Explique o conceito de closure em JavaScript',
            back: 'Um **closure** é uma função que tem acesso ao escopo externo, mesmo após a função externa ter retornado. Permite:\n\n- Encapsulamento de dados\n- Criação de funções privadas\n- Pattern de módulos',
            type: 'text',
          },
          status: 'new',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          nextReview: new Date(),
        });

        // Add Math sample cards
        addCard({
          deckId: mathDeck.id,
          content: {
            front: 'Qual é a fórmula de Bhaskara?',
            back: 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}',
            type: 'latex',
          },
          status: 'new',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          nextReview: new Date(),
        });

        addCard({
          deckId: mathDeck.id,
          content: {
            front: 'Qual é a derivada de x²?',
            back: '\\frac{d}{dx}(x^2) = 2x',
            type: 'latex',
          },
          status: 'new',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          nextReview: new Date(),
        });

        addCard({
          deckId: mathDeck.id,
          content: {
            front: 'Qual é a fórmula da área de um círculo?',
            back: 'A = \\pi r^2',
            type: 'latex',
          },
          status: 'new',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          lapses: 0,
          nextReview: new Date(),
        });

        toast.success('Baralhos de exemplo criados! Explore e crie seus próprios cartões.');
      }, 100);
    }
  }, []);

  const handleStartStudy = () => {
    setCurrentView('study');
  };

  const handleSelectDeck = (deckId: string) => {
    setSelectedDeckId(deckId);
    setCurrentView('editCards');
  };

  const handleBackFromCards = () => {
    setSelectedDeckId(null);
    setCurrentView('decks');
  };

  const handleEndStudy = () => {
    setSelectedDeckId(null);
    setCurrentView('home');
  };

  const handleNavigate = (view: string) => {
    setCurrentView(view as View);
    setSelectedDeckId(null);
  };

  const handleEditImageOcclusion = (cardId: string, imageUrl: string) => {
    setImageOcclusionData({ cardId, imageUrl });
    setCurrentView('imageOcclusion');
  };

  const handleSaveImageOcclusion = (occlusions: any[]) => {
    // In a real app, this would update the card with occlusions
    toast.success(`${occlusions.length} máscaras salvas!`);
    setImageOcclusionData(null);
    setCurrentView('editCards');
  };

  const handleCancelImageOcclusion = () => {
    setImageOcclusionData(null);
    setCurrentView('editCards');
  };

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Dashboard onStartStudy={handleStartStudy} />;
      
      case 'decks':
        return <DeckManager onSelectDeck={handleSelectDeck} />;
      
      case 'editCards':
        if (!selectedDeckId) return <DeckManager onSelectDeck={handleSelectDeck} />;
        return (
          <CardEditor
            deckId={selectedDeckId}
            onBack={handleBackFromCards}
            onEditImageOcclusion={handleEditImageOcclusion}
          />
        );
      
      case 'study':
        return (
          <StudySession
            deckId={selectedDeckId || undefined}
            onEnd={handleEndStudy}
          />
        );
      
      case 'stats':
        return <Statistics />;
      
      case 'settings':
        return <Settings />;
      
      case 'imageOcclusion':
        if (!imageOcclusionData) return <Dashboard onStartStudy={handleStartStudy} />;
        return (
          <ImageOcclusionEditor
            imageUrl={imageOcclusionData.imageUrl}
            onSave={handleSaveImageOcclusion}
            onCancel={handleCancelImageOcclusion}
          />
        );
      
      default:
        return <Dashboard onStartStudy={handleStartStudy} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      {renderView()}
      
      {/* Bottom Navigation - hide during study session and image occlusion */}
      {currentView !== 'study' && currentView !== 'imageOcclusion' && currentView !== 'editCards' && (
        <BottomNav currentView={currentView} onNavigate={handleNavigate} />
      )}

      <Toaster position="top-center" />
    </div>
  );
}

export default function App() {
  return (
    <FlashcardProvider>
      <AppContent />
    </FlashcardProvider>
  );
}