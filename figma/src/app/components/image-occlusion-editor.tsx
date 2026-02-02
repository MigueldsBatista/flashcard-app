import { useState, useRef, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { ImageOcclusion } from '@/types/flashcard';
import { X, Square, Pencil, Save, Trash2, Eye, EyeOff } from 'lucide-react';

interface ImageOcclusionEditorProps {
  imageUrl: string;
  occlusions?: ImageOcclusion[];
  onSave: (occlusions: ImageOcclusion[]) => void;
  onCancel: () => void;
}

export function ImageOcclusionEditor({
  imageUrl,
  occlusions = [],
  onSave,
  onCancel,
}: ImageOcclusionEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [occlusionList, setOcclusionList] = useState<ImageOcclusion[]>(occlusions);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [drawMode, setDrawMode] = useState<'rectangle' | 'polygon'>('rectangle');
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedOcclusion, setSelectedOcclusion] = useState<string | null>(null);
  const [hideOcclusions, setHideOcclusions] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      drawCanvas(img, occlusionList);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Redraw canvas when occlusions change
  useEffect(() => {
    if (image) {
      drawCanvas(image, occlusionList);
    }
  }, [occlusionList, image, hideOcclusions]);

  const drawCanvas = (img: HTMLImageElement, occlusions: ImageOcclusion[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match image
    const container = containerRef.current;
    if (container) {
      const maxWidth = container.clientWidth;
      const maxHeight = 600;
      const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
      
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
    }

    // Draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw occlusions
    if (!hideOcclusions) {
      occlusions.forEach((occlusion) => {
        drawOcclusion(ctx, occlusion, canvas.width / img.width, occlusion.id === selectedOcclusion);
      });
    }

    // Draw current drawing
    if (isDrawing && currentPoints.length > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;

      if (drawMode === 'rectangle' && startPoint && currentPoints.length > 0) {
        const current = currentPoints[currentPoints.length - 1];
        const width = current.x - startPoint.x;
        const height = current.y - startPoint.y;
        ctx.fillRect(startPoint.x, startPoint.y, width, height);
        ctx.strokeRect(startPoint.x, startPoint.y, width, height);
      } else if (drawMode === 'polygon') {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  };

  const drawOcclusion = (
    ctx: CanvasRenderingContext2D,
    occlusion: ImageOcclusion,
    scale: number,
    isSelected: boolean
  ) => {
    const scaledPoints = occlusion.points.map(p => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    ctx.fillStyle = isSelected 
      ? 'rgba(245, 158, 11, 0.6)' 
      : 'rgba(59, 130, 246, 0.5)';
    ctx.strokeStyle = isSelected ? '#F59E0B' : '#3B82F6';
    ctx.lineWidth = isSelected ? 3 : 2;

    if (occlusion.type === 'rectangle' && scaledPoints.length === 2) {
      const width = scaledPoints[1].x - scaledPoints[0].x;
      const height = scaledPoints[1].y - scaledPoints[0].y;
      ctx.fillRect(scaledPoints[0].x, scaledPoints[0].y, width, height);
      ctx.strokeRect(scaledPoints[0].x, scaledPoints[0].y, width, height);
    } else if (occlusion.type === 'polygon') {
      ctx.beginPath();
      ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
      scaledPoints.forEach((point) => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Draw label
    if (occlusion.label && scaledPoints.length > 0) {
      ctx.fillStyle = isSelected ? '#F59E0B' : '#3B82F6';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(occlusion.label, scaledPoints[0].x + 5, scaledPoints[0].y - 5);
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'rectangle') {
      if (!isDrawing) {
        setIsDrawing(true);
        setStartPoint({ x, y });
        setCurrentPoints([{ x, y }]);
      } else {
        // Finish rectangle
        const scale = image.width / canvas.width;
        const points = [
          { x: startPoint!.x * scale, y: startPoint!.y * scale },
          { x: x * scale, y: y * scale },
        ];

        const newOcclusion: ImageOcclusion = {
          id: generateId(),
          type: 'rectangle',
          points,
          label: currentLabel || `Área ${occlusionList.length + 1}`,
        };

        setOcclusionList([...occlusionList, newOcclusion]);
        setIsDrawing(false);
        setStartPoint(null);
        setCurrentPoints([]);
        setCurrentLabel('');
      }
    } else if (drawMode === 'polygon') {
      if (!isDrawing) {
        setIsDrawing(true);
        setCurrentPoints([{ x, y }]);
      } else {
        setCurrentPoints([...currentPoints, { x, y }]);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawMode === 'rectangle' && startPoint) {
      setCurrentPoints([{ x, y }]);
      drawCanvas(image, occlusionList);
    }
  };

  const finishPolygon = () => {
    if (!isDrawing || currentPoints.length < 3 || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const scale = image.width / canvas.width;
    const points = currentPoints.map(p => ({
      x: p.x * scale,
      y: p.y * scale,
    }));

    const newOcclusion: ImageOcclusion = {
      id: generateId(),
      type: 'polygon',
      points,
      label: currentLabel || `Área ${occlusionList.length + 1}`,
    };

    setOcclusionList([...occlusionList, newOcclusion]);
    setIsDrawing(false);
    setCurrentPoints([]);
    setCurrentLabel('');
  };

  const deleteOcclusion = (id: string) => {
    setOcclusionList(occlusionList.filter(o => o.id !== id));
    setSelectedOcclusion(null);
  };

  const handleSave = () => {
    onSave(occlusionList);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Editor de Oclusão de Imagem
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Desenhe retângulos ou polígonos para criar máscaras
            </p>
          </div>
          <Button variant="ghost" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-3">
            <Card className="p-4 bg-white dark:bg-gray-800 border-0 shadow-lg">
              <div className="mb-4 flex gap-2">
                <Button
                  variant={drawMode === 'rectangle' ? 'default' : 'outline'}
                  onClick={() => setDrawMode('rectangle')}
                  className={drawMode === 'rectangle' ? 'bg-[#3B82F6]' : ''}
                >
                  <Square className="w-4 h-4 mr-2" />
                  Retângulo
                </Button>
                <Button
                  variant={drawMode === 'polygon' ? 'default' : 'outline'}
                  onClick={() => setDrawMode('polygon')}
                  className={drawMode === 'polygon' ? 'bg-[#3B82F6]' : ''}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Polígono
                </Button>
                {drawMode === 'polygon' && isDrawing && (
                  <Button
                    onClick={finishPolygon}
                    disabled={currentPoints.length < 3}
                    className="bg-[#10B981] hover:bg-[#059669] text-white"
                  >
                    Finalizar Polígono
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setHideOcclusions(!hideOcclusions)}
                >
                  {hideOcclusions ? (
                    <><Eye className="w-4 h-4 mr-2" /> Mostrar</>
                  ) : (
                    <><EyeOff className="w-4 h-4 mr-2" /> Ocultar</>
                  )}
                </Button>
              </div>

              {isDrawing && (
                <div className="mb-4">
                  <Input
                    value={currentLabel}
                    onChange={(e) => setCurrentLabel(e.target.value)}
                    placeholder="Nome da área (opcional)"
                    className="max-w-xs"
                  />
                </div>
              )}

              <div ref={containerRef} className="bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleMouseMove}
                  className="w-full cursor-crosshair"
                />
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                {drawMode === 'rectangle' 
                  ? 'Clique para começar e clique novamente para finalizar o retângulo'
                  : 'Clique para adicionar pontos ao polígono. Clique em "Finalizar Polígono" quando terminar'
                }
              </p>
            </Card>
          </div>

          {/* Occlusion List */}
          <div className="lg:col-span-1">
            <Card className="p-4 bg-white dark:bg-gray-800 border-0 shadow-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Máscaras ({occlusionList.length})
              </h3>

              <div className="space-y-2 mb-4">
                {occlusionList.map((occlusion) => (
                  <div
                    key={occlusion.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedOcclusion === occlusion.id
                        ? 'border-[#F59E0B] bg-[#F59E0B]/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-[#3B82F6]'
                    }`}
                    onClick={() => setSelectedOcclusion(occlusion.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {occlusion.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {occlusion.type}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOcclusion(occlusion.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}

                {occlusionList.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Nenhuma máscara criada</p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleSave}
                  disabled={occlusionList.length === 0}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salvar ({occlusionList.length})
                </Button>
                <Button
                  onClick={onCancel}
                  variant="outline"
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
