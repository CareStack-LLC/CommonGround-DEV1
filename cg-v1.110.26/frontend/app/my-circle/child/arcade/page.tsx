'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidSpaceHeader } from '@/components/kidcoms/kidspace-header';
import { Gamepad2, Trophy, Play, Users, Zap, Star } from 'lucide-react';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

interface GameScores {
  tictactoe?: { wins: number; losses: number; draws: number; gamesPlayed: number };
  memory?: { bestMoves: number; gamesCompleted: number };
  drawing?: { drawingsCreated: number };
}

const GAME_GRADIENTS: Record<string, { border: string; glow: string; accent: string }> = {
  tictactoe: {
    border: 'linear-gradient(135deg, #4BA8C8, #349878, #4BA8C8)',
    glow: 'rgba(75, 168, 200, 0.25)',
    accent: '#4BA8C8',
  },
  memory: {
    border: 'linear-gradient(135deg, #a855f7, #2D6A8F, #c084fc)',
    glow: 'rgba(168, 85, 247, 0.25)',
    accent: '#c084fc',
  },
  drawing: {
    border: 'linear-gradient(135deg, #ec4899, #db2777, #f472b6)',
    glow: 'rgba(236, 72, 153, 0.25)',
    accent: '#f472b6',
  },
};

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; dots: number }> = {
  Easy: { label: 'Easy', color: '#4ade80', dots: 1 },
  Medium: { label: 'Medium', color: '#facc15', dots: 2 },
  Hard: { label: 'Hard', color: '#f87171', dots: 3 },
};

const games = [
  {
    id: 'tictactoe',
    title: 'Tic-Tac-Toe',
    description: 'Get three in a row!',
    difficulty: 'Medium',
    players: '1 Player',
    poster: '/kidsComms/posters/videogame-posters/IMG_2307.jpg',
    badge: '⭐ Featured',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    description: 'Flip and match the cards!',
    difficulty: 'Easy',
    players: '1 Player',
    poster: '/kidsComms/posters/videogame-posters/IMG_2308.jpg',
    badge: null,
  },
  {
    id: 'drawing',
    title: 'Drawing Pad',
    description: 'Draw and create anything!',
    difficulty: 'Easy',
    players: '1 Player',
    poster: '/kidsComms/posters/videogame-posters/IMG_2309.jpg',
    badge: null,
  },
];

