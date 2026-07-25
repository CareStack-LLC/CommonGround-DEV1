'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StreamingBookCard } from '@/components/kidcoms/streaming-book-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { AuthorAvatar } from '@/components/kidcoms/author-avatar';
import { HorizontalScrollRow } from '@/components/kidcoms/horizontal-scroll-row';
import { theaterContent, BookCategory, bookCategories } from '@/lib/theater-content';
import { BookOpen, Search, Trophy, Target, Zap } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import { ARIAHelper } from '@/components/kidcoms/aria-helper';
import { KidSpaceHeader } from '@/components/kidcoms/kidspace-header';
import { BookDetailModal } from '@/components/kidcoms/book-detail-modal';
import type { StorybookContent } from '@/lib/theater-content';

import type { ReadingProgress, ReadingStats } from '@/lib/reading-progress';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

const AVATAR_COLORS = [
  'from-cg-slate-light to-cg-sage',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-cg-sage',
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
  const [selectedBook, setSelectedBook] = useState<StorybookContent | null>(null);
  const [stats, setStats] = useState<ReadingStats>({ booksRead: 0, booksCompleted: 0, pagesRead: 0, streak: 0, lastReadDate: null });
  const [currentlyReading, setCurrentlyReading] = useState<ReadingProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress | null>>({});
  const [allBooks, setAllBooks] = useState<StorybookContent[]>([]);
  const [apiAuthors, setApiAuthors] = useState<{name: string; avatar: string; bookCount: number}[]>([]);

  useEffect(() => {
    validateAndLoadUser();
    fetchApiContent();
  }, []);

  async function fetchApiContent() {
    try {
      const [booksRes, authorsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/kidspace/books?limit=50`).catch(() => null),
        fetch(`${API_BASE}/api/v1/kidspace/authors/featured`).catch(() => null),
      ]);

      if (booksRes?.ok) {
        const data = await booksRes.json();
        const items = data.books || data || [];
        const catMap: Record<string, BookCategory> = {
          stories: 'fiction', learn: 'educational', fiction: 'fiction', educational: 'educational', fantasy: 'fantasy', adventure: 'adventure',
        };
        const apiBooks: StorybookContent[] = items.map((b: any) => ({
          id: b.id,
          title: b.title,
          url: b.pdf_url || '',
          cover: b.cover_url || '',
          pages: b.page_count || 0,
          author: b.author_name || b.author?.name || '',
          category: catMap[(b.genre_name || 'fiction').toLowerCase()] || 'fiction',
          ageRange: b.age_min && b.age_max ? `${b.age_min}-${b.age_max}` : '3-12',
        }));
        setAllBooks(apiBooks);
      }

      if (authorsRes?.ok) {
        const author = await authorsRes.json();
        if (author?.name) {
          setApiAuthors([{
            name: author.name,
            avatar: author.photo_url || '',
            bookCount: author.books?.length || 1,
          }]);
        }
      }
    } catch (err) {
      console.error("[KidSpace Library] API fetch failed:", err);
    }
  }

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
      allBooks.forEach(b => { map[b.id] = getReadingProgress(b.id); });
      setProgressMap(map);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  const books = allBooks;
  const authors = apiAuthors;

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
            Loading Library...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--portal-background)' }}>
      {/* Header */}
      <KidSpaceHeader
        title="Library"
        subtitle={`${books.length} books to explore`}
        userInitial={userInitial}
        avatarGradient={avatarGradient}
      >
        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--portal-muted)' }} />
            <input
              type="text"
              placeholder="Search books or authors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              style={{
                fontFamily: 'Inter, sans-serif',
                background: 'var(--portal-input-bg)',
                border: '1px solid var(--portal-input-border)',
                color: 'var(--portal-text)',
              }}
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
                  : ''
                  }`}
                style={selectedCategory !== key ? {
                  fontFamily: 'Inter, sans-serif',
                  background: 'var(--portal-input-bg)',
                  color: 'var(--portal-muted)',
                  border: '1px solid var(--portal-border)',
                } : { fontFamily: 'Inter, sans-serif' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </KidSpaceHeader>

      <main className="space-y-6 pt-4 pb-4">
        {/* Reading Stats card */}
        {stats.booksRead > 0 && (
          <div className="px-4">
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--portal-surface)',
                border: '1px solid var(--portal-border)',
              }}
            >
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
                      <div className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'var(--font-mono)' }}>
                        {value}
                      </div>
                    </div>
                    <div className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Author Spotlight */}
        {selectedCategory === 'all' && !searchQuery && authors.length > 0 && (
          <div className="px-4">
            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              ✍️ Author Spotlight
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {authors.map((author) => (
                <button
                  key={author.name}
                  onClick={() => setSearchQuery(author.name)}
                  className="rounded-2xl p-3 text-center transition-all duration-200 hover:scale-[1.02] active:scale-95"
                  style={{
                    background: 'var(--portal-surface)',
                    border: '1px solid var(--portal-border)',
                  }}
                >
                  <AuthorAvatar
                    name={author.name}
                    avatar={author.avatar}
                    size="lg"
                  />
                  <p className="text-xs font-semibold mt-2 line-clamp-1" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                    {author.name}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                    {author.bookCount} {author.bookCount === 1 ? 'book' : 'books'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Continue Reading — horizontal row for books in progress */}
        {selectedCategory === 'all' && !searchQuery && currentlyReading.length > 0 && (
          <div className="px-4">
            <HorizontalScrollRow
              title="📖 Continue Reading"
              items={books.filter(b => currentlyReading.find(p => p.bookId === b.id))}
              cardClassName="w-36"
              showViewAll={false}
              renderCard={(book) => (
                <StreamingBookCard
                  book={book}
                  onClick={() => setSelectedBook(book)}
                  progress={progressMap[book.id]}
                />
              )}
            />
          </div>
        )}

        {/* Genre Sections — horizontal scroll rows per category */}
        {selectedCategory === 'all' && !searchQuery ? (
          <>
            {Object.entries(bookCategories).map(([key, cat]) => {
              const genreBooks = books.filter(b => b.category === key);
              if (genreBooks.length === 0) return null;
              return (
                <div key={key} className="px-4">
                  <HorizontalScrollRow
                    title={`${cat.emoji} ${cat.name}`}
                    items={genreBooks}
                    onViewAll={() => setSelectedCategory(key as BookCategory)}
                    cardClassName="w-36"
                    renderCard={(book) => (
                      <StreamingBookCard
                        book={book}
                        onClick={() => setSelectedBook(book)}
                        progress={progressMap[book.id]}
                      />
                    )}
                  />
                </div>
              );
            })}
          </>
        ) : (
          /* Filtered / Search / Category View — grid layout */
          <section className="px-4">
            <h2
              className="text-xl font-bold mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}
            >
              {selectedCategory === 'reading'
                ? 'Currently Reading'
                : searchQuery
                  ? `${filteredBooks.length} Results`
                  : bookCategories[selectedCategory as BookCategory]?.name || 'Books'}
            </h2>

            {filteredBooks.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">📚</div>
                <p className="font-medium text-lg" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  {searchQuery ? 'No books found' : allBooks.length === 0 ? 'No Books Yet' : 'No books in this category'}
                </p>
                {allBooks.length === 0 && !searchQuery && (
                  <p className="text-sm mt-2" style={{ color: 'var(--portal-muted)', opacity: 0.6 }}>
                    Books will appear here once added by the CommonGround team.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filteredBooks.map(book => (
                  <StreamingBookCard
                    key={book.id}
                    book={book}
                    onClick={() => setSelectedBook(book)}
                    progress={progressMap[book.id]}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* ARIA Greeting */}
      <ARIAHelper
        message="Happy reading! Pick a book to start an adventure 📚"
        mood="happy"
        position="bottom-right"
        dismissDelay={5000}
      />

      <KidBottomNav />

      {/* Book Detail Modal */}
      <BookDetailModal
        book={selectedBook}
        onClose={() => setSelectedBook(null)}
        onStartReading={(b) => router.push(`/my-circle/child/library/${b.id}`)}
        onStartReadTogether={(b) =>
          router.push(`/my-circle/child/library/${b.id}?together=1`)
        }
        progress={selectedBook ? progressMap[selectedBook.id] : null}
      />

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
