'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'

// ============================================
// THEATER PAGE - Watch Movies Together
// Gaming-style UI for kids ages 5-12
// ============================================

// Floating popcorn and movie decorations
function FloatingDecorations() {
  const decorations = ['🍿', '🎬', '🎞️', '🎥', '⭐', '🌟', '🎭', '🍫', '🥤']

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {decorations.map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
            y: -50,
            rotate: 0,
            opacity: 0.6
          }}
          animate={{
            y: typeof window !== 'undefined' ? window.innerHeight + 100 : 900,
            rotate: 360,
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 15 + Math.random() * 10,
            repeat: Infinity,
            delay: i * 2,
            ease: "linear"
          }}
        >
          {emoji}
        </motion.div>
      ))}
    </div>
  )
}

// Movie card component
interface Movie {
  id: string
  title: string
  poster: string
  duration: string
  rating: string
  genre: string
  isNew?: boolean
  isFavorite?: boolean
}

function MovieCard({
  movie,
  onWatch,
  onFavorite,
  delay = 0
}: {
  movie: Movie
  onWatch: () => void
  onFavorite: () => void
  delay?: number
}) {
  const genreColors: Record<string, string> = {
    'Adventure': 'from-orange-400 to-amber-500',
    'Comedy': 'from-yellow-400 to-orange-500',
    'Animation': 'from-pink-400 to-purple-500',
    'Fantasy': 'from-purple-400 to-indigo-500',
    'Musical': 'from-rose-400 to-pink-500',
    'Family': 'from-teal-400 to-cyan-500',
  }

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
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.98 }}
      className="relative group cursor-pointer"
      onClick={onWatch}
    >
      {/* Movie poster */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl">
        {/* Gradient poster placeholder */}
        <div className={`w-full aspect-[2/3] bg-gradient-to-br ${genreColors[movie.genre] || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
          <span className="text-8xl">{movie.poster}</span>
        </div>

        {/* Overlay on hover */}
        <motion.div
          className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl"
          >
            <span className="text-4xl ml-1">▶️</span>
          </motion.button>
        </motion.div>

        {/* New badge */}
        {movie.isNew && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: delay + 0.2, type: "spring" }}
            className="absolute top-3 left-3 px-3 py-1 bg-red-500 text-white text-sm font-bold rounded-full shadow-lg"
          >
            NEW!
          </motion.div>
        )}

        {/* Favorite button */}
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          onClick={(e) => {
            e.stopPropagation()
            onFavorite()
          }}
          className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg"
        >
          <span className="text-2xl">{movie.isFavorite ? '❤️' : '🤍'}</span>
        </motion.button>

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 px-3 py-1 bg-black/70 text-white text-sm font-bold rounded-full">
          {movie.duration}
        </div>
      </div>

      {/* Movie info */}
      <div className="mt-4 px-2">
        <h3 className="text-xl font-bold text-white truncate">{movie.title}</h3>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-yellow-400">⭐ {movie.rating}</span>
          <span className="text-white/60">•</span>
          <span className="text-white/80">{movie.genre}</span>
        </div>
      </div>
    </motion.div>
  )
}

// Watch party invite modal
function WatchPartyModal({
  movie,
  onClose,
  onStart
}: {
  movie: Movie | null
  onClose: () => void
  onStart: (contacts: string[]) => void
}) {
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])

  const contacts = [
    { id: '1', name: 'Mom', emoji: '👩', online: true },
    { id: '2', name: 'Dad', emoji: '👨', online: true },
    { id: '3', name: 'Grandma', emoji: '👵', online: false },
    { id: '4', name: 'Grandpa', emoji: '👴', online: true },
  ]

  if (!movie) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 50 }}
        className="w-full max-w-lg bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 rounded-[2rem] p-8 shadow-2xl border-4 border-purple-400/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-6xl">{movie.poster}</span>
          <h2 className="text-2xl font-black text-white mt-4">Watch Party!</h2>
          <p className="text-purple-200 mt-2">Who do you want to watch "{movie.title}" with?</p>
        </div>

        {/* Contact selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {contacts.map((contact) => (
            <motion.button
              key={contact.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (selectedContacts.includes(contact.id)) {
                  setSelectedContacts(selectedContacts.filter(id => id !== contact.id))
                } else {
                  setSelectedContacts([...selectedContacts, contact.id])
                }
              }}
              className={`relative p-4 rounded-2xl border-3 transition-all ${
                selectedContacts.includes(contact.id)
                  ? 'bg-purple-500/50 border-purple-300'
                  : 'bg-white/10 border-transparent'
              } ${!contact.online ? 'opacity-50' : ''}`}
              disabled={!contact.online}
            >
              <div className="text-4xl mb-2">{contact.emoji}</div>
              <div className="text-white font-bold">{contact.name}</div>
              <div className={`text-sm ${contact.online ? 'text-green-400' : 'text-gray-400'}`}>
                {contact.online ? '🟢 Online' : '⚫ Offline'}
              </div>
              {selectedContacts.includes(contact.id) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-white text-lg">✓</span>
                </motion.div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex-1 py-4 bg-white/20 text-white font-bold rounded-2xl"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onStart(selectedContacts)}
            disabled={selectedContacts.length === 0}
            className={`flex-1 py-4 font-bold rounded-2xl shadow-lg ${
              selectedContacts.length > 0
                ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                : 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
            }`}
          >
            {selectedContacts.length > 0 ? '🎬 Start Watch Party!' : 'Select Someone'}
          </motion.button>
        </div>

        {/* Solo watch option */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onStart([])}
          className="w-full mt-4 py-3 text-purple-200 hover:text-white transition-colors"
        >
          Or watch by myself →
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// Video player component
function VideoPlayer({
  movie,
  watchParty,
  onClose
}: {
  movie: Movie
  watchParty: string[]
  onClose: () => void
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)

  // Simulate video progress
  useEffect(() => {
    if (isPlaying && progress < 100) {
      const timer = setTimeout(() => setProgress(p => p + 1), 500)
      return () => clearTimeout(timer)
    }
  }, [isPlaying, progress])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      {/* Video area */}
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Placeholder for video */}
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-center"
          >
            <span className="text-[150px]">{movie.poster}</span>
            <h2 className="text-4xl font-black text-white mt-4">{movie.title}</h2>
            {!isPlaying && (
              <p className="text-xl text-gray-400 mt-2">Press play to start!</p>
            )}
          </motion.div>
        </div>

        {/* Watch party participants */}
        {watchParty.length > 0 && (
          <div className="absolute top-4 right-4 flex gap-2">
            {watchParty.map((id, i) => (
              <motion.div
                key={id}
                initial={{ scale: 0, x: 20 }}
                animate={{ scale: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-14 h-14 rounded-full bg-purple-500 border-3 border-white flex items-center justify-center"
              >
                <span className="text-2xl">
                  {id === '1' ? '👩' : id === '2' ? '👨' : id === '3' ? '👵' : '👴'}
                </span>
              </motion.div>
            ))}
            <div className="ml-2 px-4 py-2 bg-green-500/90 rounded-full text-white font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              Watching Together!
            </div>
          </div>
        )}

        {/* Close button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm"
        >
          <span className="text-2xl">✕</span>
        </motion.button>

        {/* Video controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
          {/* Progress bar */}
          <div className="w-full h-2 bg-white/30 rounded-full mb-4 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center"
            >
              <span className="text-2xl">⏪</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-xl"
            >
              <span className="text-4xl">{isPlaying ? '⏸️' : '▶️'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center"
            >
              <span className="text-2xl">⏩</span>
            </motion.button>
          </div>

          {/* Time display */}
          <div className="text-center mt-4 text-white/80">
            0:{progress.toString().padStart(2, '0')} / {movie.duration}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Category tabs
function CategoryTabs({
  selected,
  onSelect
}: {
  selected: string
  onSelect: (category: string) => void
}) {
  const categories = [
    { id: 'all', label: 'All Movies', emoji: '🎬' },
    { id: 'favorites', label: 'Favorites', emoji: '❤️' },
    { id: 'new', label: 'New', emoji: '✨' },
    { id: 'adventure', label: 'Adventure', emoji: '🏔️' },
    { id: 'comedy', label: 'Comedy', emoji: '😂' },
    { id: 'animation', label: 'Animation', emoji: '🎨' },
  ]

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
      {categories.map((cat, i) => (
        <motion.button
          key={cat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(cat.id)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold whitespace-nowrap transition-all ${
            selected === cat.id
              ? 'bg-white text-purple-900 shadow-lg'
              : 'bg-white/20 text-white hover:bg-white/30'
          }`}
        >
          <span>{cat.emoji}</span>
          <span>{cat.label}</span>
        </motion.button>
      ))}
    </div>
  )
}

