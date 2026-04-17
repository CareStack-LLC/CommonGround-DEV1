'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DailyCall } from '@daily-co/daily-js';
import { RotateCcw, Trophy, X as XIcon, Circle, Users, Cpu, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Mark = 'X' | 'O' | null;
type Board = Mark[];

type OpponentKind = 'computer' | 'participant';

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

interface ArcadeMoveMessage {
  type: 'arcade_move';
  data: {
    gameId: 'tic-tac-toe';
    action: 'move' | 'reset' | 'invite' | 'accept';
    senderId: string;
    senderName?: string;
    cellIndex?: number;
    playedAs?: 'X' | 'O';
    boardSig?: string;
  };
}

function isArcadeTicTacToeMessage(msg: unknown): msg is ArcadeMoveMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as ArcadeMoveMessage;
  return m.type === 'arcade_move' && m?.data?.gameId === 'tic-tac-toe';
}

function checkWinner(board: Board): { winner: Mark | 'draw'; line: number[] } {
  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo };
    }
  }
  if (board.every((cell) => cell !== null)) return { winner: 'draw', line: [] };
  return { winner: null, line: [] };
}

function pickAiMove(board: Board, aiMark: 'X' | 'O'): number {
  const human: 'X' | 'O' = aiMark === 'X' ? 'O' : 'X';
  // 1. win if possible
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const test = [...board];
      test[i] = aiMark;
      if (checkWinner(test).winner === aiMark) return i;
    }
  }
  // 2. block opponent win
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      const test = [...board];
      test[i] = human;
      if (checkWinner(test).winner === human) return i;
    }
  }
  // 3. prefer center, then corners
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  const available = board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  return available[Math.floor(Math.random() * available.length)];
}

function boardSignature(b: Board): string {
  return b.map((c) => c ?? '.').join('');
}

interface InlineTicTacToeProps {
  userId: string;
  userName: string;
  callRef: React.RefObject<DailyCall | null>;
  /** Pre-selected opponent kind. When 'participant', we sync over Daily. */
  opponent: OpponentKind;
  /** For vs-participant mode: the opponent's Daily user id (optional — we
   *  accept the first other participant's move if unset). */
  opponentId?: string;
  opponentName?: string;
  onExit?: () => void;
}

/**
 * Inline two-player (or vs-computer) Tic Tac Toe that can run within the
 * arcade-mode overlay during an active Daily call.
 *
 * Shared-state rules for vs-participant:
 *   - Local player is assigned 'X' when their id < opponent id (stable),
 *     otherwise 'O'. This deterministic mark assignment avoids handshake.
 *   - A move message broadcasts (cellIndex, playedAs, boardSig). We only
 *     apply if `playedAs` matches the opponent's mark AND our local board
 *     signature matches — otherwise we treat it as a replay and ignore.
 */
