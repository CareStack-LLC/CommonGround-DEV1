'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Download, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Cyan', value: '#4BA8C8' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'White', value: '#FFFFFF' },
];

const BRUSH_SIZES = [
  { name: 'S', value: 2 },
  { name: 'M', value: 5 },
  { name: 'L', value: 10 },
  { name: 'XL', value: 20 },
];

function incrementDrawingCount() {
  try {
    const raw = localStorage.getItem('kid_game_scores');
    const scores = raw ? JSON.parse(raw) : {};
    const drawing = scores.drawing || { drawingsCreated: 0 };
    drawing.drawingsCreated++;
    scores.drawing = drawing;
    localStorage.setItem('kid_game_scores', JSON.stringify(scores));
  } catch {}
}

export function DrawingPad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[4].value); // Cyan
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1].value);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      // Dark canvas background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const point = getPoint(e);
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function getPoint(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function saveDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    incrementDrawingCount();
    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  return (
    <div className="p-4 pb-8">
      {/* Toolbar */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="rounded-2xl p-4" style={{ background: 'var(--portal-surface, #1e293b)', border: '1px solid var(--portal-border, #334155)' }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Brush sizes */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted, #94A3B8)' }}>Brush:</span>
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setBrushSize(size.value)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-xs font-bold transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA8C8]',
                    brushSize === size.value
                      ? 'bg-[#4BA8C8] text-white shadow-lg shadow-[#4BA8C8]/30'
                      : ''
                  )}
                >
                  {size.name}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                aria-label="Color picker"
              >
                <Palette className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={clearCanvas}
                className="w-9 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center transition-colors"
                aria-label="Clear canvas"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
              <button
                onClick={saveDrawing}
                className="w-9 h-9 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
                aria-label="Save drawing"
              >
                <Download className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Color palette */}
          {showColorPicker && (
            <div className="mt-3 flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    setCurrentColor(color.value);
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    'w-9 h-9 rounded-full transition-all duration-200',
                    'hover:scale-110 active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4BA8C8]',
                    currentColor === color.value && 'ring-2 ring-[#4BA8C8] ring-offset-2 ring-offset-slate-800'
                  )}
                  style={{ backgroundColor: color.value }}
                  aria-label={color.name}
                />
              ))}
            </div>
          )}

          {/* Current color indicator */}
          <div className="mt-3 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: currentColor, border: '2px solid var(--portal-border, #475569)' }} />
            <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted, #94A3B8)' }}>
              Current color
            </span>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="max-w-4xl mx-auto">
        <div className="rounded-2xl overflow-hidden" style={{ height: '450px', background: 'var(--portal-surface, #1e293b)', border: '1px solid var(--portal-border, #334155)' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair touch-none"
          />
        </div>
      </div>
    </div>
  );
}
