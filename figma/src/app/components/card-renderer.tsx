import { Card as FlashCard } from '@/types/flashcard';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

interface CardRendererProps {
  card: FlashCard;
  showAnswer: boolean;
}

export function CardRenderer({ card, showAnswer }: CardRendererProps) {
  const renderContent = (content: string, type: string, isAnswer: boolean) => {
    switch (type) {
      case 'text':
        return (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  return inline ? (
                    <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        );

      case 'code':
        if (isAnswer) {
          return (
            <SyntaxHighlighter
              language={card.content.language || 'javascript'}
              style={oneDark}
              customStyle={{
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                margin: 0,
              }}
            >
              {content}
            </SyntaxHighlighter>
          );
        }
        return <p className="text-gray-900 dark:text-white">{content}</p>;

      case 'latex':
        if (isAnswer) {
          try {
            // Try to render as block math
            return (
              <div className="flex items-center justify-center p-4 bg-white dark:bg-gray-900 rounded-lg">
                <BlockMath math={content} />
              </div>
            );
          } catch (error) {
            return (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-600 dark:text-red-400 text-sm">
                  Erro ao renderizar LaTeX: {(error as Error).message}
                </p>
                <pre className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                  {content}
                </pre>
              </div>
            );
          }
        }
        return <p className="text-gray-900 dark:text-white">{content}</p>;

      case 'image':
        if (isAnswer) {
          return (
            <div className="space-y-3">
              {card.content.imageUrl && (
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={card.content.imageUrl}
                    alt="Card content"
                    className="w-full max-h-96 object-contain bg-gray-50 dark:bg-gray-900"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200"%3E%3Crect fill="%23ddd" width="300" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagem não encontrada%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}
              <p className="text-gray-900 dark:text-white">{content}</p>
            </div>
          );
        }
        return <p className="text-gray-900 dark:text-white">{content}</p>;

      default:
        return <p className="text-gray-900 dark:text-white">{content}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Front (Question) */}
      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
          Pergunta
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          {renderContent(card.content.front, card.content.type, false)}
        </div>
      </div>

      {/* Back (Answer) */}
      {showAnswer && (
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
            Resposta
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            {renderContent(card.content.back, card.content.type, true)}
          </div>
        </div>
      )}
    </div>
  );
}
