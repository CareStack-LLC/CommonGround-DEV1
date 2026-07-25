'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidSpaceThemeToggle } from '@/components/kidcoms/kidspace-theme-toggle';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { useKidSpaceTheme } from '@/components/kidcoms/kidspace-theme-provider';
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cg-slate-light to-cg-sage flex items-center justify-center animate-pulse">
          <Gamepad2 className="w-8 h-8 text-white" strokeWidth={1.5} />
        </div>
      </div>
    );
  }

  if (!gameMeta) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--portal-background)' }}>
        <p className="text-lg" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Game not found</p>
        <button
          onClick={() => router.push('/my-circle/child/arcade')}
          className="px-6 py-2 rounded-full bg-cg-slate-light text-white font-bold text-sm"
        >
          Back to Arcade
        </button>
      </div>
    );
  }

  const GameComponent = gameMeta.component;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--portal-background)' }}>
      {/* Floating back header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg" style={{ background: 'var(--portal-background)', borderBottom: '1px solid var(--portal-border)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <button aria-label="Back"
            onClick={() => router.push('/my-circle/child/arcade')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--portal-surface)', color: 'var(--portal-text-heading)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              {gameMeta.title}
            </h1>
            <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
              Arcade
            </p>
          </div>
          <KidSpaceThemeToggle size="sm" />
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
