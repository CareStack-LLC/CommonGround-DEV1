'use client';

import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Trophy, X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 'X' | 'O' | null;
type Board = Player[];

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function getScores() {
  try {
    const raw = localStorage.getItem('kid_game_scores');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveScore(result: 'win' | 'loss' | 'draw') {
  const scores = getScores();
  const ttt = scores.tictactoe || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0 };
  ttt.gamesPlayed++;
  if (result === 'win') ttt.wins++;
  else if (result === 'loss') ttt.losses++;
  else ttt.draws++;
  scores.tictactoe = ttt;
  localStorage.setItem('kid_game_scores', JSON.stringify(scores));
}

export function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  function checkWinner(currentBoard: Board): Player | 'draw' | null {
    for (const combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      if (
        currentBoard[a] &&
        currentBoard[a] === currentBoard[b] &&
        currentBoard[a] === currentBoard[c]
      ) {
        setWinningLine(combination);
        return currentBoard[a];
      }
    }
    if (currentBoard.every((cell) => cell !== null)) return 'draw';
    return null;
  }

  const getAiMove = useCallback((currentBoard: Board): number => {
    // Try to win
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        const test = [...currentBoard];
        test[i] = 'O';
        for (const [a, b, c] of WINNING_COMBINATIONS) {
          if (test[a] && test[a] === test[b] && test[a] === test[c]) return i;
        }
      }
    }
    // Block player
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        const test = [...currentBoard];
        test[i] = 'X';
        for (const [a, b, c] of WINNING_COMBINATIONS) {
          if (test[a] && test[a] === test[b] && test[a] === test[c]) return i;
        }
      }
    }
    // Center
    if (currentBoard[4] === null) return 4;
    // Random
    const available = currentBoard.map((c, i) => c === null ? i : -1).filter(i => i >= 0);
    return available[Math.floor(Math.random() * available.length)];
  }, []);

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        const aiMoveIndex = getAiMove(board);
        const newBoard = [...board];
        newBoard[aiMoveIndex] = 'O';
        setBoard(newBoard);

        const gameWinner = checkWinner(newBoard);
        if (gameWinner) {
          setWinner(gameWinner);
          if (gameWinner === 'O') {
            setAiScore(prev => prev + 1);
            saveScore('loss');
          } else if (gameWinner === 'draw') {
            saveScore('draw');
          }
        } else {
          setIsPlayerTurn(true);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, winner, board, getAiMove]);

  function handleCellClick(index: number) {
    if (!isPlayerTurn || board[index] !== null || winner) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner === 'X') {
        setPlayerScore(prev => prev + 1);
        saveScore('win');
      } else if (gameWinner === 'draw') {
        saveScore('draw');
      }
    } else {
      setIsPlayerTurn(false);
    }
  }

  function resetGame() {
    setBoard(Array(9).fill(null));
    setIsPlayerTurn(true);
    setWinner(null);
    setWinningLine([]);
  }

  return (
    <div className="p-4 pb-8">
      {/* Score + Status */}
      <div className="max-w-lg mx-auto mb-5">
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-300 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              {winner
                ? winner === 'draw' ? "It's a draw!" : winner === 'X' ? 'You won!' : 'AI won!'
                : isPlayerTurn ? "Your turn (X)" : "AI thinking..."}
            </p>
            <button
              onClick={resetGame}
              className="w-10 h-10 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 flex items-center justify-center transition-colors"
              aria-label="New game"
            >
              <RotateCcw className="w-5 h-5 text-cyan-400" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{playerScore}</div>
              <div className="text-xs font-semibold text-emerald-400/70" style={{ fontFamily: 'Inter, sans-serif' }}>You (X)</div>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-400" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{aiScore}</div>
              <div className="text-xs font-semibold text-red-400/70" style={{ fontFamily: 'Inter, sans-serif' }}>AI (O)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="max-w-lg mx-auto">
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-5">
          <div className="grid grid-cols-3 gap-3">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!isPlayerTurn || cell !== null || !!winner}
                className={cn(
                  'aspect-square rounded-xl transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
                  cell === null && !winner
                    ? 'bg-slate-700/60 hover:bg-slate-600/60 hover:scale-105 active:scale-95 cursor-pointer'
                    : 'bg-slate-700/40',
                  winningLine.includes(index) && 'bg-amber-500/20 border-2 border-amber-400/50'
                )}
                aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ', empty'}`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  {cell === 'X' && <X className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400 stroke-[3]" />}
                  {cell === 'O' && <Circle className="w-12 h-12 sm:w-16 sm:h-16 text-red-400 stroke-[3]" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Win Modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="mb-4">
              {winner === 'X' && <Trophy className="w-16 h-16 mx-auto text-amber-400" />}
              {winner === 'O' && <Circle className="w-16 h-16 mx-auto text-red-400" />}
              {winner === 'draw' && (
                <div className="flex justify-center gap-3">
                  <X className="w-14 h-14 text-cyan-400" />
                  <Circle className="w-14 h-14 text-red-400" />
                </div>
              )}
            </div>
            <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {winner === 'X' && 'YOU WON!'}
              {winner === 'O' && 'AI WON!'}
              {winner === 'draw' && "IT'S A DRAW!"}
            </h2>
            <p className="text-slate-400 mb-6" style={{ fontFamily: 'Inter, sans-serif' }}>
              {winner === 'X' && 'Great job! You beat the AI!'}
              {winner === 'O' && 'Good try! Want to play again?'}
              {winner === 'draw' && 'Well played! Try again?'}
            </p>
            <button
              onClick={resetGame}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
