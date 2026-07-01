'use client'

import { useState, useEffect, useRef } from 'react'
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Movie card component
interface Movie {
  id: string
  title: string
  poster: string
  duration: string
  rating: string
  genre: string
  video_url?: string
  poster_url?: string
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
    'Adventure': 'from-[#F5A623] to-[#F5A623]',
    'Comedy': 'from-[#F5A623] to-[#F5A623]',
    'Animation': 'from-[#F5A623] to-[#2D6A8F]',
    'Fantasy': 'from-[#4BA8C8] to-[#2D6A8F]',
    'Musical': 'from-[#F5A623] to-[#F5A623]',
    'Family': 'from-teal-400 to-[#2D6A8F]',
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
        {/* Movie poster — real image or gradient fallback */}
        {movie.poster_url ? (
          <img src={movie.poster_url} alt={movie.title} className="w-full aspect-[2/3] object-cover" />
        ) : (
          <div className={`w-full aspect-[2/3] bg-gradient-to-br ${genreColors[movie.genre] || 'from-gray-400 to-gray-600'} flex items-center justify-center`}>
            <span className="text-8xl">{movie.poster}</span>
          </div>
        )}

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
            className="absolute top-3 left-3 px-3 py-1 bg-[#C53030] text-white text-sm font-bold rounded-full shadow-lg"
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
          <span className="text-[#F5A623]">⭐ {movie.rating}</span>
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
        className="w-full max-w-lg bg-gradient-to-br from-[#1E3A4A] via-[#1E3A4A] to-[#1E3A4A] rounded-[2rem] p-8 shadow-2xl border-4 border-[#4BA8C8]/50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-6xl">{movie.poster}</span>
          <h2 className="text-2xl font-black text-white mt-4">Watch Party!</h2>
          <p className="text-[#E0EFF8] mt-2">Who do you want to watch "{movie.title}" with?</p>
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
                  ? 'bg-[#2D6A8F]/50 border-[#4BA8C8]'
                  : 'bg-white/10 border-transparent'
              } ${!contact.online ? 'opacity-50' : ''}`}
              disabled={!contact.online}
            >
              <div className="text-4xl mb-2">{contact.emoji}</div>
              <div className="text-white font-bold">{contact.name}</div>
              <div className={`text-sm ${contact.online ? 'text-[#5BC4A0]' : 'text-gray-400'}`}>
                {contact.online ? '🟢 Online' : '⚫ Offline'}
              </div>
              {selectedContacts.includes(contact.id) && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-[#3DAA8A] rounded-full flex items-center justify-center"
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
                ? 'bg-gradient-to-r from-[#F5A623] to-[#2D6A8F] text-white'
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
          className="w-full mt-4 py-3 text-[#E0EFF8] hover:text-white transition-colors"
        >
          Or watch by myself →
        </motion.button>
      </motion.div>
    </motion.div>
  )
}

// Video player component — plays real video when video_url exists, falls back to demo
function VideoPlayer({
  movie,
  watchParty,
  onClose
}: {
  movie: Movie
  watchParty: string[]
  onClose: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('0:00')
  const [totalTime, setTotalTime] = useState(movie.duration || '0:00')
  const hasVideo = !!movie.video_url

  // Real video time tracking
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const onTime = () => {
      if (v.duration) {
        setProgress((v.currentTime / v.duration) * 100)
        const m = Math.floor(v.currentTime / 60)
        const s = Math.floor(v.currentTime % 60)
        setCurrentTime(`${m}:${s.toString().padStart(2, '0')}`)
        const tm = Math.floor(v.duration / 60)
        const ts = Math.floor(v.duration % 60)
        setTotalTime(`${tm}:${ts.toString().padStart(2, '0')}`)
      }
    }
    v.addEventListener('timeupdate', onTime)
    return () => v.removeEventListener('timeupdate', onTime)
  }, [hasVideo])

  // Demo fallback: simulate progress
  useEffect(() => {
    if (!hasVideo && isPlaying && progress < 100) {
      const timer = setTimeout(() => setProgress(p => p + 1), 500)
      return () => clearTimeout(timer)
    }
  }, [hasVideo, isPlaying, progress])

  const togglePlay = () => {
    if (hasVideo && videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seek = (delta: number) => {
    if (hasVideo && videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime + delta)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50"
    >
      <div className="w-full h-full flex items-center justify-center relative">
        {/* Real video or emoji fallback */}
        {hasVideo ? (
          <video
            ref={videoRef}
            src={movie.video_url}
            poster={movie.poster_url || undefined}
            className="w-full h-full object-contain bg-black"
            playsInline
            onEnded={() => setIsPlaying(false)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-center">
              <span className="text-[150px]">{movie.poster}</span>
              <h2 className="text-4xl font-black text-white mt-4">{movie.title}</h2>
              {!isPlaying && <p className="text-xl text-gray-400 mt-2">Press play to start!</p>}
            </motion.div>
          </div>
        )}

        {/* Watch party participants */}
        {watchParty.length > 0 && (
          <div className="absolute top-4 right-4 flex gap-2">
            {watchParty.map((id, i) => (
              <motion.div key={id} initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="w-14 h-14 rounded-full bg-[#2D6A8F] border-3 border-white flex items-center justify-center">
                <span className="text-2xl">{id === '1' ? '👩' : id === '2' ? '👨' : id === '3' ? '👵' : '👴'}</span>
              </motion.div>
            ))}
            <div className="ml-2 px-4 py-2 bg-[#3DAA8A]/90 rounded-full text-white font-bold flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" /> Watching Together!
            </div>
          </div>
        )}

        {/* Close button */}
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
          className="absolute top-4 left-4 w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
          <span className="text-2xl">✕</span>
        </motion.button>

        {/* Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
          <div className="w-full h-2 bg-white/30 rounded-full mb-4 overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (hasVideo && videoRef.current?.duration) {
                const rect = e.currentTarget.getBoundingClientRect()
                const pct = (e.clientX - rect.left) / rect.width
                videoRef.current.currentTime = pct * videoRef.current.duration
              }
            }}>
            <motion.div className="h-full bg-gradient-to-r from-[#F5A623] to-[#2D6A8F] rounded-full" animate={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-center gap-6">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => seek(-10)}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center">
              <span className="text-2xl">⏪</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={togglePlay}
              className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-xl">
              <span className="text-4xl">{isPlaying ? '⏸️' : '▶️'}</span>
            </motion.button>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => seek(10)}
              className="w-14 h-14 rounded-full bg-white/20 text-white flex items-center justify-center">
              <span className="text-2xl">⏩</span>
            </motion.button>
          </div>
          <div className="text-center mt-4 text-white/80">{currentTime} / {totalTime}</div>
        </div>
      </div>
    </motion.div>
  )
}

// Category tabs
function CategoryTabs({
  selected,
  onSelect,
  genres = [],
}: {
  selected: string
  onSelect: (category: string) => void
  genres?: { id: string; name: string; icon_emoji?: string }[]
}) {
  const baseCategories = [
    { id: 'all', label: 'All Movies', emoji: '🎬' },
    { id: 'favorites', label: 'Favorites', emoji: '❤️' },
    { id: 'new', label: 'New', emoji: '✨' },
  ]
  // Merge real genres from API
  const genreTabs = genres.map(g => ({
    id: g.name.toLowerCase(),
    label: g.name,
    emoji: g.icon_emoji || '🎭',
  }))
  const categories = [...baseCategories, ...genreTabs]

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
              ? 'bg-white text-[#1E3A4A] shadow-lg'
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

  const [movies, setMovies] = useState<Movie[]>([])
  const [isLoading, setIsLoading] = useState(true)
  // Extract unique genres from loaded movies, deduplicate against base categories
  const baseIds = new Set(['all', 'favorites', 'new'])
  const movieGenres = Array.from(new Set(movies.map(m => m.genre).filter(Boolean)))
    .filter(name => !baseIds.has(name.toLowerCase()))
    .map(name => ({ id: name.toLowerCase(), name, icon_emoji: '🎭' }))

  // Fetch real movies from API, fall back to sample data if endpoint not available
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/movies?limit=50`)
        if (res.ok) {
          const data = await res.json()
          const items = data.movies || data || []
          if (items.length > 0) {
            const mapped: Movie[] = items.map((m: any) => ({
              id: m.id,
              title: m.title,
              poster: m.poster_url ? '' : '🎬',
              poster_url: m.poster_url,
              video_url: m.video_url,
              duration: m.duration_minutes ? `${Math.floor(m.duration_minutes / 60)}:${(m.duration_minutes % 60).toString().padStart(2, '0')}` : '0:00',
              rating: '4.8',
              genre: m.genre_name || 'Family',
              isNew: new Date(m.created_at) > new Date(Date.now() - 14 * 86400000),
              isFavorite: false,
            }))
            setMovies(mapped)
            setIsLoading(false)
            return
          }
        }
      } catch {
        // API unavailable — use fallback
      }
      // Fallback sample data
      setMovies([
        { id: '1', title: 'Space Rangers', poster: '🚀', duration: '1:32', rating: '4.8', genre: 'Adventure', isNew: true, isFavorite: false },
        { id: '2', title: 'Silly Penguins', poster: '🐧', duration: '1:15', rating: '4.9', genre: 'Comedy', isNew: true, isFavorite: true },
        { id: '3', title: 'Magic Kingdom', poster: '🏰', duration: '1:45', rating: '4.7', genre: 'Fantasy', isNew: false, isFavorite: true },
        { id: '4', title: 'Ocean Friends', poster: '🐠', duration: '1:28', rating: '4.6', genre: 'Animation', isNew: false, isFavorite: false },
        { id: '5', title: 'Dino World', poster: '🦕', duration: '1:38', rating: '4.8', genre: 'Adventure', isNew: true, isFavorite: false },
        { id: '6', title: 'Robot Dance', poster: '🤖', duration: '1:22', rating: '4.5', genre: 'Musical', isNew: false, isFavorite: false },
        { id: '7', title: 'Puppy Pals', poster: '🐕', duration: '1:18', rating: '4.9', genre: 'Family', isNew: false, isFavorite: true },
        { id: '8', title: 'Super Kitty', poster: '🐱', duration: '1:25', rating: '4.7', genre: 'Comedy', isNew: false, isFavorite: false },
      ])
      setIsLoading(false)
    }
    fetchMovies()
  }, [])

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
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A4A] via-[#1E3A4A] to-[#1E3A4A] relative overflow-hidden">
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
              <p className="text-[#E0EFF8]">Watch movies with family!</p>
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

        {/* Category tabs — includes genres from loaded movies */}
        <CategoryTabs selected={category} onSelect={setCategory} genres={movieGenres} />

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
            <p className="text-[#E0EFF8] mt-2">Check back soon for more awesome movies!</p>
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
