import { useState } from 'react';
import { useFlashcards } from '@/context/flashcard-context';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Plus, ArrowLeft, Edit, Trash2, Eye, FileText, Code, Image as ImageIcon, Calculator } from 'lucide-react';
import { Card as FlashCard, CardContent } from '@/types/flashcard';
import { CardRenderer } from './card-renderer';

interface CardEditorProps {
  deckId: string;
  onBack: () => void;
  onEditImageOcclusion?: (cardId: string, imageUrl: string) => void;
}

export function CardEditor({ deckId, onBack, onEditImageOcclusion }: CardEditorProps) {
  const { cards, addCard, updateCard, deleteCard, decks } = useFlashcards();
  const [isCreating, setIsCreating] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [previewCard, setPreviewCard] = useState<FlashCard | null>(null);
  
  const [cardType, setCardType] = useState<'text' | 'code' | 'latex' | 'image'>('text');
  const [frontContent, setFrontContent] = useState('');
  const [backContent, setBackContent] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [imageUrl, setImageUrl] = useState('');

  const deck = decks.find(d => d.id === deckId);
  const deckCards = cards.filter(card => card.deckId === deckId);

  const handleCreateCard = () => {
    if (!frontContent.trim() || !backContent.trim()) return;

    const content: CardContent = {
      front: frontContent,
      back: backContent,
      type: cardType,
      language: cardType === 'code' ? codeLanguage : undefined,
      imageUrl: cardType === 'image' ? imageUrl : undefined,
    };

    addCard({
      deckId,
      content,
      status: 'new',
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lapses: 0,
      nextReview: new Date(),
    });

    resetForm();
    setIsCreating(false);
  };

  const handleUpdateCard = () => {
    if (!editingCard || !frontContent.trim() || !backContent.trim()) return;

    const content: CardContent = {
      front: frontContent,
      back: backContent,
      type: cardType,
      language: cardType === 'code' ? codeLanguage : undefined,
      imageUrl: cardType === 'image' ? imageUrl : undefined,
    };

    updateCard(editingCard.id, { content });

    resetForm();
    setEditingCard(null);
  };

  const handleEditCard = (card: FlashCard) => {
    setEditingCard(card);
    setFrontContent(card.content.front);
    setBackContent(card.content.back);
    setCardType(card.content.type);
    setCodeLanguage(card.content.language || 'javascript');
    setImageUrl(card.content.imageUrl || '');
  };

  const resetForm = () => {
    setFrontContent('');
    setBackContent('');
    setCardType('text');
    setCodeLanguage('javascript');
    setImageUrl('');
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const getCardTypeIcon = (type: string) => {
    switch (type) {
      case 'text': return <FileText className="w-4 h-4" />;
      case 'code': return <Code className="w-4 h-4" />;
      case 'latex': return <Calculator className="w-4 h-4" />;
      case 'image': return <ImageIcon className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const languageOptions = [
    'javascript',
    'typescript',
    'python',
    'java',
    'cpp',
    'csharp',
    'ruby',
    'go',
    'rust',
    'php',
    'html',
    'css',
    'sql',
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {deck?.name || 'Baralho'}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {deckCards.length} {deckCards.length === 1 ? 'cartão' : 'cartões'}
            </p>
          </div>
          <Button 
            onClick={handleOpenCreate}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Cartão
          </Button>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog 
          open={isCreating || editingCard !== null} 
          onOpenChange={(open) => {
            if (!open) {
              setIsCreating(false);
              setEditingCard(null);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCard ? 'Editar Cartão' : 'Criar Novo Cartão'}
              </DialogTitle>
            </DialogHeader>

            <Tabs value={cardType} onValueChange={(v) => setCardType(v as any)} className="mt-4">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="text">
                  <FileText className="w-4 h-4 mr-1" />
                  Texto
                </TabsTrigger>
                <TabsTrigger value="code">
                  <Code className="w-4 h-4 mr-1" />
                  Código
                </TabsTrigger>
                <TabsTrigger value="latex">
                  <Calculator className="w-4 h-4 mr-1" />
                  LaTeX
                </TabsTrigger>
                <TabsTrigger value="image">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Imagem
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 space-y-4">
                <TabsContent value="text" className="space-y-4 mt-0">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Frente (Pergunta)
                    </label>
                    <Textarea
                      value={frontContent}
                      onChange={(e) => setFrontContent(e.target.value)}
                      placeholder="Digite a pergunta ou prompt..."
                      rows={3}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Suporta Markdown básico: **negrito**, *itálico*, `código`
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Verso (Resposta)
                    </label>
                    <Textarea
                      value={backContent}
                      onChange={(e) => setBackContent(e.target.value)}
                      placeholder="Digite a resposta..."
                      rows={4}
                      className="font-mono"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="code" className="space-y-4 mt-0">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Linguagem
                    </label>
                    <Select value={codeLanguage} onValueChange={setCodeLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {languageOptions.map((lang) => (
                          <SelectItem key={lang} value={lang}>
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Pergunta
                    </label>
                    <Textarea
                      value={frontContent}
                      onChange={(e) => setFrontContent(e.target.value)}
                      placeholder="Ex: O que este código faz?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Código (Resposta)
                    </label>
                    <Textarea
                      value={backContent}
                      onChange={(e) => setBackContent(e.target.value)}
                      placeholder="Cole o código aqui..."
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="latex" className="space-y-4 mt-0">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Pergunta
                    </label>
                    <Textarea
                      value={frontContent}
                      onChange={(e) => setFrontContent(e.target.value)}
                      placeholder="Ex: Qual é a fórmula de Bhaskara?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Fórmula LaTeX
                    </label>
                    <Textarea
                      value={backContent}
                      onChange={(e) => setBackContent(e.target.value)}
                      placeholder="Ex: x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
                      rows={4}
                      className="font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Use sintaxe LaTeX. Não é necessário adicionar $ ou $$
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="image" className="space-y-4 mt-0">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      URL da Imagem
                    </label>
                    <Input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      type="url"
                    />
                    {imageUrl && (
                      <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                        <img 
                          src={imageUrl} 
                          alt="Preview" 
                          className="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EErro ao carregar%3C/text%3E%3C/svg%3E';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Pergunta
                    </label>
                    <Textarea
                      value={frontContent}
                      onChange={(e) => setFrontContent(e.target.value)}
                      placeholder="Ex: O que está destacado nesta imagem?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      Resposta
                    </label>
                    <Textarea
                      value={backContent}
                      onChange={(e) => setBackContent(e.target.value)}
                      placeholder="Descreva o que deve ser identificado..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={editingCard ? handleUpdateCard : handleCreateCard}
                    disabled={!frontContent.trim() || !backContent.trim()}
                    className="flex-1 bg-[#3B82F6] hover:bg-[#2563EB] text-white"
                  >
                    {editingCard ? 'Salvar Alterações' : 'Criar Cartão'}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingCard(null);
                      resetForm();
                    }}
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewCard !== null} onOpenChange={(open) => !open && setPreviewCard(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Prévia do Cartão</DialogTitle>
            </DialogHeader>
            {previewCard && (
              <div className="mt-4">
                <CardRenderer card={previewCard} showAnswer={true} />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Card List */}
        <div className="space-y-3">
          {deckCards.length === 0 ? (
            <Card className="p-12 text-center bg-white dark:bg-gray-800 border-0 shadow-lg">
              <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum cartão ainda
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Crie seu primeiro cartão para começar a estudar
              </p>
            </Card>
          ) : (
            deckCards.map((card) => {
              const isDue = new Date(card.nextReview) <= new Date();
              const isOverdue = new Date(card.nextReview) < new Date(new Date().setHours(0, 0, 0, 0));

              return (
                <Card
                  key={card.id}
                  className="p-4 bg-white dark:bg-gray-800 border-0 shadow-md hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {getCardTypeIcon(card.content.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white mb-1 line-clamp-2">
                        {card.content.front}
                      </p>
                      <div className="flex gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="capitalize">{card.content.type}</span>
                        <span>•</span>
                        <span className="capitalize">{card.status}</span>
                        {isDue && (
                          <>
                            <span>•</span>
                            <span className={isOverdue ? 'text-red-500 font-medium' : 'text-[#F59E0B] font-medium'}>
                              {isOverdue ? 'Vencido' : 'Para revisar'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewCard(card)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditCard(card)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este cartão?')) {
                            deleteCard(card.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
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
