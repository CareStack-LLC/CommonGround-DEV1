'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Play,
  Star,
  Heart,
  Plus,
  Wand2,
} from 'lucide-react';

/* =============================================================================
   STORY TIME - Books for Kids
   Kids can read stories managed via KidSpace Media Library
   ============================================================================= */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Story {
  id: string;
  title: string;
  cover_emoji: string;
  cover_url?: string;
  pdf_url?: string;
  page_count: number;
  theme: string;
  created_at: string;
  is_favorite: boolean;
}

// Fallback stories when API unavailable
const sampleStories: Story[] = [
  { id: '1', title: 'The Brave Little Dinosaur', cover_emoji: '🦕', page_count: 8, theme: 'adventure', created_at: '2024-01-10', is_favorite: true },
  { id: '2', title: 'Princess Luna\'s Space Trip', cover_emoji: '🚀', page_count: 10, theme: 'space', created_at: '2024-01-08', is_favorite: false },
  { id: '3', title: 'The Magical Garden', cover_emoji: '🌸', page_count: 6, theme: 'nature', created_at: '2024-01-05', is_favorite: true },
  { id: '4', title: 'Captain Teddy\'s Ocean', cover_emoji: '🐻', page_count: 12, theme: 'ocean', created_at: '2024-01-03', is_favorite: false },
];

// Floating book decorations
function FloatingBooks() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {['📖', '📚', '✨', '⭐', '🌟', '📕', '📗'].map((emoji, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl opacity-20"
          initial={{
            x: Math.random() * 100 + '%',
            y: 100 + '%',
          }}
          animate={{
            y: -20 + '%',
            rotate: [0, 360],
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
  );
}

// Story book card
function StoryCard({
  story,
  onClick,
  onFavorite,
  delay = 0
}: {
  story: Story;
  onClick: () => void;
  onFavorite: () => void;
  delay?: number;
}) {
  const themeColors: Record<string, { bg: string; shadow: string }> = {
    adventure: { bg: 'from-cg-amber to-cg-amber', shadow: 'var(--cg-amber-dark)' },
    space: { bg: 'from-cg-slate-light to-cg-slate', shadow: 'var(--cg-slate-dark)' },
    nature: { bg: 'from-cg-sage-light to-cg-sage', shadow: 'var(--cg-sage-dark)' },
    ocean: { bg: 'from-cg-slate-light to-cg-slate', shadow: 'var(--cg-slate-dark)' },
    fantasy: { bg: 'from-cg-amber to-cg-amber', shadow: 'var(--cg-error-dark)' },
  };

  const colors = themeColors[story.theme] || themeColors.adventure;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateX: -20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 20,
        delay
      }}
      className="relative"
    >
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.95 }}
        className={`
          w-full bg-gradient-to-br ${colors.bg} rounded-3xl p-5 text-left
          relative overflow-hidden group
        `}
        style={{ boxShadow: `0 8px 0 0 ${colors.shadow}` }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Favorite button */}
        <motion.button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          className="absolute top-3 right-3 z-10"
        >
          <Heart
            className={`w-6 h-6 ${story.is_favorite ? 'text-white fill-white' : 'text-white/50'}`}
          />
        </motion.button>

        {/* Book cover — real image or emoji fallback */}
        <div className="w-20 h-24 mx-auto mb-4 bg-white/90 rounded-xl overflow-hidden shadow-lg relative">
          {story.cover_url ? (
            <img src={story.cover_url} alt={story.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">{story.cover_emoji}</span>
            </div>
          )}
          <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/10 rounded-l-xl" />
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-center text-sm leading-tight drop-shadow-sm mb-2">
          {story.title}
        </h3>

        {/* Page count */}
        <div className="flex items-center justify-center gap-1 text-white/80 text-xs">
          <BookOpen className="w-3 h-3" />
          <span>{story.page_count} pages</span>
        </div>
      </motion.button>
    </motion.div>
  );
}

