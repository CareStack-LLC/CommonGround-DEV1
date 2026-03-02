'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KidBookCard } from '@/components/kidcoms/kid-book-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
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

export default function LibraryPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | 'all' | 'reading'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<ReadingStats>({ booksRead: 0, booksCompleted: 0, pagesRead: 0, streak: 0 });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-700" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 border-b border-slate-200">
        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Library
              </h1>
              <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                {stats.booksRead} books · {stats.pagesRead} pages
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>
      </header>

      {/* Reading Stats Widget */}
      {stats.booksRead > 0 && (
        <div className="px-4 py-3">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-3 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              📖 Your Reading Stats
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trophy className="w-4 h-4 text-amber-600" />
                  <div className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.booksCompleted}
                  </div>
                </div>
                <div className="text-xs text-amber-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Completed
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-4 h-4 text-amber-600" />
                  <div className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.pagesRead}
                  </div>
                </div>
                <div className="text-xs text-amber-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Pages
                </div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <div className="text-2xl font-bold text-amber-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    {stats.streak}
                  </div>
                </div>
                <div className="text-xs text-amber-700" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Day Streak
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${selectedCategory === 'all'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            All
          </button>

          {currentlyReading.length > 0 && (
            <button
              onClick={() => setSelectedCategory('reading')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${selectedCategory === 'reading'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Reading
            </button>
          )}

          {(Object.keys(bookCategories) as BookCategory[]).map((cat) => {
            const category = bookCategories[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${selectedCategory === cat
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {category.emoji} {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-slate-600 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              {searchQuery ? 'No books found' : 'No books in this category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBooks.map((book) => {
              const progress = progressMap[book.id] ?? null;

              return (
                <div key={book.id} className="relative">
                  <KidBookCard
                    book={book}
                    onClick={() => handleBookSelect(book)}
                    progress={progress}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      <KidBottomNav />
    </div>
  );
}
