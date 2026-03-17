'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Trophy, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemoryCard {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const CARD_EMOJIS = ['🎮', '🎨', '🎭', '🎪', '🎸', '🎺', '🎹', '🎬'];

function getScores() {
  try {
    const raw = localStorage.getItem('kid_game_scores');
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveScore(moves: number) {
  const scores = getScores();
  const mem = scores.memory || { bestMoves: 0, gamesCompleted: 0 };
  mem.gamesCompleted++;
  if (mem.bestMoves === 0 || moves < mem.bestMoves) mem.bestMoves = moves;
  scores.memory = mem;
  localStorage.setItem('kid_game_scores', JSON.stringify(scores));
}

export function MemoryGame() {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isGameWon, setIsGameWon] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    const cardPairs = CARD_EMOJIS.flatMap((emoji, index) => [
      { id: index * 2, emoji, isFlipped: false, isMatched: false },
      { id: index * 2 + 1, emoji, isFlipped: false, isMatched: false },
    ]);
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsGameWon(false);
  }

  function handleCardClick(cardId: number) {
    if (
      flippedCards.length === 2 ||
      flippedCards.includes(cardId) ||
      cards[cardId].isMatched ||
      isGameWon
    ) return;

    const newCards = [...cards];
    newCards[cardId].isFlipped = true;
    setCards(newCards);

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    if (newFlippedCards.length === 2) {
      const newMoves = moves + 1;
      setMoves(newMoves);

      const [firstId, secondId] = newFlippedCards;
      if (newCards[firstId].emoji === newCards[secondId].emoji) {
        newCards[firstId].isMatched = true;
        newCards[secondId].isMatched = true;
        setCards(newCards);
        setFlippedCards([]);

        const newMatchedPairs = matchedPairs + 1;
        setMatchedPairs(newMatchedPairs);

        if (newMatchedPairs === CARD_EMOJIS.length) {
          saveScore(newMoves);
          setTimeout(() => setIsGameWon(true), 500);
        }
      } else {
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstId].isFlipped = false;
          resetCards[secondId].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
        }, 1000);
      }
    }
  }

  return (
    <div className="p-4 pb-8">
      {/* Stats Header */}
      <div className="max-w-2xl mx-auto mb-5">
        <div className="rounded-2xl p-5" style={{ background: 'var(--portal-surface, #1e293b)', border: '1px solid var(--portal-border, #334155)' }}>
          <div className="flex items-center justify-between">
            <div className="flex gap-5">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading, #fff)' }}>{moves} Moves</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading, #fff)' }}>{matchedPairs}/{CARD_EMOJIS.length} Pairs</span>
              </div>
            </div>
            <button
              onClick={initializeGame}
              className="w-10 h-10 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center transition-colors"
              aria-label="Reset game"
            >
              <RotateCcw className="w-5 h-5 text-purple-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-4 gap-3">
          {cards.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(index)}
              disabled={card.isMatched || card.isFlipped}
              className={cn(
                'aspect-square rounded-xl shadow-lg transition-all duration-300 ease-out',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
                card.isFlipped || card.isMatched
                  ? ''
                  : 'bg-gradient-to-br from-purple-600/40 to-pink-600/40 border border-purple-500/30 hover:scale-105 hover:shadow-xl active:scale-95',
                card.isMatched && 'opacity-50'
              )}
              aria-label={card.isFlipped ? `Card ${card.emoji}` : 'Hidden card'}
            >
              <div className="w-full h-full flex items-center justify-center">
                {card.isFlipped || card.isMatched ? (
                  <span className="text-4xl sm:text-5xl">{card.emoji}</span>
                ) : (
                  <div className="text-purple-300 text-3xl font-bold">?</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Win Modal */}
      {isGameWon && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="rounded-2xl shadow-2xl p-8 max-w-md w-full text-center" style={{ background: 'var(--portal-surface, #1e293b)', border: '1px solid var(--portal-border, #334155)' }}>
            <Trophy className="w-16 h-16 mx-auto text-amber-400 mb-4" />
            <h2 className="text-2xl font-black mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading, #fff)' }}>
              YOU WON!
            </h2>
            <p className="mb-6" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted, #94A3B8)' }}>
              All pairs matched in <span className="font-bold text-purple-400">{moves} moves</span>!
            </p>
            <button
              onClick={initializeGame}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:scale-105 active:scale-95 transition-all"
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
