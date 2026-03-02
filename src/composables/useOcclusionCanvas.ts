/**
 * Composable for shared occlusion canvas rendering logic.
 * Used by ImageOcclusionDialog, ImageOcclusionEditor, and OcclusionCardViewer.
 *
 * Handles: image loading, DPR-aware canvas setup, and occlusion drawing.
 */

import type { ImageOcclusion } from '@/types/flashcard';
import { nextTick, ref, type Ref } from 'vue';

// ── Types ──────────────────────────────────────────────────────────────

export interface CanvasSetupOptions {
  maxHeight?: number; // max display height (e.g. 300 for editor, 350 for viewer)
  containerPadding?: number; // padding subtracted from container width (e.g. 32 for dialog)
  fitToContainer?: boolean; // if true, also constrain to container height
}

export interface DrawOcclusionOptions {
  selectedId?: string | null;
  showResizeHandles?: boolean;
  revealedIds?: Set<string>;
  showQuestionMark?: boolean; // show "?" instead of index number
  currentDrawingRect?: { x: number; y: number; width: number; height: number } | null;
  drawingColor?: string;
}

// ── Composable ─────────────────────────────────────────────────────────

export function useOcclusionCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLDivElement | null>
) {
  const imageElement = ref<HTMLImageElement | null>(null);
  const imageLoaded = ref(false);
  const canvasScale = ref(1);

  // ── Image Loading ──

  function loadImage(imageData: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      if (!imageData) {
        reject(new Error('No image data'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        imageElement.value = img;
        imageLoaded.value = true;
        resolve(img);
      };

      img.onerror = () => {
        imageLoaded.value = false;
        reject(new Error('Failed to load image'));
      };

      img.src = imageData;
    });
  }

  async function loadImageAndSetup(imageData: string, options: CanvasSetupOptions = {}) {
    await loadImage(imageData);
    await nextTick();
    setupCanvas(options);
  }

  // ── Canvas Setup (DPR-aware) ──

  function setupCanvas(options: CanvasSetupOptions = {}) {
    const canvas = canvasRef.value;
    const container = containerRef.value;
    const img = imageElement.value;

    if (!canvas || !container || !img) return;

    const padding = options.containerPadding ?? 0;
    const containerWidth = Math.max(container.clientWidth - padding, 200);

    const scaleX = containerWidth / img.width;
    let scaleY = 1;

    if (options.maxHeight) {
      scaleY = options.maxHeight / img.height;
    }

    if (options.fitToContainer) {
      const containerHeight = container.clientHeight - padding;
      scaleY = Math.min(scaleY, containerHeight / img.height);
    }

    const displayScale = Math.min(scaleX, scaleY, 1);
    canvasScale.value = displayScale;

    const displayWidth = Math.floor(img.width * displayScale);
    const displayHeight = Math.floor(img.height * displayScale);

    // DPR-aware: render at higher resolution for sharp output on retina screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = img.width * dpr;
    canvas.height = img.height * dpr;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
  }

  // ── Drawing ──

  function redrawCanvas(
    occlusions: ImageOcclusion[],
    options: DrawOcclusionOptions = {}
  ) {
    const canvas = canvasRef.value;
    const ctx = canvas?.getContext('2d');
    const img = imageElement.value;

    if (!canvas || !ctx || !img) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const internalScale = canvas.width / img.width;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw each occlusion
    occlusions.forEach((occ, index) => {
      const x = occ.x * internalScale;
      const y = occ.y * internalScale;
      const width = occ.width * internalScale;
      const height = occ.height * internalScale;
      const color = occ.label || '#EF4444';

      const isSelected = options.selectedId === occ.id;
      const isRevealed = options.revealedIds?.has(occ.id);

      if (isRevealed) {
        // Revealed: green border only
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        return;
      }

      // Solid fill
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);

      // Border
      ctx.strokeStyle = isSelected ? 'white' : 'rgba(0,0,0,0.3)';
      ctx.lineWidth = isSelected ? 3 * dpr : 1 * dpr;
      ctx.strokeRect(x, y, width, height);

      // Label (number or "?")
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2 * dpr;
      const fontSize = Math.max(14 * dpr, Math.min(width, height) * 0.4);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = options.showQuestionMark ? '?' : `${index + 1}`;
      ctx.strokeText(label, x + width / 2, y + height / 2);
      ctx.fillText(label, x + width / 2, y + height / 2);

      // Resize handles for selected occlusion
      if (isSelected && options.showResizeHandles) {
        drawResizeHandles(ctx, x, y, width, height, dpr);
      }
    });

    // Draw current drawing rectangle (for editor dialog)
    if (options.currentDrawingRect) {
      const rect = options.currentDrawingRect;
      const x = rect.x * internalScale;
      const y = rect.y * internalScale;
      const width = rect.width * internalScale;
      const height = rect.height * internalScale;

      ctx.fillStyle = options.drawingColor || '#EF4444';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(x, y, width, height);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2 * dpr;
      ctx.setLineDash([5 * dpr, 5 * dpr]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  }

  function drawResizeHandles(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    dpr: number
  ) {
    const handleSize = 14 * dpr;
    const halfHandle = handleSize / 2;

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2 * dpr;

    const handles = [
      { x: x - halfHandle, y: y - halfHandle },
      { x: x + width / 2 - halfHandle, y: y - halfHandle },
      { x: x + width - halfHandle, y: y - halfHandle },
      { x: x + width - halfHandle, y: y + height / 2 - halfHandle },
      { x: x + width - halfHandle, y: y + height - halfHandle },
      { x: x + width / 2 - halfHandle, y: y + height - halfHandle },
      { x: x - halfHandle, y: y + height - halfHandle },
      { x: x - halfHandle, y: y + height / 2 - halfHandle }
    ];

    handles.forEach(handle => {
      ctx.beginPath();
      ctx.arc(handle.x + halfHandle, handle.y + halfHandle, halfHandle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  // ── Coordinate Helpers ──

  function getCanvasCoordinates(
    event: MouseEvent | Touch,
    zoom: number = 1
  ): { x: number; y: number } {
    const canvas = canvasRef.value;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / (canvasScale.value * zoom);
    const y = (event.clientY - rect.top) / (canvasScale.value * zoom);

    return { x, y };
  }

  type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;

  function getHandleAtPosition(x: number, y: number, occ: ImageOcclusion): ResizeHandle {
    const hitSize = 30;
    const halfHit = hitSize / 2;

    const handles: { pos: { x: number; y: number }; handle: ResizeHandle }[] = [
      { pos: { x: occ.x, y: occ.y }, handle: 'nw' },
      { pos: { x: occ.x + occ.width / 2, y: occ.y }, handle: 'n' },
      { pos: { x: occ.x + occ.width, y: occ.y }, handle: 'ne' },
      { pos: { x: occ.x + occ.width, y: occ.y + occ.height / 2 }, handle: 'e' },
      { pos: { x: occ.x + occ.width, y: occ.y + occ.height }, handle: 'se' },
      { pos: { x: occ.x + occ.width / 2, y: occ.y + occ.height }, handle: 's' },
      { pos: { x: occ.x, y: occ.y + occ.height }, handle: 'sw' },
      { pos: { x: occ.x, y: occ.y + occ.height / 2 }, handle: 'w' }
    ];

    for (const { pos, handle } of handles) {
      if (
        x >= pos.x - halfHit &&
        x <= pos.x + halfHit &&
        y >= pos.y - halfHit &&
        y <= pos.y + halfHit
      ) {
        return handle;
      }
    }

    return null;
  }

  function generateOcclusionId(): string {
    return `occ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  function getPinchDistance(touches: TouchList): number {
    const touch1 = touches[0]!;
    const touch2 = touches[1]!;
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  return {
    // State
    imageElement,
    imageLoaded,
    canvasScale,

    // Image
    loadImage,
    loadImageAndSetup,

    // Canvas
    setupCanvas,
    redrawCanvas,

    // Coordinates & Helpers
    getCanvasCoordinates,
    getHandleAtPosition,
    generateOcclusionId,
    getPinchDistance
  };
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null;
