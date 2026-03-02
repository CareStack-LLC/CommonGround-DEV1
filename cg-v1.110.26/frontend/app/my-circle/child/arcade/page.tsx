'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { Gamepad2, Trophy, Play } from 'lucide-react';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

const games = [
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe',
    description: 'Get three in a row!',
    difficulty: 'Medium',
    poster: '/kidsComms/posters/video game poster/IMG_2307.jpg',
    difficultyColor: 'text-yellow-400',
    badge: '⭐ Featured',
    badgeBg: 'bg-cyan-500',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    description: 'Flip and match the cards!',
    difficulty: 'Easy',
    poster: '/kidsComms/posters/video game poster/IMG_2308.jpg',
    difficultyColor: 'text-green-400',
    badge: null,
    badgeBg: '',
  },
  {
    id: 'drawing',
    title: 'Drawing Pad',
    description: 'Draw and create anything!',
    difficulty: 'Easy',
    poster: '/kidsComms/posters/video game poster/IMG_2309.jpg',
    difficultyColor: 'text-green-400',
    badge: null,
    badgeBg: '',
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

  const featuredGame = games[0]; // Tic-Tac-Toe
  const otherGames = games.slice(1);

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
      {/* Header */}
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

          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center ring-2 ring-offset-2 ring-offset-slate-950 ring-cyan-500/50`}>
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {userInitial}
            </span>
          </div>
        </div>
      </header>

      <main className="space-y-8 pt-6 pb-4 px-4">

        {/* ── Featured Game — Tic-Tac-Toe ── */}
        <section>
          <h2
            className="text-xl font-bold text-white mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <span className="w-1 h-5 bg-cyan-500 rounded-full" />
            Featured Game
          </h2>

          <button
            onClick={() => handleGameSelect(featuredGame)}
            className="relative w-full rounded-2xl overflow-hidden group hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 shadow-2xl shadow-black/40"
          >
            {/* Poster image — 16:9 */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featuredGame.poster}
                alt={featuredGame.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Featured badge */}
              <div className="absolute top-3 left-3">
                <span className="px-3 py-1 rounded-full bg-cyan-500 text-white text-xs font-bold shadow-lg">
                  ⭐ Featured
                </span>
              </div>

              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-2xl">
                  <Play className="w-10 h-10 text-white ml-1" fill="currentColor" />
                </div>
              </div>

              {/* Bottom info */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="font-black text-white text-2xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  {featuredGame.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs font-semibold ${featuredGame.difficultyColor}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                    {featuredGame.difficulty}
                  </span>
                  <span className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {featuredGame.description}
                  </span>
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* ── All Games ── */}
        <section>
          <h2
            className="text-xl font-bold text-white mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            <span className="w-1 h-5 bg-teal-500 rounded-full" />
            All Games
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {games.map(game => (
              <button
                key={game.id}
                onClick={() => handleGameSelect(game)}
                className="relative rounded-2xl overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-black/30"
              >
                {/* Poster — portrait-ish ratio */}
                <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.poster}
                    alt={game.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                  {/* Featured badge */}
                  {game.badge && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500 text-white text-[10px] font-bold">
                        {game.badge}
                      </span>
                    </div>
                  )}

                  {/* Play icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>

                  {/* Bottom label */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="font-bold text-white text-sm leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {game.title}
                    </h3>
                    <span className={`text-[10px] font-semibold ${game.difficultyColor}`} style={{ fontFamily: 'Inter, sans-serif' }}>
                      {game.difficulty}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── High Scores ── */}
        <section>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Your Scores</h3>
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
