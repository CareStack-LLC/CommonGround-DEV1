'use client';

import { cn } from '@/lib/utils';

interface KidGameCardProps {
  game: {
    id: string;
    title: string;
    emoji: string;
    color: 'cyan' | 'green' | 'blue' | 'pink' | 'amber' | 'red';
    difficulty?: 'easy' | 'medium' | 'hard';
    description?: string;
  };
  onClick: () => void;
  className?: string;
}

const COLOR_GRADIENTS = {
  cyan: 'from-cyan-300 to-cyan-500',
  green: 'from-green-300 to-green-500',
  blue: 'from-blue-300 to-blue-500',
  pink: 'from-pink-300 to-pink-500',
  amber: 'from-amber-300 to-amber-500',
  red: 'from-red-300 to-red-500',
};

const DIFFICULTY_CONFIG = {
  easy: { dots: 1, color: 'bg-green-500' },
  medium: { dots: 2, color: 'bg-yellow-500' },
  hard: { dots: 3, color: 'bg-red-500' },
};

export function KidGameCard({ game, onClick, className }: KidGameCardProps) {
  const difficultyInfo = game.difficulty ? DIFFICULTY_CONFIG[game.difficulty] : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative bg-white rounded-3xl overflow-hidden shadow-lg',
        'transition-all duration-200 ease-out',
        'hover:shadow-2xl hover:scale-105 hover:-translate-y-1',
        'active:scale-100 active:translate-y-0',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300 focus-visible:ring-offset-2',
        'text-left w-full group',
        className
      )}
      aria-label={`Play ${game.title}`}
    >
      {/* Arcade border decoration */}
      <div className="absolute inset-0 rounded-3xl border-4 border-white/50 pointer-events-none z-10" />

      {/* Game Icon Section */}
      <div
        className={cn(
          'relative aspect-square bg-gradient-to-br overflow-hidden',
          COLOR_GRADIENTS[game.color]
        )}
      >
        {/* Retro arcade pattern background */}
        <div className="absolute inset-0 opacity-20">
          {/* Geometric decorations */}
          <div className="absolute top-4 left-4 w-12 h-12 border-4 border-white rounded-lg rotate-12" />
          <div className="absolute top-8 right-6 w-8 h-8 border-4 border-white rounded-full" />
          <div className="absolute bottom-6 left-8 w-10 h-10 border-4 border-white rounded-lg -rotate-12" />
          <div className="absolute bottom-8 right-8 w-6 h-6 border-4 border-white rounded-full" />

          {/* Diagonal stripes */}
          <div className="absolute -top-12 -left-12 w-24 h-48 bg-white/10 rotate-45" />
          <div className="absolute -bottom-12 -right-12 w-24 h-48 bg-white/10 rotate-45" />
        </div>

        {/* Emoji display with bounce animation */}
        <div className="relative z-10 h-full flex items-center justify-center">
          <span
            className="text-7xl transition-transform duration-300 group-hover:scale-125 group-hover:animate-bounce"
            role="img"
            aria-label={game.title}
          >
            {game.emoji}
          </span>
        </div>

        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent -translate-x-full -translate-y-full group-hover:translate-x-full group-hover:translate-y-full transition-transform duration-700 ease-out" />

        {/* Corner sparkle decorations */}
        <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-4 right-6 w-2 h-2 bg-white rounded-full opacity-40 group-hover:opacity-80 transition-opacity animation-delay-100" />
        <div className="absolute bottom-2 left-2 w-3 h-3 bg-white rounded-full opacity-60 group-hover:opacity-100 transition-opacity animation-delay-200" />
        <div className="absolute bottom-6 left-5 w-2 h-2 bg-white rounded-full opacity-40 group-hover:opacity-80 transition-opacity animation-delay-300" />
      </div>

      {/* Game Info Section */}
      <div className="p-4 bg-gradient-to-b from-white to-slate-50/50">
        {/* Title */}
        <h3 className="font-bold text-gray-800 text-sm leading-snug truncate mb-2">
          {game.title}
        </h3>

        {/* Difficulty indicator */}
        {difficultyInfo && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: difficultyInfo.dots }).map((_, index) => (
              <div
                key={index}
                className={cn(
                  'w-2 h-2 rounded-full shadow-sm',
                  difficultyInfo.color
                )}
              />
            ))}
            <span className="text-xs font-semibold text-gray-500 ml-1 capitalize">
              {game.difficulty}
            </span>
          </div>
        )}

        {/* Play indicator */}
        <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 mt-2">
          <div className="w-2 h-2 rounded-full bg-green-500 group-hover:animate-ping" />
          <span>TAP TO PLAY</span>
        </div>
      </div>

      {/* Arcade button press effect overlay */}
      <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors duration-75 rounded-3xl pointer-events-none" />
    </button>
  );
}