// Main Theater Page
export default function TheaterPage() {
  const router = useRouter()
  const [category, setCategory] = useState('all')
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [showWatchParty, setShowWatchParty] = useState(false)
  const [watchingMovie, setWatchingMovie] = useState<Movie | null>(null)
  const [watchPartyMembers, setWatchPartyMembers] = useState<string[]>([])

  // Sample movies data
  const [movies, setMovies] = useState<Movie[]>([
    { id: '1', title: 'Space Rangers', poster: '🚀', duration: '1:32', rating: '4.8', genre: 'Adventure', isNew: true, isFavorite: false },
    { id: '2', title: 'Silly Penguins', poster: '🐧', duration: '1:15', rating: '4.9', genre: 'Comedy', isNew: true, isFavorite: true },
    { id: '3', title: 'Magic Kingdom', poster: '🏰', duration: '1:45', rating: '4.7', genre: 'Fantasy', isNew: false, isFavorite: true },
    { id: '4', title: 'Ocean Friends', poster: '🐠', duration: '1:28', rating: '4.6', genre: 'Animation', isNew: false, isFavorite: false },
    { id: '5', title: 'Dino World', poster: '🦕', duration: '1:38', rating: '4.8', genre: 'Adventure', isNew: true, isFavorite: false },
    { id: '6', title: 'Robot Dance', poster: '🤖', duration: '1:22', rating: '4.5', genre: 'Musical', isNew: false, isFavorite: false },
    { id: '7', title: 'Puppy Pals', poster: '🐕', duration: '1:18', rating: '4.9', genre: 'Family', isNew: false, isFavorite: true },
    { id: '8', title: 'Super Kitty', poster: '🐱', duration: '1:25', rating: '4.7', genre: 'Comedy', isNew: false, isFavorite: false },
  ])

  // Filter movies based on category
  const filteredMovies = movies.filter(movie => {
    if (category === 'all') return true
    if (category === 'favorites') return movie.isFavorite
    if (category === 'new') return movie.isNew
    return movie.genre.toLowerCase() === category
  })

  const handleWatch = (movie: Movie) => {
    setSelectedMovie(movie)
    setShowWatchParty(true)
  }

  const handleFavorite = (movieId: string) => {
    setMovies(movies.map(m =>
      m.id === movieId ? { ...m, isFavorite: !m.isFavorite } : m
    ))
  }

  const handleStartWatchParty = (contacts: string[]) => {
    if (selectedMovie) {
      setWatchPartyMembers(contacts)
      setWatchingMovie(selectedMovie)
      setShowWatchParty(false)
      setSelectedMovie(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900 relative overflow-hidden">
      {/* Floating decorations */}
      <FloatingDecorations />

      {/* Main content */}
      <div className="relative z-10 px-6 py-8 max-w-7xl mx-auto">
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
              <h1 className="text-4xl font-black text-white">Theater</h1>
              <p className="text-purple-200">Watch movies with family!</p>
            </div>
          </div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl"
          >
            🎬
          </motion.div>
        </motion.div>

        {/* Category tabs */}
        <CategoryTabs selected={category} onSelect={setCategory} />

        {/* Movies grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {filteredMovies.map((movie, i) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onWatch={() => handleWatch(movie)}
              onFavorite={() => handleFavorite(movie.id)}
              delay={i * 0.1}
            />
          ))}
        </div>

        {/* Empty state */}
        {filteredMovies.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20"
          >
            <span className="text-8xl">🎞️</span>
            <h3 className="text-2xl font-bold text-white mt-4">No movies here yet!</h3>
            <p className="text-purple-200 mt-2">Check back soon for more awesome movies!</p>
          </motion.div>
        )}
      </div>

      {/* Watch party modal */}
      <AnimatePresence>
        {showWatchParty && (
          <WatchPartyModal
            movie={selectedMovie}
            onClose={() => {
              setShowWatchParty(false)
              setSelectedMovie(null)
            }}
            onStart={handleStartWatchParty}
          />
        )}
      </AnimatePresence>

      {/* Video player */}
      <AnimatePresence>
        {watchingMovie && (
          <VideoPlayer
            movie={watchingMovie}
            watchParty={watchPartyMembers}
            onClose={() => {
              setWatchingMovie(null)
              setWatchPartyMembers([])
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
