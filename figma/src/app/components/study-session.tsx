import { useState, useEffect, useMemo } from 'react';
import { useFlashcards } from '@/context/flashcard-context';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Progress } from '@/app/components/ui/progress';
import { CardDifficulty } from '@/types/flashcard';
import { getDueCards, getNewCards, prioritizeCards } from '@/services/spaced-repetition';
import { CardRenderer } from './card-renderer';
import { ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StudySessionProps {
  deckId?: string; // If undefined, study all decks
  onEnd: () => void;
}

export function StudySession({ deckId, onEnd }: StudySessionProps) {
  const { cards, reviewCard, settings, startStudySession, endStudySession } = useFlashcards();
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [studiedCount, setStudiedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Get cards for this session
  const studyCards = useMemo(() => {
    let filteredCards = deckId 
      ? cards.filter(card => card.deckId === deckId)
      : cards;

    const dueCards = getDueCards(filteredCards);
    const newCards = getNewCards(filteredCards, settings.dailyNewCardLimit);
    
    const allStudyCards = [...dueCards, ...newCards];
    return prioritizeCards(allStudyCards);
  }, [cards, deckId, settings.dailyNewCardLimit]);

  const currentCard = studyCards[currentCardIndex];
  const progress = studyCards.length > 0 ? ((currentCardIndex + 1) / studyCards.length) * 100 : 0;

  useEffect(() => {
    if (deckId) {
      startStudySession(deckId);
    }
    return () => {
      endStudySession();
    };
  }, [deckId]);

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleReview = (difficulty: CardDifficulty) => {
    if (!currentCard) return;

    // Trigger haptic feedback if supported
    if (settings.hapticFeedback && 'vibrate' in navigator) {
      if (difficulty === 'forgot') {
        navigator.vibrate([50, 50, 50]); // Triple short vibration for wrong
      } else if (difficulty === 'easy') {
        navigator.vibrate([100, 50, 100]); // Pattern for easy
      } else {
        navigator.vibrate(50); // Single short vibration
      }
    }

    reviewCard(currentCard.id, difficulty);
    setStudiedCount(prev => prev + 1);
    
    if (difficulty !== 'forgot') {
      setCorrectCount(prev => prev + 1);
    }

    // Animate slide direction
    setSlideDirection(difficulty === 'forgot' ? 'left' : 'right');

    // Move to next card
    setTimeout(() => {
      setShowAnswer(false);
      setSlideDirection(null);
      
      if (currentCardIndex < studyCards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // Session complete
        handleComplete();
      }
    }, 300);
  };

  const handleComplete = () => {
    // Show completion haptic if supported
    if (settings.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100, 50, 100]);
    }
    onEnd();
  };

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center bg-white dark:bg-gray-800 border-0 shadow-lg">
          <CheckCircle2 className="w-16 h-16 mx-auto text-[#10B981] mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Parabéns!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Você completou todos os cartões disponíveis!
          </p>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Estudados</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{studiedCount}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Precisão</p>
                <p className="text-2xl font-bold text-[#10B981]">
                  {studiedCount > 0 ? Math.round((correctCount / studiedCount) * 100) : 0}%
                </p>
              </div>
            </div>
          </div>
          <Button
            onClick={onEnd}
            className="w-full bg-[#3B82F6] hover:bg-[#2563EB] text-white"
          >
            Voltar ao Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const difficultyButtons = [
    { 
      label: 'Esqueci', 
      value: 'forgot' as CardDifficulty, 
      color: 'bg-red-500 hover:bg-red-600',
      textColor: 'text-red-500'
    },
    { 
      label: 'Difícil', 
      value: 'hard' as CardDifficulty, 
      color: 'bg-[#F59E0B] hover:bg-[#D97706]',
      textColor: 'text-[#F59E0B]'
    },
    { 
      label: 'Bom', 
      value: 'good' as CardDifficulty, 
      color: 'bg-[#3B82F6] hover:bg-[#2563EB]',
      textColor: 'text-[#3B82F6]'
    },
    { 
      label: 'Fácil', 
      value: 'easy' as CardDifficulty, 
      color: 'bg-[#10B981] hover:bg-[#059669]',
      textColor: 'text-[#10B981]'
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={onEnd}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {currentCardIndex + 1} / {studyCards.length}
            </div>
            <div className="w-10" /> {/* Spacer for symmetry */}
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Card Display */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentCard.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ 
                opacity: 0, 
                x: slideDirection === 'left' ? -100 : slideDirection === 'right' ? 100 : 0,
                transition: { duration: 0.2 }
              }}
              transition={{ duration: 0.3 }}
            >
              <Card className="bg-white dark:bg-gray-800 border-0 shadow-2xl p-8 min-h-[400px]">
                <CardRenderer card={currentCard} showAnswer={showAnswer} />
                
                {!showAnswer && (
                  <div className="mt-8 text-center">
                    <Button
                      onClick={handleReveal}
                      className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
                      size="lg"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Revelar Resposta
                    </Button>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                      ou pressione Espaço
                    </p>
                  </div>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Difficulty Buttons - Fixed at bottom */}
      {showAnswer && (
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 pb-8">
          <div className="max-w-2xl mx-auto">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-3">
              Como foi a dificuldade?
            </p>
            <div className="grid grid-cols-4 gap-2">
              {difficultyButtons.map((btn) => (
                <Button
                  key={btn.value}
                  onClick={() => handleReview(btn.value)}
                  className={`${btn.color} text-white h-16 flex flex-col items-center justify-center gap-1 rounded-xl shadow-lg`}
                >
                  <span className="text-xs opacity-80">
                    {btn.value === 'forgot' && '10min'}
                    {btn.value === 'hard' && '1d'}
                    {btn.value === 'good' && '3d'}
                    {btn.value === 'easy' && '7d'}
                  </span>
                  <span className="font-semibold">{btn.label}</span>
                </Button>
              ))}
            </div>
            <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
              <p>Use as teclas 1-4 ou deslize para classificar</p>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts */}
      <KeyboardShortcuts
        showAnswer={showAnswer}
        onReveal={handleReveal}
        onReview={handleReview}
      />
    </div>
  );
}

// Keyboard shortcuts component
function KeyboardShortcuts({ 
  showAnswer, 
  onReveal, 
  onReview 
}: { 
  showAnswer: boolean;
  onReveal: () => void;
  onReview: (difficulty: CardDifficulty) => void;
}) {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!showAnswer && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        onReveal();
      } else if (showAnswer) {
        switch (e.key) {
          case '1':
            onReview('forgot');
            break;
          case '2':
            onReview('hard');
            break;
          case '3':
            onReview('good');
            break;
          case '4':
            onReview('easy');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showAnswer, onReveal, onReview]);

  return null;
}
