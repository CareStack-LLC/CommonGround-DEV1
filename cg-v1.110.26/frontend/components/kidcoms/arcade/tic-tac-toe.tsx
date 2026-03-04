'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Trophy, X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = 'X' | 'O' | null;
type Board = Player[];

const WINNING_COMBINATIONS = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal top-left to bottom-right
  [2, 4, 6], // Diagonal top-right to bottom-left
];

export function TicTacToe() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [winner, setWinner] = useState<Player | 'draw'>(null);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  // Check for winner
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

    // Check for draw
    if (currentBoard.every((cell) => cell !== null)) {
      return 'draw';
    }

    return null;
  }

  // Simple AI move (random available spot or blocking move)
  function getAiMove(currentBoard: Board): number {
    // First, try to win
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        const testBoard = [...currentBoard];
        testBoard[i] = 'O';
        if (checkWinner(testBoard) === 'O') {
          return i;
        }
      }
    }

    // Second, block player from winning
    for (let i = 0; i < 9; i++) {
      if (currentBoard[i] === null) {
        const testBoard = [...currentBoard];
        testBoard[i] = 'X';
        if (checkWinner(testBoard) === 'X') {
          return i;
        }
      }
    }

    // Third, take center if available
    if (currentBoard[4] === null) {
      return 4;
    }

    // Finally, take a random available spot
    const availableSpots = currentBoard
      .map((cell, index) => (cell === null ? index : null))
      .filter((index) => index !== null) as number[];

    return availableSpots[Math.floor(Math.random() * availableSpots.length)];
  }

  // AI makes a move
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
            setAiScore(aiScore + 1);
          }
        } else {
          setIsPlayerTurn(true);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, winner, board, aiScore]);

  function handleCellClick(index: number) {
    // Prevent clicking if:
    // - Not player's turn
    // - Cell already occupied
    // - Game already won
    if (!isPlayerTurn || board[index] !== null || winner) {
      return;
    }

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);

    const gameWinner = checkWinner(newBoard);
    if (gameWinner) {
      setWinner(gameWinner);
      if (gameWinner === 'X') {
        setPlayerScore(playerScore + 1);
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

  function resetScores() {
    resetGame();
    setPlayerScore(0);
    setAiScore(0);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-6 pb-24">
      {/* Header */}
      <div className="max-w-lg mx-auto mb-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-gray-800">TIC-TAC-TOE</h1>
              <p className="text-sm text-gray-600 mt-1">
                {winner
                  ? winner === 'draw'
                    ? "It's a draw!"
                    : winner === 'X'
                    ? 'You won!'
                    : 'AI won!'
                  : isPlayerTurn
                  ? "Your turn (X)"
                  : "AI's turn (O)"}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={resetGame}
                className={cn(
                  'bg-blue-500 hover:bg-blue-600 text-white',
                  'rounded-full p-3 shadow-lg',
                  'transition-all duration-200',
                  'hover:scale-110 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300'
                )}
                aria-label="New game"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-green-700">{playerScore}</div>
              <div className="text-sm font-bold text-green-600">You (X)</div>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-4 text-center">
              <div className="text-3xl font-black text-red-700">{aiScore}</div>
              <div className="text-sm font-bold text-red-600">AI (O)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-6">
          <div className="grid grid-cols-3 gap-3">
            {board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={!isPlayerTurn || cell !== null || !!winner}
                className={cn(
                  'aspect-square rounded-2xl shadow-lg',
                  'transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300',
                  cell === null && !winner
                    ? 'bg-gradient-to-br from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 hover:scale-105 active:scale-95'
                    : 'bg-white',
                  winningLine.includes(index) && 'bg-gradient-to-br from-yellow-200 to-yellow-300'
                )}
                aria-label={`Cell ${index + 1}${cell ? `, ${cell}` : ', empty'}`}
              >
                <div className="w-full h-full flex items-center justify-center">
                  {cell === 'X' && (
                    <X className="w-16 h-16 text-blue-600 stroke-[3]" />
                  )}
                  {cell === 'O' && (
                    <Circle className="w-16 h-16 text-red-600 stroke-[3]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Win Modal */}
      {winner && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="mb-4">
              {winner === 'X' && <Trophy className="w-20 h-20 mx-auto text-yellow-500" />}
              {winner === 'O' && <Circle className="w-20 h-20 mx-auto text-red-500" />}
              {winner === 'draw' && (
                <div className="flex justify-center gap-4">
                  <X className="w-16 h-16 text-blue-500" />
                  <Circle className="w-16 h-16 text-red-500" />
                </div>
              )}
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">
              {winner === 'X' && 'YOU WON!'}
              {winner === 'O' && 'AI WON!'}
              {winner === 'draw' && "IT'S A DRAW!"}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              {winner === 'X' && 'Great job! You beat the AI!'}
              {winner === 'O' && 'Good try! Want to play again?'}
              {winner === 'draw' && 'Well played! Try again?'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={resetGame}
                className={cn(
                  'bg-gradient-to-r from-blue-500 to-purple-500',
                  'hover:from-blue-600 hover:to-purple-600',
                  'text-white font-bold text-lg',
                  'px-8 py-4 rounded-full shadow-lg',
                  'transition-all duration-200',
                  'hover:scale-105 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300'
                )}
              >
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
