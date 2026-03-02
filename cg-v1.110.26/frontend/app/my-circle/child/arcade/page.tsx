'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KidGameCard } from '@/components/kidcoms/kid-game-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { Gamepad2, Trophy, Search } from 'lucide-react';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

const games = [
  {
    id: 'memory',
    title: 'Memory Match',
    emoji: '🧩',
    color: 'cyan' as const,
    difficulty: 'easy' as const,
    description: 'Match the cards!',
  },
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe',
    emoji: '❌',
    color: 'blue' as const,
    difficulty: 'medium' as const,
    description: 'Get three in a row!',
  },
  {
    id: 'drawing',
    title: 'Drawing Pad',
    emoji: '🎨',
    color: 'pink' as const,
    difficulty: 'easy' as const,
    description: 'Draw and create!',
  },
];

const AVATAR_COLORS = [
  'from-cyan-500 to-teal-500',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-500',
];

export default function ArcadePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    validateAndLoadUser();
  }, []);

  function validateAndLoadUser() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');

      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;
      if (!user.familyFileId) {
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  function handleGameSelect(game: typeof games[0]) {
    alert(`Coming soon: ${game.title}!`);
  }

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto animate-pulse">
            <Gamepad2 className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <p className="text-slate-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Loading arcade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Dark Header — matches Movies/Dashboard style */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Gamepad2 className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-black text-white text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Arcade</h1>
              <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                {games.length} games ready to play
              </p>
            </div>
          </div>

          <div
            className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center ring-2 ring-offset-2 ring-offset-slate-950 ring-cyan-500/50`}
          >
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {userInitial}
            </span>
          </div>
        </div>
      </header>

      <main className="space-y-6 pt-6 pb-4 px-4">
        {/* Featured Game */}
        <section>
          <h2
            className="text-xl font-bold text-white mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <span className="w-1 h-5 bg-cyan-500 rounded-full" />
            Featured Game
          </h2>
          <div className="max-w-sm">
            <KidGameCard
              game={games[0]}
              onClick={() => handleGameSelect(games[0])}
              className="shadow-2xl shadow-cyan-500/10"
            />
          </div>
        </section>

        {/* All Games Grid */}
        <section>
          <h2
            className="text-xl font-bold text-white mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <span className="w-1 h-5 bg-teal-500 rounded-full" />
            All Games
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {games.map(game => (
              <KidGameCard
                key={game.id}
                game={game}
                onClick={() => handleGameSelect(game)}
              />
            ))}
          </div>
        </section>

        {/* High Scores teaser */}
        <section>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Your Scores
              </h3>
              <p className="text-slate-400 text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                Play games to see your best scores here!
              </p>
            </div>
          </div>
        </section>
      </main>

      <KidBottomNav />
    </div>
  );
}
