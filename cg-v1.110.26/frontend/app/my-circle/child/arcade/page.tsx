'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidGameCard } from '@/components/kidcoms/kid-game-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { Gamepad2 } from 'lucide-react';

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
    color: 'purple' as const,
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
        console.error('Missing family file ID');
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

  const featuredGame = games[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading arcade..." />
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9] pb-24">
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-10 h-10 text-[#2C5F5D]" />
              <h1 className="text-2xl font-bold text-[#2C3E50]">ARCADE</h1>
            </div>
            <p className="text-gray-600 mt-1">Play fun games</p>
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="No games available right now. Check back soon!"
            />
          </div>
        </div>

        <KidBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-24 bg-gradient-to-b from-[#FFF8F3] via-white to-[#F5F9F9]">
      {/* Subtle decorative lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.02]">
        <div className="absolute top-32 left-0 w-full h-px bg-[#2C5F5D]" />
        <div className="absolute top-64 right-0 w-3/4 h-px bg-[#D97757]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <div className="flex items-center gap-3">
              <Gamepad2 className="w-10 h-10 text-[#2C5F5D]" />
              <div>
                <h1 className="text-3xl font-bold text-[#2C3E50]">Arcade</h1>
                <p className="text-gray-600 text-sm">Play and have fun</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
          {/* Featured Game Section */}
          {featuredGame && (
            <section>
              <h2 className="text-xl font-bold text-[#2C3E50] mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-[#D97757] rounded-full"></span>
                Featured Game
              </h2>
              <div className="max-w-2xl mx-auto">
                <div className="group transform hover:scale-[1.02] transition-all duration-200">
                  <KidGameCard
                    game={featuredGame}
                    onClick={() => handleGameSelect(featuredGame)}
                    className="border border-[#2C5F5D]/20 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
                  />
                </div>
              </div>
            </section>
          )}

          {/* All Games Grid */}
          <section>
            <h2 className="text-xl font-bold text-[#2C3E50] mb-4 flex items-center gap-2">
              <span className="w-1 h-6 bg-[#2C5F5D] rounded-full"></span>
              All Games
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="group transform hover:scale-[1.02] transition-all duration-200"
                >
                  <KidGameCard
                    game={game}
                    onClick={() => handleGameSelect(game)}
                    className="border border-gray-200 hover:border-[#2C5F5D]/40 hover:shadow-lg transition-all"
                  />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <KidBottomNav />
    </div>
  );
}
