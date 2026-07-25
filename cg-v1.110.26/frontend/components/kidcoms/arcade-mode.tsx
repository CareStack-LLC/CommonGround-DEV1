'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DailyCall } from '@daily-co/daily-js';
import { X, Gamepad2, Trophy, ArrowRight, Cpu, Users, User as UserIcon, ChevronLeft } from 'lucide-react';
import { InlineTicTacToe } from './arcade/inline-tic-tac-toe';

interface VideoParticipant {
  odId: string;
  odName: string;
  isLocal: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  videoOn: boolean;
  audioOn: boolean;
}

interface ArcadeModeProps {
  isActive: boolean;
  userId: string;
  userName?: string;
  /** Optional — when present, 2-player arcade over Daily is available. */
  callRef?: React.RefObject<DailyCall | null>;
  /** Optional — participant map supplies the opponent for vs-participant mode. */
  participants?: Map<string, VideoParticipant>;
  onExit: () => void;
}

type OpponentKind = 'computer' | 'participant';

// Games that can be played inline during a call (2-player capable).
const INLINE_GAMES = [
  {
    id: 'tic-tac-toe' as const,
    title: 'Tic Tac Toe',
    emoji: '❌⭕',
    description: 'Classic strategy game',
    color: 'from-[#3DAA8A] to-[#2D6A8F]',
  },
];

// Full-page games that navigate away to the KidSpace arcade page. Kept for
// games that haven't been ported to inline/2-player yet.
const ROUTED_GAMES = [
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

export function ArcadeMode({
  isActive,
  userId,
  userName,
  callRef,
  participants,
  onExit,
}: ArcadeModeProps) {
  const router = useRouter();
  const [activeGame, setActiveGame] = useState<'tic-tac-toe' | null>(null);
  const [opponentKind, setOpponentKind] = useState<OpponentKind | null>(null);

  // First remote participant — used as the opponent for "vs participant" mode.
  const remoteParticipant = useMemo(() => {
    if (!participants) return null;
    const list = Array.from(participants.values()).filter((p) => !p.isLocal);
    return list[0] ?? null;
  }, [participants]);

  const canPlayVsParticipant = Boolean(callRef && remoteParticipant);

  if (!isActive) return null;

  function handleRoutedGame(gameId: string) {
    router.push(`/my-circle/child/arcade/${gameId}`);
  }

  function handleGoToArcade() {
    router.push('/my-circle/child/arcade');
  }

  function resetToLobby() {
    setActiveGame(null);
    setOpponentKind(null);
  }

  // ── Lobby: game picker ──────────────────────────────────────────────
  if (!activeGame) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0D1B24]/95 backdrop-blur-sm flex flex-col">
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
          <button aria-label="Close"
            onClick={onExit}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-lg mx-auto space-y-4">
            <div className="space-y-3">
              {INLINE_GAMES.map((game) => (
                <button
                  key={game.id}
                  onClick={() => setActiveGame(game.id)}
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
                      {callRef && <span className="text-[#3DAA8A]"> · 2-player ready</span>}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#3DAA8A] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}

              {ROUTED_GAMES.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleRoutedGame(game.id)}
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

  // ── Opponent picker for the selected game ────────────────────────────
  if (!opponentKind) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#0D1B24]/95 backdrop-blur-sm flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3DAA8A]/10">
          <button
            onClick={resetToLobby}
            className="flex items-center gap-1 text-white/80 hover:text-white text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Games
          </button>
          <div className="text-white font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Pick an opponent
          </div>
          <button aria-label="Close"
            onClick={onExit}
            className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-lg mx-auto space-y-3">
            <button
              onClick={() => setOpponentKind('computer')}
              className="w-full flex items-center gap-4 p-4 bg-[#1E3A4A]/60 hover:bg-[#1E3A4A] rounded-2xl border border-[#3DAA8A]/10 hover:border-[#3DAA8A]/30 transition-all text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#3DAA8A] to-[#2D6A8F] flex items-center justify-center">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold">Play the computer</h3>
                <p className="text-[#CBD8E0]/60 text-sm">Sharp AI — good practice when you're on your own.</p>
              </div>
            </button>

            <button
              onClick={() => setOpponentKind('participant')}
              disabled={!canPlayVsParticipant}
              className="w-full flex items-center gap-4 p-4 bg-[#1E3A4A]/60 hover:bg-[#1E3A4A] rounded-2xl border border-[#3DAA8A]/10 hover:border-[#3DAA8A]/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1E3A4A]/60"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#F5A623] to-[#E8941E] flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold">
                  Play {remoteParticipant?.odName || 'your partner'}
                </h3>
                <p className="text-[#CBD8E0]/60 text-sm">
                  {canPlayVsParticipant
                    ? 'Take turns live — moves sync over your call.'
                    : 'Waiting for someone to join the call…'}
                </p>
              </div>
              {canPlayVsParticipant && (
                <UserIcon className="h-5 w-5 text-[#F5A623]" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active game ──────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[100] bg-[#0D1B24]/95 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3DAA8A]/10">
        <button
          onClick={() => setOpponentKind(null)}
          className="flex items-center gap-1 text-white/80 hover:text-white text-sm"
        >
          <ChevronLeft className="h-4 w-4" />
          Opponent
        </button>
        <div className="text-white font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Tic Tac Toe · {opponentKind === 'computer' ? 'vs Computer' : `vs ${remoteParticipant?.odName || 'Partner'}`}
        </div>
        <button aria-label="Close"
          onClick={onExit}
          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeGame === 'tic-tac-toe' && callRef && (
          <InlineTicTacToe
            userId={userId}
            userName={userName || 'You'}
            callRef={callRef}
            opponent={opponentKind}
            opponentId={remoteParticipant?.odId}
            opponentName={remoteParticipant?.odName}
            onExit={resetToLobby}
          />
        )}
        {activeGame === 'tic-tac-toe' && !callRef && (
          <div className="p-6 text-white/70 text-center">
            This board needs an active call to broadcast moves. Join the call and try again.
          </div>
        )}
      </div>
    </div>
  );
}
