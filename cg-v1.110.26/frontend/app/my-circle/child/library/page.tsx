'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StreamingBookCard } from '@/components/kidcoms/streaming-book-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { theaterContent, BookCategory, bookCategories } from '@/lib/theater-content';
import { BookOpen, Search, Trophy, Target, Zap, Bookmark } from 'lucide-react';

import type { ReadingProgress, ReadingStats } from '@/lib/reading-progress';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
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
        console.error('Missing family file ID');
        localStorage.clear();
        router.push('/my-circle/child');
        return;
      }

      setUserData(user);

      // Load reading state only on client after auth passes
      const { getReadingStats, getCurrentlyReading, getReadingProgress } = require('@/lib/reading-progress');
      const loadedStats = getReadingStats();
      const loadedCurrentlyReading = getCurrentlyReading();
      setStats(loadedStats);
      setCurrentlyReading(loadedCurrentlyReading);

      // Pre-load progress for all books
      const books = theaterContent.storybooks;
      const map: Record<string, ReadingProgress | null> = {};
      books.forEach(book => { map[book.id] = getReadingProgress(book.id); });
      setProgressMap(map);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  function handleBookSelect(book: typeof theaterContent.storybooks[0]) {
    router.push(`/my-circle/child/library/${book.id}`);
  }

  const books = theaterContent.storybooks;

  // Filter books
  const filteredBooks = books.filter(book => {
    // Category filter
    if (selectedCategory === 'reading') {
      if (!currentlyReading.find(p => p.bookId === book.id)) return false;
    } else if (selectedCategory !== 'all' && book.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        book.title.toLowerCase().includes(query) ||
        book.author?.toLowerCase().includes(query)
      );
    }

    return true;
  });

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
      {/* Header - Dark theme like streaming platforms */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800">
        <div className="px-4 py-4">
          {/* Title Section */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-600 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <BookOpen className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-white text-2xl mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Library
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {books.length} books
                </span>
                {stats.booksRead > 0 && (
                  <>
                    <span>•</span>
                    <span>{stats.pagesRead} pages read</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search for books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>
      </header>

      {/* Reading Stats Widget */}
      {stats.booksRead > 0 && (
        <div className="px-4 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="bg-gradient-to-br from-amber-950/50 to-orange-950/50 rounded-xl p-4 border border-amber-900/30">
            <h3 className="font-semibold text-amber-400 mb-3 text-sm flex items-center gap-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              <Trophy className="w-4 h-4" />
              Your Reading Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.booksCompleted}
                  </div>
                </div>
                <div className="text-xs text-amber-300/70" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Completed
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-4 h-4 text-amber-500" />
                  <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.pagesRead}
                  </div>
                </div>
                <div className="text-xs text-amber-300/70" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Pages
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.streak}
                  </div>
                </div>
                <div className="text-xs text-amber-300/70" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Day Streak
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs - Dark theme */}
      <div className="sticky top-[132px] z-30 px-4 py-3 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            )}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            All Books
          </button>

          {currentlyReading.length > 0 && (
            <button
              onClick={() => setSelectedCategory('reading')}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2',
                selectedCategory === 'reading'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              )}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Bookmark className="w-4 h-4" />
              Currently Reading
            </button>
          )}

          {(Object.keys(bookCategories) as BookCategory[]).map((cat) => {
            const category = bookCategories[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                )}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {category.emoji} {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 pt-6">
        {/* Category Title */}
        {selectedCategory !== 'all' && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {selectedCategory === 'reading' && 'Currently Reading'}
              {selectedCategory !== 'reading' && bookCategories[selectedCategory as BookCategory]?.name}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {filteredBooks.length} {filteredBooks.length === 1 ? 'book' : 'books'}
            </p>
          </div>
        )}

        {/* Books Grid - Portrait layout */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {searchQuery ? 'No books found' : 'No books here yet'}
            </h3>
            <p className="text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              {searchQuery ? 'Try searching for something else' : 'Check back later for more books'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredBooks.map((book) => {
              const progress = progressMap[book.id] ?? null;

              return (
                <StreamingBookCard
                  key={book.id}
                  book={book}
                  onClick={() => handleBookSelect(book)}
                  progress={progress}
                />
              );
            })}
          </div>
        )}
      </main>

      <KidBottomNav />
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