// Story Reader View — shows real PDF when available, falls back to demo pages
function StoryReader({
  story,
  onClose
}: {
  story: Story;
  onClose: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const hasPdf = !!story.pdf_url;

  // Demo pages (used when no pdf_url)
  const pages = [
    { text: `Once upon a time, there was ${story.title.toLowerCase().replace('the ', 'a ')}...`, image: story.cover_emoji },
    { text: 'One sunny morning, an amazing adventure began!', image: '🌅' },
    { text: 'Many friends were met along the way.', image: '🤝' },
    { text: 'There were challenges to overcome.', image: '💪' },
    { text: 'But with bravery and kindness...', image: '❤️' },
    { text: 'Everything turned out wonderfully!', image: '🌈' },
    { text: 'The End!', image: '⭐' },
  ];

  const goNext = () => setCurrentPage(p => Math.min(p + 1, pages.length - 1));
  const goPrev = () => setCurrentPage(p => Math.max(p - 1, 0));

  // PDF Reader mode
  if (hasPdf) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gradient-to-b from-foreground via-foreground to-foreground z-50 flex flex-col"
      >
        <header className="relative z-10 p-4 flex items-center justify-between">
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white">←</motion.button>
          <h2 className="text-white font-bold text-lg">{story.title}</h2>
          <div className="w-12" />
        </header>
        <div className="flex-1 p-4 relative z-10">
          <iframe
            src={story.pdf_url}
            className="w-full h-full rounded-2xl bg-white shadow-2xl"
            title={story.title}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-b from-foreground via-foreground to-foreground z-50 flex flex-col"
    >
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(50)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            initial={{
              x: Math.random() * 100 + '%',
              y: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.2,
            }}
            animate={{
              opacity: [null, 1, 0.2],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white"
        >
          ←
        </motion.button>
        <h2 className="text-white font-bold text-lg">{story.title}</h2>
        <div className="w-12" /> {/* Spacer */}
      </header>

      {/* Book */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl"
          >
            {/* Page emoji */}
            <motion.div
              className="text-8xl text-center mb-6"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {pages[currentPage].image}
            </motion.div>

            {/* Page text */}
            <p className="text-gray-700 text-xl text-center leading-relaxed font-medium">
              {pages[currentPage].text}
            </p>

            {/* Page indicator */}
            <div className="flex justify-center gap-2 mt-8">
              {pages.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentPage ? 'bg-cg-slate' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6 flex items-center justify-between">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goPrev}
          disabled={currentPage === 0}
          className={`w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg ${
            currentPage === 0 ? 'opacity-30' : ''
          }`}
        >
          <ChevronLeft className="w-8 h-8 text-cg-slate" />
        </motion.button>

        <div className="text-white font-bold">
          {currentPage + 1} / {pages.length}
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={goNext}
          disabled={currentPage === pages.length - 1}
          className={`w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg ${
            currentPage === pages.length - 1 ? 'opacity-30' : ''
          }`}
        >
          <ChevronRight className="w-8 h-8 text-cg-slate" />
        </motion.button>
      </nav>
    </motion.div>
  );
}

// Loading fallback
function StoriesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cg-slate via-cg-amber to-cg-amber flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <Sparkles className="w-16 h-16 text-white" />
      </motion.div>
    </div>
  );
}

// Main page content
function StoriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const familyFileId = searchParams.get('case');

  const [stories, setStories] = useState<Story[]>(sampleStories);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [featuredAuthor, setFeaturedAuthor] = useState<{ name: string; bio?: string; photo_url?: string; showcase_book_title?: string } | null>(null);

  // Fetch featured author
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/kidspace/authors/featured`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.author) setFeaturedAuthor(d.author); })
      .catch(() => {});
  }, []);

  // Fetch real books from API
  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/books?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const items = data.books || data || [];
          if (items.length > 0) {
            const mapped: Story[] = items.map((b: any) => ({
              id: b.id,
              title: b.title,
              cover_emoji: '📖',
              cover_url: b.cover_url,
              pdf_url: b.pdf_url,
              page_count: b.page_count || 0,
              theme: b.genre_name || 'adventure',
              created_at: b.created_at,
              is_favorite: false,
            }));
            setStories(mapped);
          }
        }
      } catch {
        // API unavailable — keep fallback sample data
      }
    };
    fetchBooks();
  }, []);

  const toggleFavorite = (id: string) => {
    setStories(stories.map(s =>
      s.id === id ? { ...s, is_favorite: !s.is_favorite } : s
    ));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cg-slate via-cg-slate to-fuchsia-500 relative overflow-hidden pb-24">
      <FloatingBooks />

      {/* Header */}
      <header className="relative z-10 px-6 pt-8 pb-4">
        <div className="max-w-lg mx-auto">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push(`/kids?case=${familyFileId}`)}
            className="flex items-center gap-2 text-white font-bold mb-4"
          >
            <span className="text-2xl">←</span> Back
          </motion.button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <motion.span
              className="text-6xl block mb-3"
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              📚
            </motion.span>
            <h1 className="text-3xl font-bold text-white drop-shadow-lg mb-2">
              Story Time!
            </h1>
            <p className="text-white/80">Pick a story to read</p>
          </motion.div>
        </div>
      </header>

      {/* Featured Author Spotlight */}
      {featuredAuthor && (
        <div className="px-6 mb-4 relative z-10">
          <div className="max-w-lg mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/20 backdrop-blur-sm rounded-3xl p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 rounded-full overflow-hidden bg-white/30 flex-shrink-0 shadow-lg">
                {featuredAuthor.photo_url ? (
                  <img src={featuredAuthor.photo_url} alt={featuredAuthor.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">✍️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-cg-amber-subtle uppercase tracking-wider">✨ Author Spotlight</p>
                <h3 className="text-white font-bold truncate">{featuredAuthor.name}</h3>
                {featuredAuthor.showcase_book_title && (
                  <p className="text-white/70 text-xs truncate">📖 {featuredAuthor.showcase_book_title}</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* Create New Story Button */}
      <div className="px-6 mb-6 relative z-10">
        <div className="max-w-lg mx-auto">
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCreating(true)}
            className="w-full bg-white/20 backdrop-blur-sm border-2 border-dashed border-white/50 rounded-2xl p-4 flex items-center justify-center gap-3 text-white font-bold"
          >
            <Wand2 className="w-5 h-5" />
            Create New Story with ARIA
            <Sparkles className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Favorites Section */}
      {stories.some(s => s.is_favorite) && (
        <section className="px-6 mb-6 relative z-10">
          <div className="max-w-lg mx-auto">
            <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <Star className="w-5 h-5" fill="currentColor" />
              My Favorites
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {stories.filter(s => s.is_favorite).map((story, i) => (
                <div key={story.id} className="w-36 flex-shrink-0">
                  <StoryCard
                    story={story}
                    onClick={() => setSelectedStory(story)}
                    onFavorite={() => toggleFavorite(story.id)}
                    delay={0.1 + i * 0.1}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* All Stories */}
      <section className="px-6 relative z-10">
        <div className="max-w-lg mx-auto">
          <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            All Stories
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {stories.map((story, i) => (
              <StoryCard
                key={story.id}
                story={story}
                onClick={() => setSelectedStory(story)}
                onFavorite={() => toggleFavorite(story.id)}
                delay={0.2 + i * 0.08}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Story Reader Modal */}
      <AnimatePresence>
        {selectedStory && (
          <StoryReader
            story={selectedStory}
            onClose={() => setSelectedStory(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Story Modal (simplified) */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm"
            >
              <div className="text-center">
                <motion.span
                  className="text-6xl block mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  🪄
                </motion.span>
                <h3 className="text-xl font-bold text-gray-800 mb-2">
                  Create a Story!
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  ARIA will help you write an amazing story
                </p>

                <div className="space-y-3 mb-6">
                  {['🦄 Unicorn Adventure', '🚀 Space Explorer', '🐉 Dragon Quest', '🧜 Mermaid Tale'].map((theme, i) => (
                    <motion.button
                      key={theme}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full p-3 bg-cg-slate-subtle hover:bg-cg-slate-subtle rounded-xl text-left font-medium text-gray-700 transition-colors"
                    >
                      {theme}
                    </motion.button>
                  ))}
                </div>

                <button
                  onClick={() => setIsCreating(false)}
                  className="text-gray-400 font-medium"
                >
                  Maybe Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Default export wrapped in Suspense for useSearchParams
export default function StoriesPage() {
  return (
    <Suspense fallback={<StoriesLoading />}>
      <StoriesPageContent />
    </Suspense>
  );
}
