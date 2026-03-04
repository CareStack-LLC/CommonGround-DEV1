'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StreamingBookCard } from '@/components/kidcoms/streaming-book-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { AuthorAvatar } from '@/components/kidcoms/author-avatar';
import { HorizontalScrollRow } from '@/components/kidcoms/horizontal-scroll-row';
import { theaterContent, BookCategory, bookCategories } from '@/lib/theater-content';
import { BookOpen, Search, Trophy, Target, Zap } from 'lucide-react';

import type { ReadingProgress, ReadingStats } from '@/lib/reading-progress';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

const AVATAR_COLORS = [
  'from-cyan-500 to-teal-500',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-500',
];

// Derive unique authors from books
function getAuthors(books: typeof theaterContent.storybooks) {
  // Hardcoded popular authors as requested
  return [
    {
      name: 'Ayanna S Clark',
      avatar: '/kidsComms/posters/authors/ayaanasclark.jpg',
      bookCount: books.filter(b => b.author?.includes('Ayanna')).length || 1
    },
    {
      name: 'Alice Fayes',
      avatar: '/kidsComms/posters/authors/alicefayes.jpg',
      bookCount: 1
    },
    {
      name: 'Trevor Smith',
      avatar: '/kidsComms/posters/authors/trevorsmith.jpg',
      bookCount: 1
    }
  ];
}

export default function LibraryPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | 'all' | 'reading'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<ReadingStats>({ booksRead: 0, booksCompleted: 0, pagesRead: 0, streak: 0, lastReadDate: null });
  const [currentlyReading, setCurrentlyReading] = useState<ReadingProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress | null>>({});

  useEffect(() => {
    validateAndLoadUser();
  }, []);

  function validateAndLoadUser() {
    try {
      const token = localStorage.getItem('child_token');
      const userStr = localStorage.getItem('child_user');

      if (!token || !userStr) {
        router.push('/my-circle/child');
        return;
      }

      const user = JSON.parse(userStr) as ChildUserData;
      if (!user.familyFileId) {
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);

      const { getReadingStats, getCurrentlyReading, getReadingProgress } = require('@/lib/reading-progress');
      setStats(getReadingStats());
      setCurrentlyReading(getCurrentlyReading());

      const map: Record<string, ReadingProgress | null> = {};
      theaterContent.storybooks.forEach(b => { map[b.id] = getReadingProgress(b.id); });
      setProgressMap(map);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  const books = theaterContent.storybooks;
  const authors = getAuthors(books);

  const filteredBooks = books.filter(book => {
    if (selectedCategory === 'reading') {
      if (!currentlyReading.find(p => p.bookId === book.id)) return false;
    } else if (selectedCategory !== 'all' && book.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return book.title.toLowerCase().includes(q) || book.author?.toLowerCase().includes(q);
    }
    return true;
  });

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Loading Library...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Dark Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <BookOpen className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="font-black text-white text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Library
                </h1>
                <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {books.length} books to explore
                </p>
              </div>
            </div>

            {/* Profile Avatar */}
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 ring-2 ring-offset-2 ring-offset-slate-950 ring-cyan-500/50`}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {userInitial}
              </span>
            </div>
          </div>

          {/* Search Bar — Dark */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search books or authors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>

        {/* Genre Pills */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {[
              { key: 'all', label: 'All Books' },
              ...(currentlyReading.length > 0 ? [{ key: 'reading', label: '📖 Reading' }] : []),
              ...Object.entries(bookCategories).map(([key, cat]) => ({ key, label: `${cat.emoji} ${cat.name}` })),
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as any)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${selectedCategory === key
                  ? 'bg-gradient-to-r from-amber-500 to-orange-400 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="space-y-6 pt-4 pb-4">
        {/* Reading Stats — dark card */}
        {stats.booksRead > 0 && (
          <div className="px-4">
            <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50">
              <h3
                className="font-bold text-amber-400 mb-3 text-sm flex items-center gap-2"
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}
              >
                <Trophy className="w-4 h-4" /> Your Reading Journey
              </h3>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { icon: <Trophy className="w-4 h-4 text-amber-400" />, value: stats.booksCompleted, label: 'Completed' },
                  { icon: <Target className="w-4 h-4 text-amber-400" />, value: stats.pagesRead, label: 'Pages' },
                  { icon: <Zap className="w-4 h-4 text-amber-400" />, value: stats.streak, label: 'Day Streak' },
                ].map(({ icon, value, label }) => (
                  <div key={label}>
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {icon}
                      <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {value}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Popular Authors */}
        {selectedCategory === 'all' && !searchQuery && authors.length > 0 && (
          <div className="px-4">
            <HorizontalScrollRow
              title="Popular Authors"
              items={authors}
              cardClassName="w-24"
              renderCard={(author) => (
                <AuthorAvatar
                  name={author.name}
                  avatar={author.avatar}
                  size="lg"
                  onClick={() => setSearchQuery(author.name)}
                />
              )}
            />
          </div>
        )}

        {/* New Books — first 6 in a horizontal row */}
        {selectedCategory === 'all' && !searchQuery && (
          <div className="px-4">
            <HorizontalScrollRow
              title="New &amp; Featured"
              items={books.slice(0, 6)}
              onViewAll={() => { }}
              cardClassName="w-32"
              renderCard={(book) => (
                <StreamingBookCard
                  book={book}
                  onClick={() => router.push(`/my-circle/child/library/${book.id}`)}
                  progress={progressMap[book.id]}
                />
              )}
            />
          </div>
        )}

        {/* All Books Grid */}
        <section className="px-4">
          <h2
            className="text-xl font-bold text-white mb-4"
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            {selectedCategory === 'all' && !searchQuery
              ? 'All Books'
              : selectedCategory === 'reading'
                ? 'Currently Reading'
                : searchQuery
                  ? `${filteredBooks.length} Results`
                  : bookCategories[selectedCategory as BookCategory]?.name || 'Books'}
          </h2>

          {filteredBooks.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📚</div>
              <p className="text-slate-400 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                {searchQuery ? 'No books found' : 'No books in this category'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBooks.map(book => (
                <StreamingBookCard
                  key={book.id}
                  book={book}
                  onClick={() => router.push(`/my-circle/child/library/${book.id}`)}
                  progress={progressMap[book.id]}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <KidBottomNav />

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
