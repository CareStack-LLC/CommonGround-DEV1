'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    // hello: announce presence (mount/reconnect) so peers exchange full state.
    // state: authoritative full-board snapshot from the player who just moved
    //        (or in reply to a hello). reset: start a new round.
    action: 'hello' | 'state' | 'reset';
    senderId: string;
    senderName?: string;
    board?: Mark[];
    turn?: 'X' | 'O';
    winner?: Mark | 'draw' | null;
    line?: number[];
  };
}

function isArcadeTicTacToeMessage(msg: unknown): msg is ArcadeMoveMessage {
  if (!msg || typeof msg !== 'object') return false;
  const m = msg as ArcadeMoveMessage;
  return m.type === 'arcade_move' && m?.data?.gameId === 'tic-tac-toe';
}

function filledCount(b: Board): number {
  return b.reduce((n, c) => (c !== null ? n + 1 : n), 0);
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
  // Resolve the opponent's Daily id dynamically. It can be unknown at mount
  // (opponentId is optional), so we learn it from the first peer message —
  // making mark assignment deterministic and identical on both sides instead
  // of both defaulting to 'O' and deadlocking.
  const [resolvedOpponentId, setResolvedOpponentId] = useState<string | null>(
    opponentId ?? null,
  );
  const [remoteName, setRemoteName] = useState<string | undefined>(opponentName);

  // Stable mark: the lower user id is always 'X'. For vs-computer we are 'X'.
  const localMark: 'X' | 'O' | null = useMemo(() => {
    if (opponent === 'computer') return 'X';
    if (!resolvedOpponentId) return null; // undetermined until handshake
    return userId < resolvedOpponentId ? 'X' : 'O';
  }, [opponent, resolvedOpponentId, userId]);
  const remoteMark: 'X' | 'O' | null =
    localMark === 'X' ? 'O' : localMark === 'O' ? 'X' : null;

  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [winner, setWinner] = useState<Mark | 'draw'>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [localScore, setLocalScore] = useState(0);
  const [remoteScore, setRemoteScore] = useState(0);

  // Mirror current game state in a ref so the message handler can answer a
  // peer's `hello` with the latest snapshot without re-subscribing.
  const gameRef = useRef({ board, turn, winner, line: winningLine });
  useEffect(() => {
    gameRef.current = { board, turn, winner, line: winningLine };
  }, [board, turn, winner, winningLine]);

  const sendMsg = useCallback(
    (data: ArcadeMoveMessage['data']) => {
      if (opponent !== 'participant') return;
      const call = callRef.current;
      if (!call) return;
      try {
        call.sendAppMessage({ type: 'arcade_move', data } as ArcadeMoveMessage, '*');
      } catch {
        // best effort — state self-heals on the next snapshot
      }
    },
    [callRef, opponent],
  );

  const broadcastState = useCallback(
    (b: Board, t: 'X' | 'O', w: Mark | 'draw', line: number[]) => {
      sendMsg({
        gameId: 'tic-tac-toe',
        action: 'state',
        senderId: userId,
        senderName: userName,
        board: b,
        turn: t,
        winner: w,
        line,
      });
    },
    [sendMsg, userId, userName],
  );

  const broadcastReset = useCallback(() => {
    sendMsg({ gameId: 'tic-tac-toe', action: 'reset', senderId: userId, senderName: userName });
  }, [sendMsg, userId, userName]);

  // Announce presence on mount / reconnect; the peer replies with its state.
  useEffect(() => {
    if (opponent !== 'participant') return;
    sendMsg({ gameId: 'tic-tac-toe', action: 'hello', senderId: userId, senderName: userName });
  }, [opponent, sendMsg, userId, userName]);

  // Apply remote messages (hello / state / reset)
  useEffect(() => {
    if (opponent !== 'participant') return;
    const call = callRef.current;
    if (!call) return;

    const handler = (event: { data: unknown; fromId?: string }) => {
      if (!isArcadeTicTacToeMessage(event.data)) return;
      const d = event.data.data;
      if (d.senderId === userId) return;
      // Once locked onto an opponent, ignore any third participant.
      if (resolvedOpponentId && d.senderId !== resolvedOpponentId) return;
      if (!resolvedOpponentId) setResolvedOpponentId(d.senderId);
      if (d.senderName) setRemoteName(d.senderName);

      if (d.action === 'reset') {
        setBoard(Array(9).fill(null));
        setWinner(null);
        setWinningLine([]);
        setTurn('X');
        return;
      }

      if (d.action === 'hello') {
        // A peer (re)joined — reply with our authoritative snapshot so they
        // catch up to the current board, turn and result.
        const g = gameRef.current;
        broadcastState(g.board, g.turn, g.winner, g.line);
        return;
      }

      if (d.action === 'state' && Array.isArray(d.board) && d.board.length === 9) {
        const incoming = d.board as Board;
        // Adopt a snapshot at least as advanced as ours. Full snapshots make
        // the game self-healing: one dropped message is corrected by the next
        // move, and a reconnecting player is restored from the hello reply.
        if (filledCount(incoming) < filledCount(gameRef.current.board)) return;
        const prevWinner = gameRef.current.winner;
        setBoard(incoming);
        setTurn(d.turn ?? 'X');
        setWinner(d.winner ?? null);
        setWinningLine(d.line ?? []);
        // Credit the opponent's win exactly once, on the null→winner edge.
        if (!prevWinner && d.winner && d.winner !== 'draw' && d.winner === remoteMark) {
          setRemoteScore((s) => s + 1);
        }
      }
    };

    call.on('app-message', handler);
    return () => {
      call.off('app-message', handler);
    };
  }, [callRef, opponent, userId, resolvedOpponentId, remoteMark, broadcastState]);

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
    if (localMark === null) return; // handshake not complete yet
    if (turn !== localMark) return;

    const next = [...board];
    next[index] = localMark;
    const { winner: w, line } = checkWinner(next);
    const nextTurn: 'X' | 'O' = localMark === 'X' ? 'O' : 'X';
    setBoard(next);
    if (w) {
      setWinner(w);
      setWinningLine(line);
      if (w === localMark) setLocalScore((s) => s + 1);
    } else {
      setTurn(nextTurn);
    }
    // Broadcast the full resulting board so the peer can never diverge.
    broadcastState(next, w ? turn : nextTurn, w ?? null, line);
  };

  const handleReset = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setWinningLine([]);
    setTurn('X');
    broadcastReset();
  };

  const isLocalTurn = !winner && localMark !== null && turn === localMark;
  const connecting = opponent === 'participant' && localMark === null;
  const opponentLabel =
    opponent === 'computer' ? 'Computer' : remoteName || 'Your partner';
  const OpponentIcon = opponent === 'computer' ? Cpu : UserIcon;

  return (
    <div className="p-4 pb-8">
      <div className="max-w-lg mx-auto mb-5">
        <div className="rounded-2xl p-5 bg-foreground/60 border border-cg-sage/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              {opponent === 'participant' ? (
                <Users className="h-4 w-4 text-cg-sage" />
              ) : (
                <Cpu className="h-4 w-4 text-cg-sage" />
              )}
              <span>
                {connecting
                  ? 'Connecting…'
                  : winner
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
              className="flex items-center gap-1 text-xs text-cg-mist/80 hover:text-white px-2 py-1 rounded-md bg-cg-ink border border-cg-sage/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center justify-between bg-cg-ink/60 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-cg-sage" />
                <span className="text-white font-medium truncate">{userName || 'You'}</span>
              </div>
              <span className="text-cg-sage font-bold">{localScore}</span>
            </div>
            <div className="flex items-center justify-between bg-cg-ink/60 px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <OpponentIcon className="h-4 w-4 text-cg-amber" />
                <span className="text-white font-medium truncate">{opponentLabel}</span>
              </div>
              <span className="text-cg-amber font-bold">{remoteScore}</span>
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
                'bg-foreground/60 border border-cg-sage/20',
                'hover:bg-foreground disabled:hover:bg-foreground/60',
                'disabled:cursor-not-allowed',
                isWinning && 'bg-cg-sage/20 border-cg-sage/60',
              )}
              aria-label={`Cell ${idx + 1}`}
            >
              {cell === 'X' && <XIcon className="h-12 w-12 text-cg-sage" strokeWidth={3} />}
              {cell === 'O' && <Circle className="h-12 w-12 text-cg-amber" strokeWidth={3} />}
            </button>
          );
        })}
      </div>

      {winner && (
        <div className="max-w-lg mx-auto mt-5 rounded-2xl p-4 bg-cg-sage/10 border border-cg-sage/30 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-cg-amber" />
          <span className="text-white text-sm">
            {winner === 'draw'
              ? 'Nobody wins — play again?'
              : winner === localMark
                ? `Nice one! ${opponent === 'participant' ? 'Share the win with ' + opponentLabel : ''}`
                : 'Better luck next round.'}
          </span>
          <button
            onClick={handleReset}
            className="ml-auto text-xs px-3 py-1.5 rounded-lg bg-cg-sage text-white hover:bg-cg-sage/90"
          >
            Play again
          </button>
        </div>
      )}

      {onExit && (
        <div className="max-w-lg mx-auto mt-4 text-center">
          <button
            onClick={onExit}
            className="text-xs text-cg-mist/70 hover:text-white underline"
          >
            Back to arcade
          </button>
        </div>
      )}
    </div>
  );
}
