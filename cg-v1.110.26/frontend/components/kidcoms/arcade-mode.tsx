'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Gamepad2, Trophy, Zap, Star, ArrowRight } from 'lucide-react';

interface ArcadeModeProps {
  isActive: boolean;
  userId: string;
  onExit: () => void;
}

// Games available in the KidSpace arcade
const ARCADE_GAMES = [
  {
    id: 'tic-tac-toe',
    title: 'Tic Tac Toe',
    emoji: '❌⭕',
    description: 'Classic strategy game',
    color: 'from-[#3DAA8A] to-[#2D6A8F]',
  },
  {
    id: 'memory-game',
    title: 'Memory Match',
    emoji: '🧠',
    description: 'Test your memory skills',
    color: 'from-[#F5A623] to-[#E8941E]',
  },
  {
    id: 'drawing-pad',
    title: 'Drawing Pad',
    emoji: '🎨',
    description: 'Create art together',
    color: 'from-[#2D6A8F] to-[#4BA8C8]',
  },
];

export function ArcadeMode({ isActive, userId, onExit }: ArcadeModeProps) {
  const router = useRouter();

  if (!isActive) return null;

  function handlePlayGame(gameId: string) {
    // Navigate to the KidSpace arcade game page
    router.push(`/my-circle/child/arcade/${gameId}`);
  }

  function handleGoToArcade() {
    // Navigate to the full KidSpace arcade
    router.push('/my-circle/child/arcade');
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#0D1B24]/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3DAA8A]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3DAA8A] to-[#2D6A8F] flex items-center justify-center shadow-lg shadow-[#3DAA8A]/20">
            <Gamepad2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Arcade
            </h2>
            <p className="text-[#CBD8E0]/50 text-xs" style={{ fontFamily: "'Inter', sans-serif" }}>
              Play games during your call
            </p>
          </div>
        </div>
        <button
          onClick={onExit}
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Games Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Quick Play Games */}
          <div className="space-y-3">
            {ARCADE_GAMES.map((game) => (
              <button
                key={game.id}
                onClick={() => handlePlayGame(game.id)}
                className="w-full flex items-center gap-4 p-4 bg-[#1E3A4A]/60 hover:bg-[#1E3A4A] rounded-2xl border border-[#3DAA8A]/10 hover:border-[#3DAA8A]/30 transition-all group"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-105 transition-transform`}>
                  {game.emoji}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {game.title}
                  </h3>
                  <p className="text-[#CBD8E0]/50 text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
                    {game.description}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-[#3DAA8A] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>

          {/* Full Arcade Link */}
          <button
            onClick={handleGoToArcade}
            className="w-full p-5 bg-gradient-to-r from-[#3DAA8A]/20 to-[#2D6A8F]/20 hover:from-[#3DAA8A]/30 hover:to-[#2D6A8F]/30 rounded-2xl border border-[#3DAA8A]/20 hover:border-[#3DAA8A]/40 transition-all text-center group"
          >
            <div className="flex items-center justify-center gap-3">
              <Trophy className="h-6 w-6 text-[#F5A623]" />
              <span className="text-white font-bold text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Open Full Arcade
              </span>
              <ArrowRight className="h-5 w-5 text-[#3DAA8A] group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-[#CBD8E0]/50 text-sm mt-1" style={{ fontFamily: "'Inter', sans-serif" }}>
              See all games, scores, and badges
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}