const AVATAR_COLORS = [
  'from-[#4BA8C8] to-[#3DAA8A]',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-[#3DAA8A]',
];

export default function ArcadePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scores, setScores] = useState<GameScores>({});

  useEffect(() => {
    validateAndLoadUser();
    loadScores();
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

  function loadScores() {
    try {
      const raw = localStorage.getItem('kid_game_scores');
      if (raw) setScores(JSON.parse(raw));
    } catch {}
  }

  function handleGameSelect(game: typeof games[0]) {
    router.push(`/my-circle/child/arcade/${game.id}`);
  }

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

  const featuredGame = games[0];
  const otherGames = games.slice(1);
  const totalGamesPlayed = (scores.tictactoe?.gamesPlayed || 0) + (scores.memory?.gamesCompleted || 0);
  const hasScores = totalGamesPlayed > 0 || (scores.drawing?.drawingsCreated || 0) > 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#4BA8C8] to-[#3DAA8A] flex items-center justify-center mx-auto animate-pulse">
            <Gamepad2 className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Loading arcade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--portal-background)' }}>
      {/* Header */}
      <KidSpaceHeader
        title="Arcade"
        subtitle={`${games.length} games ready to play`}
        userInitial={userInitial}
        avatarGradient={avatarGradient}
      />

      <main className="space-y-6 pt-6 pb-4 px-4">

        {/* ── Your Scores Leaderboard ── */}
        <section>
          <div
            className="rounded-2xl p-4"
            style={{
              background: 'var(--portal-surface)',
              border: '1px solid var(--portal-border)',
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Your Scores</h3>
                <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  {hasScores ? `${totalGamesPlayed} games played` : 'Play games to see your scores here!'}
                </p>
              </div>
            </div>

            {hasScores ? (
              <div className="space-y-2">
                {scores.tictactoe && scores.tictactoe.gamesPlayed > 0 && (
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${GAME_GRADIENTS.tictactoe.glow}`, border: `1px solid ${GAME_GRADIENTS.tictactoe.accent}40` }}
                      >
                        <span className="text-sm">❌</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Tic-Tac-Toe</div>
                        <div className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                          {scores.tictactoe.gamesPlayed} games
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      <span style={{ color: '#4ade80' }}>{scores.tictactoe.wins}W</span>
                      <span style={{ color: '#f87171' }}>{scores.tictactoe.losses}L</span>
                      <span style={{ color: 'var(--portal-muted)' }}>{scores.tictactoe.draws}D</span>
                    </div>
                  </div>
                )}

                {scores.memory && scores.memory.gamesCompleted > 0 && (
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${GAME_GRADIENTS.memory.glow}`, border: `1px solid ${GAME_GRADIENTS.memory.accent}40` }}
                      >
                        <span className="text-sm">🧠</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Memory Match</div>
                        <div className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                          {scores.memory.gamesCompleted} completed
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: GAME_GRADIENTS.memory.accent }}>
                        {scores.memory.bestMoves} moves
                      </div>
                      <div className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>best score</div>
                    </div>
                  </div>
                )}

                {scores.drawing && scores.drawing.drawingsCreated > 0 && (
                  <div
                    className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${GAME_GRADIENTS.drawing.glow}`, border: `1px solid ${GAME_GRADIENTS.drawing.accent}40` }}
                      >
                        <span className="text-sm">🎨</span>
                      </div>
                      <div>
                        <div className="text-xs font-semibold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Drawing Pad</div>
                        <div className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>creative mode</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: GAME_GRADIENTS.drawing.accent }}>
                        {scores.drawing.drawingsCreated}
                      </div>
                      <div className="text-[10px]" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>drawings</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="rounded-xl p-6 text-center"
                style={{ background: 'var(--portal-input-bg)', border: '1px dashed var(--portal-input-border)' }}
              >
                <Gamepad2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--portal-muted)' }} />
                <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  No scores yet. Start playing to track your progress!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Featured Game Hero ── */}
        <section>
          <h2
            className="text-xl font-bold mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}
          >
            <Star className="w-5 h-5" style={{ color: GAME_GRADIENTS[featuredGame.id].accent }} />
            Featured Game
          </h2>

          <button
            onClick={() => handleGameSelect(featuredGame)}
            className="relative w-full rounded-2xl overflow-hidden group hover:scale-[1.01] active:scale-[0.99] transition-all duration-200"
            style={{
              padding: '2px',
              background: GAME_GRADIENTS[featuredGame.id].border,
              boxShadow: `0 8px 32px ${GAME_GRADIENTS[featuredGame.id].glow}, 0 0 0 1px ${GAME_GRADIENTS[featuredGame.id].glow}`,
            }}
          >
            <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--portal-surface)' }}>
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredGame.poster}
                  alt={featuredGame.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Featured badge */}
                <div className="absolute top-3 left-3">
                  <span
                    className="px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg backdrop-blur-sm"
                    style={{ background: 'linear-gradient(135deg, #4BA8C8, #349878)' }}
                  >
                    ⭐ Featured
                  </span>
                </div>

                {/* Player count badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm"
                    style={{
                      background: 'var(--portal-surface)',
                      color: 'var(--portal-text)',
                      border: '1px solid var(--portal-border)',
                    }}
                  >
                    <Users className="w-3 h-3" />
                    {featuredGame.players}
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
                  <div className="flex items-center gap-3 mt-1.5">
                    <DifficultyBadge difficulty={featuredGame.difficulty} />
                    <span className="text-slate-300 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {featuredGame.description}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>
        </section>

        {/* ── All Games ── */}
        <section>
          <h2
            className="text-xl font-bold mb-4 flex items-center gap-2"
            style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}
          >
            <Zap className="w-5 h-5" style={{ color: '#5BC4A0' }} />
            All Games
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {games.map(game => {
              const gradient = GAME_GRADIENTS[game.id];
              const diffConfig = DIFFICULTY_CONFIG[game.difficulty];

              return (
                <button
                  key={game.id}
                  onClick={() => handleGameSelect(game)}
                  className="relative rounded-2xl overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-left"
                  style={{
                    padding: '2px',
                    background: gradient.border,
                    boxShadow: `0 4px 20px ${gradient.glow}`,
                  }}
                >
                  <div className="rounded-[14px] overflow-hidden" style={{ background: 'var(--portal-surface)' }}>
                    <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={game.poster}
                        alt={game.title}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                      {/* Player count badge */}
                      <div className="absolute top-2 right-2">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 backdrop-blur-sm"
                          style={{
                            background: 'rgba(0,0,0,0.5)',
                            color: '#fff',
                            border: '1px solid rgba(255,255,255,0.15)',
                          }}
                        >
                          <Users className="w-2.5 h-2.5" />
                          {game.players}
                        </span>
                      </div>

                      {game.badge && (
                        <div className="absolute top-2 left-2">
                          <span
                            className="px-2 py-0.5 rounded-full text-white text-[10px] font-bold"
                            style={{ background: 'linear-gradient(135deg, #4BA8C8, #349878)' }}
                          >
                            {game.badge}
                          </span>
                        </div>
                      )}

                      {/* Play hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30">
                          <Play className="w-6 h-6 text-white ml-0.5" fill="currentColor" />
                        </div>
                      </div>

                      {/* Bottom info */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h3 className="font-bold text-white text-sm leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {game.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <DifficultyBadge difficulty={game.difficulty} compact />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </main>

      <KidBottomNav />
    </div>
  );
}

/** Difficulty indicator with colored dots */
function DifficultyBadge({ difficulty, compact }: { difficulty: string; compact?: boolean }) {
  const config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;

  return (
    <span
      className={`inline-flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'} font-semibold`}
      style={{ fontFamily: 'Inter, sans-serif', color: config.color }}
    >
      <span className="flex items-center gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <span
            key={i}
            className="inline-block rounded-full"
            style={{
              width: compact ? '4px' : '5px',
              height: compact ? '4px' : '5px',
              background: i < config.dots ? config.color : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </span>
      {config.label}
    </span>
  );
}
