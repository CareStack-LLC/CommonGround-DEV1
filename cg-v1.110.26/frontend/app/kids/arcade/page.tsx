'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// ============================================
// ARCADE PAGE - Play Games!
// Gaming-style UI for kids ages 5-12
// ============================================

// Floating game elements
function FloatingGameElements() {
  const elements = ['🎮', '🕹️', '👾', '🎯', '🏆', '⭐', '💎', '🎪', '🎰']

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {elements.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
          }}
          animate={{
            y: [null, Math.random() * 100 - 50],
            x: [null, Math.random() * 100 - 50],
            rotate: [0, 360],
          }}
          transition={{
            duration: 10 + Math.random() * 5,
            repeat: Infinity,
            repeatType: "reverse",
            delay: i * 0.5,
          }}
          style={{ opacity: 0.4 }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  )
}

// Game card component
interface Game {
  id: string
  title: string
  icon: string
  color: string
  shadowColor: string
  description: string
  highScore: number
  isNew?: boolean
  isMultiplayer?: boolean
}

function GameCard({
  game,
  onPlay,
  delay = 0
}: {
  game: Game
  onPlay: () => void
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      whileHover={{ scale: 1.05, y: -10 }}
      whileTap={{ scale: 0.98 }}
      onClick={onPlay}
      className="relative cursor-pointer"
    >
      {/* Main card */}
      <div
        className={`relative rounded-3xl p-6 ${game.color} shadow-xl`}
        style={{ boxShadow: `0 10px 0 ${game.shadowColor}` }}
      >
        {/* Game icon */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-7xl text-center mb-4"
        >
          {game.icon}
        </motion.div>

        {/* Game title */}
        <h3 className="text-xl font-black text-white text-center mb-2">
          {game.title}
        </h3>

        {/* Description */}
        <p className="text-white/80 text-center text-sm mb-4">
          {game.description}
        </p>

        {/* High score */}
        <div className="flex items-center justify-center gap-2 bg-white/20 rounded-xl py-2 px-4">
          <span className="text-[#F5A623]">🏆</span>
          <span className="text-white font-bold">High Score: {game.highScore}</span>
        </div>

        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {game.isNew && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2, type: "spring" }}
              className="px-3 py-1 bg-[#C53030] text-white text-xs font-bold rounded-full shadow-lg"
            >
              NEW!
            </motion.div>
          )}
          {game.isMultiplayer && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.3, type: "spring" }}
              className="px-3 py-1 bg-[#2D6A8F] text-white text-xs font-bold rounded-full shadow-lg"
            >
              2 PLAYERS
            </motion.div>
          )}
        </div>

        {/* Play button overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          className="absolute inset-0 bg-black/30 rounded-3xl flex items-center justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="px-8 py-4 bg-white rounded-2xl font-black text-xl text-gray-900 shadow-xl"
          >
            PLAY! 🎮
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// Simple Memory Game
function MemoryGame({ onClose, onScore }: { onClose: () => void, onScore: (score: number) => void }) {
  const emojis = ['🐶', '🐱', '🐰', '🦊', '🐻', '🐼', '🐸', '🦁']
  const [cards, setCards] = useState<{ id: number, emoji: string, flipped: boolean, matched: boolean }[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [moves, setMoves] = useState(0)
  const [gameWon, setGameWon] = useState(false)

  // Initialize game
  useEffect(() => {
    const shuffled = [...emojis, ...emojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }))
    setCards(shuffled)
  }, [])

  const handleCardClick = (id: number) => {
    if (flippedCards.length === 2) return
    if (cards[id].flipped || cards[id].matched) return

    const newCards = [...cards]
    newCards[id].flipped = true
    setCards(newCards)
    setFlippedCards([...flippedCards, id])
  }

  // Check for matches
  useEffect(() => {
    if (flippedCards.length === 2) {
      setMoves(m => m + 1)
      const [first, second] = flippedCards

      if (cards[first].emoji === cards[second].emoji) {
        setTimeout(() => {
          const newCards = [...cards]
          newCards[first].matched = true
          newCards[second].matched = true
          setCards(newCards)
          setFlippedCards([])

          // Check win
          if (newCards.every(c => c.matched)) {
            setGameWon(true)
            onScore(Math.max(0, 100 - moves * 5))
          }
        }, 500)
      } else {
        setTimeout(() => {
          const newCards = [...cards]
          newCards[first].flipped = false
          newCards[second].flipped = false
          setCards(newCards)
          setFlippedCards([])
        }, 1000)
      }
    }
  }, [flippedCards, cards, moves, onScore])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-[#E09520] via-[#2D6A8F] to-[#2D6A8F] z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center"
        >
          ✕
        </motion.button>
        <div className="text-white text-xl font-bold">
          Moves: {moves}
        </div>
        <div className="w-12" />
      </div>

      {/* Game title */}
      <div className="text-center mb-4">
        <h2 className="text-4xl font-black text-white">🧠 Memory Match!</h2>
        <p className="text-white/80">Find all the pairs!</p>
      </div>

      {/* Game grid */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-4 gap-3 max-w-md">
          {cards.map((card) => (
            <motion.button
              key={card.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(card.id)}
              className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl text-4xl flex items-center justify-center shadow-lg transition-all ${
                card.flipped || card.matched
                  ? 'bg-white'
                  : 'bg-gradient-to-br from-[#F5A623] to-[#F5A623]'
              } ${card.matched ? 'opacity-50' : ''}`}
            >
              {(card.flipped || card.matched) ? card.emoji : '❓'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Win modal */}
      <AnimatePresence>
        {gameWon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white rounded-3xl p-8 text-center mx-4"
            >
              <span className="text-8xl">🎉</span>
              <h2 className="text-3xl font-black text-gray-900 mt-4">You Won!</h2>
              <p className="text-gray-600 mt-2">Completed in {moves} moves!</p>
              <p className="text-2xl font-bold text-[#2D6A8F] mt-2">
                Score: {Math.max(0, 100 - moves * 5)} points!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-6 px-8 py-4 bg-gradient-to-r from-[#F5A623] to-[#2D6A8F] text-white font-bold rounded-2xl"
              >
                Back to Arcade
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Simple Catch Game
function CatchGame({ onClose, onScore }: { onClose: () => void, onScore: (score: number) => void }) {
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [items, setItems] = useState<{ id: number, x: number, emoji: string, speed: number }[]>([])
  const [gameOver, setGameOver] = useState(false)

  const goodItems = ['⭐', '💎', '🍎', '🍕', '🎁']
  const badItems = ['💣', '👻']

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !gameOver) {
      const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      setGameOver(true)
      onScore(score)
    }
  }, [timeLeft, gameOver, score, onScore])

  // Spawn items
  useEffect(() => {
    if (gameOver) return
    const spawner = setInterval(() => {
      const isGood = Math.random() > 0.2
      const newItem = {
        id: Date.now(),
        x: Math.random() * 80 + 10,
        emoji: isGood
          ? goodItems[Math.floor(Math.random() * goodItems.length)]
          : badItems[Math.floor(Math.random() * badItems.length)],
        speed: 2 + Math.random() * 3
      }
      setItems(prev => [...prev, newItem])
    }, 800)
    return () => clearInterval(spawner)
  }, [gameOver])

  // Remove items that fall off screen
  useEffect(() => {
    const cleaner = setInterval(() => {
      setItems(prev => prev.filter(item => {
        const el = document.getElementById(`item-${item.id}`)
        if (!el) return false
        const rect = el.getBoundingClientRect()
        return rect.top < window.innerHeight + 100
      }))
    }, 1000)
    return () => clearInterval(cleaner)
  }, [])

  const handleCatch = (item: { id: number, emoji: string }) => {
    if (badItems.includes(item.emoji)) {
      setScore(s => Math.max(0, s - 10))
    } else {
      setScore(s => s + 10)
    }
    setItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-[#4BA8C8] via-[#2D6A8F] to-[#2D6A8F] z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center"
        >
          ✕
        </motion.button>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/20 rounded-full text-white font-bold">
            ⏰ {timeLeft}s
          </div>
          <div className="px-4 py-2 bg-[#F5A623] rounded-full text-[#1E3A4A] font-bold">
            ⭐ {score}
          </div>
        </div>
        <div className="w-12" />
      </div>

      {/* Game title */}
      <div className="absolute top-20 left-0 right-0 text-center">
        <h2 className="text-3xl font-black text-white">🎯 Catch the Stars!</h2>
        <p className="text-white/80">Tap the good items, avoid the bombs!</p>
      </div>

      {/* Falling items */}
      {items.map((item) => (
        <motion.button
          key={item.id}
          id={`item-${item.id}`}
          initial={{ y: -50 }}
          animate={{ y: '100vh' }}
          transition={{ duration: item.speed, ease: "linear" }}
          onClick={() => handleCatch(item)}
          className="absolute text-5xl"
          style={{ left: `${item.x}%` }}
        >
          {item.emoji}
        </motion.button>
      ))}

      {/* Game over modal */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white rounded-3xl p-8 text-center mx-4"
            >
              <span className="text-8xl">🎮</span>
              <h2 className="text-3xl font-black text-gray-900 mt-4">Time's Up!</h2>
              <p className="text-2xl font-bold text-[#2D6A8F] mt-2">
                Score: {score} points!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-6 px-8 py-4 bg-gradient-to-r from-[#2D6A8F] to-[#2D6A8F] text-white font-bold rounded-2xl"
              >
                Back to Arcade
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Color Match Game
function ColorMatchGame({ onClose, onScore }: { onClose: () => void, onScore: (score: number) => void }) {
  const colors = [
    { name: 'Red', color: 'bg-[#C53030]' },
    { name: 'Blue', color: 'bg-[#2D6A8F]' },
    { name: 'Green', color: 'bg-[#3DAA8A]' },
    { name: 'Yellow', color: 'bg-[#F5A623]' },
    { name: 'Purple', color: 'bg-[#2D6A8F]' },
    { name: 'Orange', color: 'bg-[#F5A623]' },
  ]

  const [score, setScore] = useState(0)
  const [round, setRound] = useState(1)
  const [currentColor, setCurrentColor] = useState(colors[0])
  const [displayColor, setDisplayColor] = useState(colors[0])
  const [gameOver, setGameOver] = useState(false)
  const [streak, setStreak] = useState(0)

  const generateRound = useCallback(() => {
    const textColor = colors[Math.floor(Math.random() * colors.length)]
    // 50% chance the display color matches the text
    const shouldMatch = Math.random() > 0.5
    const bgColor = shouldMatch
      ? textColor
      : colors.filter(c => c.name !== textColor.name)[Math.floor(Math.random() * (colors.length - 1))]

    setCurrentColor(textColor)
    setDisplayColor(bgColor)
  }, [])

  useEffect(() => {
    generateRound()
  }, [round, generateRound])

  const handleAnswer = (matches: boolean) => {
    const correct = (currentColor.name === displayColor.name) === matches

    if (correct) {
      setScore(s => s + 10 + streak * 2)
      setStreak(s => s + 1)
      if (round < 10) {
        setRound(r => r + 1)
      } else {
        setGameOver(true)
        onScore(score + 10 + streak * 2)
      }
    } else {
      setStreak(0)
      if (round < 10) {
        setRound(r => r + 1)
      } else {
        setGameOver(true)
        onScore(score)
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-[#2D6A8F] via-[#2D6A8F] to-fuchsia-600 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center"
        >
          ✕
        </motion.button>
        <div className="flex gap-4">
          <div className="px-4 py-2 bg-white/20 rounded-full text-white font-bold">
            Round {round}/10
          </div>
          <div className="px-4 py-2 bg-[#F5A623] rounded-full text-[#1E3A4A] font-bold">
            ⭐ {score}
          </div>
        </div>
        <div className="w-12" />
      </div>

      {/* Game area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-white mb-2">🎨 Color Match!</h2>
        <p className="text-white/80 mb-8">Does the color match the word?</p>

        {/* Color display */}
        <motion.div
          key={round}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`w-48 h-48 rounded-3xl ${displayColor.color} flex items-center justify-center shadow-2xl mb-8`}
        >
          <span className="text-4xl font-black text-white drop-shadow-lg">
            {currentColor.name}
          </span>
        </motion.div>

        {/* Streak indicator */}
        {streak > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-[#F5A623] font-bold mb-4"
          >
            🔥 {streak} streak!
          </motion.div>
        )}

        {/* Answer buttons */}
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(true)}
            className="px-8 py-4 bg-[#3DAA8A] text-white font-bold rounded-2xl shadow-lg text-xl"
          >
            ✓ MATCH
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAnswer(false)}
            className="px-8 py-4 bg-[#C53030] text-white font-bold rounded-2xl shadow-lg text-xl"
          >
            ✕ NO MATCH
          </motion.button>
        </div>
      </div>

      {/* Game over modal */}
      <AnimatePresence>
        {gameOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white rounded-3xl p-8 text-center mx-4"
            >
              <span className="text-8xl">🎨</span>
              <h2 className="text-3xl font-black text-gray-900 mt-4">Great Job!</h2>
              <p className="text-2xl font-bold text-[#2D6A8F] mt-2">
                Final Score: {score} points!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="mt-6 px-8 py-4 bg-gradient-to-r from-[#2D6A8F] to-[#2D6A8F] text-white font-bold rounded-2xl"
              >
                Back to Arcade
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// Main Arcade Page
export default function ArcadePage() {
  const router = useRouter()
  const [activeGame, setActiveGame] = useState<string | null>(null)
  const [games, setGames] = useState<Game[]>([
    {
      id: 'memory',
      title: 'Memory Match',
      icon: '🧠',
      color: 'bg-gradient-to-br from-[#F5A623] to-[#E09520]',
      shadowColor: '#9B2C2C',
      description: 'Match the pairs!',
      highScore: 85,
      isNew: false
    },
    {
      id: 'catch',
      title: 'Star Catcher',
      icon: '⭐',
      color: 'bg-gradient-to-br from-[#2D6A8F] to-[#2D6A8F]',
      shadowColor: '#1E4E6B',
      description: 'Catch falling stars!',
      highScore: 120,
      isNew: true
    },
    {
      id: 'color',
      title: 'Color Match',
      icon: '🎨',
      color: 'bg-gradient-to-br from-[#2D6A8F] to-[#2D6A8F]',
      shadowColor: '#1E4E6B',
      description: 'Match colors fast!',
      highScore: 95,
      isNew: false
    },
    {
      id: 'puzzle',
      title: 'Puzzle Time',
      icon: '🧩',
      color: 'bg-gradient-to-br from-[#F5A623] to-[#E09520]',
      shadowColor: '#E09520',
      description: 'Solve fun puzzles!',
      highScore: 0,
      isNew: true,
      isMultiplayer: true
    },
    {
      id: 'quiz',
      title: 'Trivia Quest',
      icon: '❓',
      color: 'bg-gradient-to-br from-[#3DAA8A] to-[#2D8A70]',
      shadowColor: '#2D8A70',
      description: 'Test your knowledge!',
      highScore: 75,
      isMultiplayer: true
    },
    {
      id: 'draw',
      title: 'Doodle Dash',
      icon: '✏️',
      color: 'bg-gradient-to-br from-[#C53030] to-[#E09520]',
      shadowColor: '#9B2C2C',
      description: 'Draw and guess!',
      highScore: 50,
      isMultiplayer: true
    },
  ])

  const handleScore = (gameId: string, score: number) => {
    setGames(games.map(g =>
      g.id === gameId && score > g.highScore
        ? { ...g, highScore: score }
        : g
    ))
  }

  const [comingSoonId, setComingSoonId] = useState<string | null>(null)

  const handlePlay = (gameId: string) => {
    if (['memory', 'catch', 'color'].includes(gameId)) {
      setActiveGame(gameId)
    } else {
      // Show "Coming Soon" toast briefly
      setComingSoonId(gameId)
      setTimeout(() => setComingSoonId(null), 2000)
    }
  }

  // Total high score
  const totalHighScore = games.reduce((sum, g) => sum + g.highScore, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5A623] via-[#C53030] to-[#E09520] relative overflow-hidden">
      {/* Floating elements */}
      <FloatingGameElements />

      {/* Main content */}
      <div className="relative z-10 px-6 py-8 max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => router.push('/kids')}
              className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
            >
              <span className="text-2xl">←</span>
            </motion.button>
            <div>
              <h1 className="text-4xl font-black text-white">Arcade</h1>
              <p className="text-[#FEF7ED]">Play awesome games!</p>
            </div>
          </div>

          {/* Total score badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="bg-[#F5A623] px-6 py-3 rounded-2xl shadow-lg"
          >
            <div className="text-[#1E3A4A] font-bold text-sm">TOTAL SCORE</div>
            <div className="text-[#1E3A4A] font-black text-2xl flex items-center gap-2">
              <span>🏆</span> {totalHighScore}
            </div>
          </motion.div>
        </motion.div>

        {/* Games grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, i) => (
            <GameCard
              key={game.id}
              game={game}
              onPlay={() => handlePlay(game.id)}
              delay={i * 0.1}
            />
          ))}
        </div>

        {/* Coming Soon toast */}
        <AnimatePresence>
          {comingSoonId && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-2xl flex items-center gap-3"
            >
              <span className="text-3xl">🎮</span>
              <div>
                <p className="font-bold text-gray-900">Coming Soon!</p>
                <p className="text-sm text-gray-500">This game is being built</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bonus message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 text-center"
        >
          <div className="inline-block bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4">
            <p className="text-white font-bold">
              🎁 Play every day for bonus points!
            </p>
          </div>
        </motion.div>
      </div>

      {/* Active games */}
      <AnimatePresence>
        {activeGame === 'memory' && (
          <MemoryGame
            onClose={() => setActiveGame(null)}
            onScore={(score) => handleScore('memory', score)}
          />
        )}
        {activeGame === 'catch' && (
          <CatchGame
            onClose={() => setActiveGame(null)}
            onScore={(score) => handleScore('catch', score)}
          />
        )}
        {activeGame === 'color' && (
          <ColorMatchGame
            onClose={() => setActiveGame(null)}
            onScore={(score) => handleScore('color', score)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
