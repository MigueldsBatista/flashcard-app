import { useState } from 'react';
import { useFlashcards } from '@/context/flashcard-context';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Plus, FolderOpen, Trash2, Edit, ChevronRight, BookOpen } from 'lucide-react';
import { Deck } from '@/types/flashcard';

export function DeckManager({ onSelectDeck }: { onSelectDeck: (deckId: string) => void }) {
  const { decks, cards, addDeck, updateDeck, deleteDeck } = useFlashcards();
  const [isCreating, setIsCreating] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDescription, setNewDeckDescription] = useState('');
  const [newDeckColor, setNewDeckColor] = useState('#3B82F6');

  const handleCreateDeck = () => {
    if (!newDeckName.trim()) return;

    addDeck({
      name: newDeckName,
      description: newDeckDescription,
      color: newDeckColor,
    });

    setNewDeckName('');
    setNewDeckDescription('');
    setNewDeckColor('#3B82F6');
    setIsCreating(false);
  };

  const handleUpdateDeck = () => {
    if (!editingDeck || !newDeckName.trim()) return;

    updateDeck(editingDeck.id, {
      name: newDeckName,
      description: newDeckDescription,
      color: newDeckColor,
    });

    setEditingDeck(null);
    setNewDeckName('');
    setNewDeckDescription('');
    setNewDeckColor('#3B82F6');
  };

  const handleEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setNewDeckName(deck.name);
    setNewDeckDescription(deck.description || '');
    setNewDeckColor(deck.color || '#3B82F6');
  };

  const getCardCount = (deckId: string) => {
    return cards.filter(card => card.deckId === deckId).length;
  };

  const getDueCardCount = (deckId: string) => {
    const now = new Date();
    return cards.filter(
      card => card.deckId === deckId && new Date(card.nextReview) <= now
    ).length;
  };

  const colorOptions = [
    { name: 'Azul', value: '#3B82F6' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Roxo', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Laranja', value: '#F59E0B' },
    { name: 'Vermelho', value: '#EF4444' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Meus Baralhos
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {decks.length} {decks.length === 1 ? 'baralho' : 'baralhos'}
            </p>
          </div>

          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button className="bg-[#3B82F6] hover:bg-[#2563EB] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo Baralho
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Baralho</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Nome do Baralho
                  </label>
                  <Input
                    value={newDeckName}
                    onChange={(e) => setNewDeckName(e.target.value)}
                    placeholder="Ex: Anatomia Humana"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Descrição (opcional)
                  </label>
                  <Textarea
                    value={newDeckDescription}
                    onChange={(e) => setNewDeckDescription(e.target.value)}
                    placeholder="Adicione uma descrição..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Cor do Baralho
                  </label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewDeckColor(color.value)}
                        className={`w-10 h-10 rounded-full border-2 ${
                          newDeckColor === color.value
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 dark:border-gray-600'
                        } transition-transform`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleCreateDeck}
                    className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  >
                    Criar Baralho
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      setNewDeckName('');
                      setNewDeckDescription('');
                      setNewDeckColor('#3B82F6');
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Deck Dialog */}
        <Dialog open={editingDeck !== null} onOpenChange={(open) => !open && setEditingDeck(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Baralho</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Nome do Baralho
                </label>
                <Input
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  placeholder="Ex: Anatomia Humana"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Descrição (opcional)
                </label>
                <Textarea
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                  placeholder="Adicione uma descrição..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Cor do Baralho
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewDeckColor(color.value)}
                      className={`w-10 h-10 rounded-full border-2 ${
                        newDeckColor === color.value
                          ? 'border-gray-900 dark:border-white scale-110'
                          : 'border-gray-300 dark:border-gray-600'
                      } transition-transform`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleUpdateDeck}
                  className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                >
                  Salvar Alterações
                </Button>
                <Button
                  onClick={() => setEditingDeck(null)}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Deck List */}
        <div className="space-y-3">
          {decks.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-gray-800 border-0 shadow-lg">
              <FolderOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum baralho ainda
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Crie seu primeiro baralho para começar a estudar
              </p>
            </Card>
          ) : (
            decks.map((deck) => {
              const cardCount = getCardCount(deck.id);
              const dueCount = getDueCardCount(deck.id);

              return (
                <Card
                  key={deck.id}
                  className="p-4 bg-white dark:bg-gray-800 border-0 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => onSelectDeck(deck.id)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: deck.color }}
                    >
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
                        {deck.name}
                      </h3>
                      {deck.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                          {deck.description}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{cardCount} cartões</span>
                        {dueCount > 0 && (
                          <span className="text-[#F59E0B] font-medium">
                            {dueCount} para revisar
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditDeck(deck);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Tem certeza que deseja excluir "${deck.name}"?`)) {
                            deleteDeck(deck.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