export function InlineTicTacToe({
  userId,
  userName,
  callRef,
  opponent,
  opponentId,
  opponentName,
  onExit,
}: InlineTicTacToeProps) {
  // Local player's mark. For vs-computer we are always X.
  const localMark: 'X' | 'O' =
    opponent === 'computer'
      ? 'X'
      : opponentId && userId < opponentId
        ? 'X'
        : 'O';
  const remoteMark: 'X' | 'O' = localMark === 'X' ? 'O' : 'X';

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Mark | 'draw'>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [localScore, setLocalScore] = useState(0);
  const [remoteScore, setRemoteScore] = useState(0);

  const lastMoveSentRef = useRef<string>('');

  const broadcastMove = useCallback(
    (cellIndex: number, playedAs: 'X' | 'O', sig: string) => {
      if (opponent !== 'participant') return;
      const call = callRef.current;
      if (!call) return;
      const key = `${cellIndex}:${playedAs}:${sig}`;
      if (lastMoveSentRef.current === key) return;
      lastMoveSentRef.current = key;
      const msg: ArcadeMoveMessage = {
        type: 'arcade_move',
        data: {
          gameId: 'tic-tac-toe',
          action: 'move',
          senderId: userId,
          senderName: userName,
          cellIndex,
          playedAs,
          boardSig: sig,
        },
      };
      try {
        call.sendAppMessage(msg, '*');
      } catch {
        // ignore
      }
    },
    [callRef, opponent, userId, userName],
  );

  const broadcastReset = useCallback(() => {
    if (opponent !== 'participant') return;
    const call = callRef.current;
    if (!call) return;
    const msg: ArcadeMoveMessage = {
      type: 'arcade_move',
      data: {
        gameId: 'tic-tac-toe',
        action: 'reset',
        senderId: userId,
        senderName: userName,
      },
    };
    try {
      call.sendAppMessage(msg, '*');
    } catch {
      // ignore
    }
  }, [callRef, opponent, userId, userName]);

  // Apply remote moves
  useEffect(() => {
    if (opponent !== 'participant') return;
    const call = callRef.current;
    if (!call) return;

    const handler = (event: { data: unknown; fromId?: string }) => {
      if (!isArcadeTicTacToeMessage(event.data)) return;
      const d = event.data.data;
      if (d.senderId === userId) return;
      // If we know the opponent id, drop messages from other participants.
      if (opponentId && d.senderId !== opponentId) return;

      if (d.action === 'reset') {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setWinningLine([]);
        setTurn('X');
        lastMoveSentRef.current = '';
        return;
      }

      if (
        d.action === 'move' &&
        typeof d.cellIndex === 'number' &&
        d.playedAs === remoteMark
      ) {
        setBoard((prev) => {
          if (prev[d.cellIndex!] !== null) return prev; // collision — ignore
          const next = [...prev];
          next[d.cellIndex!] = d.playedAs!;
          const { winner: w, line } = checkWinner(next);
          if (w) {
            setWinner(w);
            setWinningLine(line);
            if (w === remoteMark) setRemoteScore((s) => s + 1);
          } else {
            setTurn(localMark);
          }
          return next;
        });
      }
    };

    call.on('app-message', handler);
    return () => {
      call.off('app-message', handler);
    };
  }, [callRef, opponent, userId, opponentId, remoteMark, localMark]);

  // AI move when it's the computer's turn
  useEffect(() => {
    if (opponent !== 'computer') return;
    if (winner) return;
    if (turn === localMark) return;
    const t = setTimeout(() => {
      setBoard((prev) => {
        const i = pickAiMove(prev, 'O');
        if (prev[i] !== null) return prev;
        const next = [...prev];
        next[i] = 'O';
        const { winner: w, line } = checkWinner(next);
        if (w) {
          setWinner(w);
          setWinningLine(line);
          if (w === 'O') setRemoteScore((s) => s + 1);
        } else {
          setTurn('X');
        }
        return next;
      });
    }, 500);
    return () => clearTimeout(t);
  }, [opponent, turn, winner, localMark]);

  const handleCellClick = (index: number) => {
    if (winner) return;
    if (board[index] !== null) return;
    if (turn !== localMark) return;

    const next = [...board];
    next[index] = localMark;
    const { winner: w, line } = checkWinner(next);
    setBoard(next);
    if (w) {
      setWinner(w);
      setWinningLine(line);
      if (w === localMark) setLocalScore((s) => s + 1);
    } else {
      setTurn(localMark === 'X' ? 'O' : 'X');
    }
    broadcastMove(index, localMark, boardSignature(next));
  };

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine([]);
    setTurn('X');
    lastMoveSentRef.current = '';
    broadcastReset();
  };

  const isLocalTurn = !winner && turn === localMark;
  const opponentLabel =
    opponent === 'computer' ? 'Computer' : opponentName || 'Your partner';
  const OpponentIcon = opponent === 'computer' ? Cpu : UserIcon;

  return (
    <div className="p-4 pb-8">
      <div className="max-w-lg mx-auto mb-5">
        <div className="rounded-2xl p-5 bg-[#1E3A4A]/60 border border-[#3DAA8A]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              {opponent === 'participant' ? (
                <Users className="h-4 w-4 text-[#3DAA8A]" />
              ) : (
                <Cpu className="h-4 w-4 text-[#3DAA8A]" />
              )}
              <span>
                {winner
                  ? winner === 'draw'
                    ? "It's a draw!"
                    : winner === localMark
                      ? 'You win!'
                      : `${opponentLabel} wins!`
                  : isLocalTurn
                    ? `Your turn (${localMark})`
                    : `${opponentLabel}'s turn (${remoteMark})`}
              </span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-[#CBD8E0]/80 hover:text-white px-2 py-1 rounded-md bg-[#0D1B24] border border-[#3DAA8A]/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between bg-[#0D1B24]/60 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-[#3DAA8A]" />
                <span className="text-white font-medium truncate">{userName || 'You'}</span>
              </div>
              <span className="text-[#3DAA8A] font-bold">{localScore}</span>
            </div>
            <div className="flex items-center justify-between bg-[#0D1B24]/60 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <OpponentIcon className="h-4 w-4 text-[#F5A623]" />
                <span className="text-white font-medium truncate">{opponentLabel}</span>
              </div>
              <span className="text-[#F5A623] font-bold">{remoteScore}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[360px] mx-auto grid grid-cols-3 gap-2">
        {board.map((cell, idx) => {
          const isWinning = winningLine.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handleCellClick(idx)}
              disabled={!!winner || cell !== null || !isLocalTurn}
              className={cn(
                'aspect-square rounded-2xl flex items-center justify-center transition-all',
                'bg-[#1E3A4A]/60 border border-[#3DAA8A]/20',
                'hover:bg-[#1E3A4A] disabled:hover:bg-[#1E3A4A]/60',
                'disabled:cursor-not-allowed',
                isWinning && 'bg-[#3DAA8A]/20 border-[#3DAA8A]/60',
              )}
              aria-label={`Cell ${idx + 1}`}
            >
              {cell === 'X' && <XIcon className="h-12 w-12 text-[#3DAA8A]" strokeWidth={3} />}
              {cell === 'O' && <Circle className="h-12 w-12 text-[#F5A623]" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {winner && (
        <div className="max-w-lg mx-auto mt-5 rounded-2xl p-4 bg-[#3DAA8A]/10 border border-[#3DAA8A]/30 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-[#F5A623]" />
          <span className="text-white text-sm">
            {winner === 'draw'
              ? 'Nobody wins — play again?'
              : winner === localMark
                ? `Nice one! ${opponent === 'participant' ? 'Share the win with ' + opponentLabel : ''}`
                : 'Better luck next round.'}
          </span>
          <button
            onClick={handleReset}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-[#3DAA8A] text-white hover:bg-[#3DAA8A]/90"
          >
            Play again
          </button>
        </div>
      )}

      {onExit && (
        <div className="max-w-lg mx-auto mt-4 text-center">
          <button
            onClick={onExit}
            className="text-xs text-[#CBD8E0]/70 hover:text-white underline"
          >
            Back to arcade
          </button>
        </div>
      )}
    </div>
  );
}
