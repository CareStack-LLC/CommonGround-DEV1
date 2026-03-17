'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { TicTacToe } from '@/components/kidcoms/arcade/tic-tac-toe';
import { MemoryGame } from '@/components/kidcoms/arcade/memory-game';
import { DrawingPad } from '@/components/kidcoms/arcade/drawing-pad';

const GAME_META: Record<string, { title: string; component: React.ComponentType }> = {
  tictactoe: { title: 'Tic-Tac-Toe', component: TicTacToe },
  memory: { title: 'Memory Match', component: MemoryGame },
  drawing: { title: 'Drawing Pad', component: DrawingPad },
};

export default function GamePlayPage() {
  const router = useRouter();
  const params = useParams();
  const gameId = params.gameId as string;
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('child_token');
    if (!token) {
      router.push('/my-circle/child');
      return;
    }
    setIsAuthed(true);
  }, [router]);

  const gameMeta = GAME_META[gameId];

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center animate-pulse">
          <Gamepad2 className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  if (!gameMeta) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>Game not found</p>
        <button
          onClick={() => router.push('/my-circle/child/arcade')}
          className="px-6 py-2 rounded-full bg-cyan-500 text-white font-bold text-sm"
        >
          Back to Arcade
        </button>
      </div>
    );
  }

  const GameComponent = gameMeta.component;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Floating back header */}
      <header className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push('/my-circle/child/arcade')}
            className="w-9 h-9 rounded-xl bg-slate-800/80 flex items-center justify-center hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-white text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {gameMeta.title}
            </h1>
            <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              Arcade
            </p>
          </div>
        </div>
      </header>

      {/* Game area */}
      <div className="relative">
        <GameComponent />
      </div>

      <KidBottomNav />
    </div>
  );
}
