'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ARIAMascot } from '@/components/kidcoms/aria-mascot';
import { KidGameCard } from '@/components/kidcoms/kid-game-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';

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

      // Validate token and user data exist
      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;

      // CRITICAL: Validate family file ID
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
    console.log('Selected game:', game);
    alert(`Coming soon: ${game.title}! 🎮`);
    // Future: Navigate to game page
    // router.push(`/my-circle/child/arcade/${game.id}`);
  }

  const featuredGame = games[0];

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <ARIAMascot state="loading" greeting="Loading arcade..." />
        </div>
      </div>
    );
  }

  // Empty state - no games
  if (games.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 pb-24">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <KidComsLogo size="sm" className="mb-3" />
            <h1 className="text-2xl font-black text-gray-800">ARCADE</h1>
            <p className="text-gray-600 mt-1">Play fun games!</p>
          </div>
        </header>

        {/* Empty State */}
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <ARIAMascot
              state="idle"
              greeting="No games available right now. Check back soon!"
            />
          </div>
        </div>

        {/* Bottom Navigation */}
        <KidBottomNav />
      </div>
    );
  }

  // Normal state with games
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-pink-50 pb-24">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm border-b-2 border-purple-100">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <KidComsLogo size="sm" className="mb-3" />
          <h1 className="text-2xl font-black text-gray-800">ARCADE</h1>
          <p className="text-gray-600 mt-1">Play fun games!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Featured Game Section */}
        {featuredGame && (
          <section>
            <h2 className="text-lg font-bold text-gray-700 mb-3">FEATURED GAME</h2>
            <div className="max-w-md">
              <KidGameCard
                game={featuredGame}
                onClick={() => handleGameSelect(featuredGame)}
              />
            </div>
          </section>
        )}

        {/* All Games Grid */}
        <section>
          <h2 className="text-lg font-bold text-gray-700 mb-3">ALL GAMES</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {games.map((game) => (
              <KidGameCard
                key={game.id}
                game={game}
                onClick={() => handleGameSelect(game)}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <KidBottomNav />
    </div>
  );
}
