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

export function MemoryGame() {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [isGameWon, setIsGameWon] = useState(false);

  // Initialize game
  useEffect(() => {
    initializeGame();
  }, []);

  function initializeGame() {
    // Create pairs of cards
    const cardPairs = CARD_EMOJIS.flatMap((emoji, index) => [
      { id: index * 2, emoji, isFlipped: false, isMatched: false },
      { id: index * 2 + 1, emoji, isFlipped: false, isMatched: false },
    ]);

    // Shuffle cards
    const shuffled = cardPairs.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatchedPairs(0);
    setIsGameWon(false);
  }

  function handleCardClick(cardId: number) {
    // Prevent clicking if:
    // - Two cards already flipped
    // - Card already flipped
    // - Card already matched
    // - Game is won
    if (
      flippedCards.length === 2 ||
      flippedCards.includes(cardId) ||
      cards[cardId].isMatched ||
      isGameWon
    ) {
      return;
    }

    // Flip the card
    const newCards = [...cards];
    newCards[cardId].isFlipped = true;
    setCards(newCards);

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    // Check for match when two cards are flipped
    if (newFlippedCards.length === 2) {
      setMoves(moves + 1);

      const [firstId, secondId] = newFlippedCards;
      const firstCard = newCards[firstId];
      const secondCard = newCards[secondId];

      if (firstCard.emoji === secondCard.emoji) {
        // Match found!
        newCards[firstId].isMatched = true;
        newCards[secondId].isMatched = true;
        setCards(newCards);
        setFlippedCards([]);

        const newMatchedPairs = matchedPairs + 1;
        setMatchedPairs(newMatchedPairs);

        // Check if game is won
        if (newMatchedPairs === CARD_EMOJIS.length) {
          setTimeout(() => setIsGameWon(true), 500);
        }
      } else {
        // No match - flip back after delay
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
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-100 to-blue-100 p-6 pb-24">
      {/* Header */}
      <div className="max-w-2xl mx-auto mb-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-800">MEMORY MATCH</h1>
              <p className="text-sm text-gray-600 mt-1">Find all the pairs!</p>
            </div>
            <button
              onClick={initializeGame}
              className={cn(
                'bg-purple-500 hover:bg-purple-600 text-white',
                'rounded-full p-3 shadow-lg',
                'transition-all duration-200',
                'hover:scale-110 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300'
              )}
              aria-label="Reset game"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-bold">{moves} Moves</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <Trophy className="w-5 h-5 text-green-500" />
              <span className="font-bold">{matchedPairs}/{CARD_EMOJIS.length} Pairs</span>
            </div>
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
                'aspect-square rounded-2xl shadow-lg',
                'transition-all duration-300 ease-out',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-300',
                card.isFlipped || card.isMatched
                  ? 'bg-white rotate-0'
                  : 'bg-gradient-to-br from-purple-400 to-pink-400 hover:scale-105',
                card.isMatched && 'opacity-60 cursor-not-allowed',
                !card.isFlipped && !card.isMatched && 'hover:shadow-xl active:scale-95'
              )}
              aria-label={card.isFlipped ? `Card ${card.emoji}` : 'Hidden card'}
            >
              <div className="w-full h-full flex items-center justify-center">
                {card.isFlipped || card.isMatched ? (
                  <span className="text-5xl">{card.emoji}</span>
                ) : (
                  <div className="text-white text-4xl">?</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Win Modal */}
      {isGameWon && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-in">
            <div className="mb-4">
              <Trophy className="w-20 h-20 mx-auto text-yellow-500" />
            </div>
            <h2 className="text-3xl font-black text-gray-800 mb-2">YOU WON!</h2>
            <p className="text-xl text-gray-600 mb-6">
              Great job! You matched all pairs in <span className="font-bold text-purple-600">{moves} moves</span>!
            </p>
            <button
              onClick={initializeGame}
              className={cn(
                'bg-gradient-to-r from-purple-500 to-pink-500',
                'hover:from-purple-600 hover:to-pink-600',
                'text-white font-bold text-lg',
                'px-8 py-4 rounded-full shadow-lg',
                'transition-all duration-200',
                'hover:scale-105 active:scale-95',
                'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300'
              )}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
