'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Download, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = [
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Black', value: '#000000' },
  { name: 'White', value: '#FFFFFF' },
];

const BRUSH_SIZES = [
  { name: 'Small', value: 2 },
  { name: 'Medium', value: 5 },
  { name: 'Large', value: 10 },
  { name: 'XL', value: 20 },
];

export function DrawingPad() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState(COLORS[4].value); // Blue
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1].value); // Medium
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Fill with white background
      ctx.fillStyle = '#FFFFFF';
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
      // Touch event
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      // Mouse event
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function saveDrawing() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `drawing-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-6 pb-24">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-800">DRAWING PAD</h1>
              <p className="text-sm text-gray-600 mt-1">Create amazing art!</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={clearCanvas}
                className={cn(
                  'bg-red-500 hover:bg-red-600 text-white',
                  'rounded-full px-4 py-2 shadow-lg',
                  'flex items-center gap-2',
                  'transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300'
                )}
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-bold">Clear</span>
              </button>
              <button
                onClick={saveDrawing}
                className={cn(
                  'bg-green-500 hover:bg-green-600 text-white',
                  'rounded-full px-4 py-2 shadow-lg',
                  'flex items-center gap-2',
                  'transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300'
                )}
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-bold">Save</span>
              </button>
            </div>
          </div>

          {/* Brush Size Selector */}
          <div className="mt-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-700">Brush:</span>
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size.value}
                  onClick={() => setBrushSize(size.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold',
                    'transition-all duration-200',
                    'hover:scale-105 active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300',
                    brushSize === size.value
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-white text-gray-700 shadow hover:shadow-md'
                  )}
                >
                  {size.name}
                </button>
              ))}
            </div>
          </div>

          {/* Color Palette */}
          <div className="mt-4">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full',
                'bg-gradient-to-r from-purple-500 to-pink-500',
                'hover:from-purple-600 hover:to-pink-600',
                'text-white font-bold shadow-lg',
                'transition-all duration-200',
                'hover:scale-105 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300'
              )}
            >
              <Palette className="w-4 h-4" />
              <span className="text-sm">Colors</span>
            </button>

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
                      'w-10 h-10 rounded-full shadow-lg',
                      'transition-all duration-200',
                      'hover:scale-110 active:scale-95',
                      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300',
                      currentColor === color.value && 'ring-4 ring-purple-500'
                    )}
                    style={{ backgroundColor: color.value }}
                    aria-label={color.name}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drawing Canvas */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden" style={{ height: '500px' }}>
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
