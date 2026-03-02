'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Play, BookOpen, Gamepad2, Film, Users } from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { FeaturedHeroBanner } from '@/components/kidcoms/featured-hero-banner';
import { HorizontalScrollRow } from '@/components/kidcoms/horizontal-scroll-row';
import { StreamingMovieCard } from '@/components/kidcoms/streaming-movie-card';
import { StreamingBookCard } from '@/components/kidcoms/streaming-book-card';
import { theaterContent } from '@/lib/theater-content';
import type { WatchProgress } from '@/lib/watch-progress';
import type { ReadingProgress } from '@/lib/reading-progress';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

type ContentFilter = 'ALL' | 'Movies' | 'Books' | 'Games' | 'People';

const AVATAR_COLORS = [
  'from-cyan-500 to-teal-500',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-500',
];

export default function ChildDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<ContentFilter>('ALL');
  const [recentVideos, setRecentVideos] = useState<WatchProgress[]>([]);
  const [recentBooks, setRecentBooks] = useState<ReadingProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress | null>>({});
  const [bookProgressMap, setBookProgressMap] = useState<Record<string, ReadingProgress | null>>({});

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

      // Load media history safely on client only
      const { getRecentlyWatched, getWatchProgress } = require('@/lib/watch-progress');
      const { getRecentlyRead, getReadingProgress } = require('@/lib/reading-progress');

      const watched = getRecentlyWatched();
      const read = getRecentlyRead();
      setRecentVideos(watched);
      setRecentBooks(read);

      const vMap: Record<string, WatchProgress | null> = {};
      theaterContent.videos.forEach(v => { vMap[v.id] = getWatchProgress(v.id); });
      setProgressMap(vMap);

      const bMap: Record<string, ReadingProgress | null> = {};
      theaterContent.storybooks.forEach(b => { bMap[b.id] = getReadingProgress(b.id); });
      setBookProgressMap(bMap);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  // Featured content — first video with most progress, or default to first
  const featuredVideo = theaterContent.videos[0];
  const continueVideos = recentVideos.filter(v => v.progress > 0 && v.progress < 90);
  const continueBooks = recentBooks.filter(b => b.currentPage > 0 && !b.completed);

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

  const filters: ContentFilter[] = ['ALL', 'Movies', 'Books', 'Games', 'People'];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center mx-auto animate-pulse">
            <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
          </div>
          <p className="text-slate-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Dark Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Title */}
          <div>
            <h1
              className="font-black text-white text-xl leading-tight"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Hey {userData?.childName || 'friend'} 👋
            </h1>
            <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
              What are you watching today?
            </p>
          </div>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            <button
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Search"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 ring-2 ring-offset-2 ring-offset-slate-950 ring-cyan-500/50`}
            >
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {userInitial}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-6 pb-6">
        {/* Category Filter Pills */}
        <div className="px-4 pt-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${activeFilter === filter
                    ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Hero Banner */}
        {(activeFilter === 'ALL' || activeFilter === 'Movies') && (
          <div className="px-4">
            <FeaturedHeroBanner
              content={{
                id: featuredVideo.id,
                title: featuredVideo.title,
                cover: featuredVideo.thumbnail,
                description: featuredVideo.description,
                duration: featuredVideo.duration ? parseInt(featuredVideo.duration) : undefined,
                type: 'video',
                category: featuredVideo.category,
                rating: 4.5,
                ratingCount: 2400,
              }}
              badge="🔥 Trending"
              onPlay={() => router.push(`/my-circle/child/movies/${featuredVideo.id}`)}
            />
          </div>
        )}

        {/* Continue Watching Row — Videos */}
        {continueVideos.length > 0 && (activeFilter === 'ALL' || activeFilter === 'Movies') && (
          <div className="px-4">
            <HorizontalScrollRow
              title="Continue Watching"
              items={continueVideos}
              onViewAll={() => router.push('/my-circle/child/movies')}
              cardClassName="w-40"
              renderCard={(wp) => {
                const video = theaterContent.videos.find(v => v.id === wp.videoId);
                if (!video) return null;
                return (
                  <StreamingMovieCard
                    video={video}
                    onClick={() => router.push(`/my-circle/child/movies/${video.id}`)}
                    progress={wp.progress}
                  />
                );
              }}
            />
          </div>
        )}

        {/* Continue Reading Row — Books */}
        {continueBooks.length > 0 && (activeFilter === 'ALL' || activeFilter === 'Books') && (
          <div className="px-4">
            <HorizontalScrollRow
              title="Continue Reading"
              items={continueBooks}
              onViewAll={() => router.push('/my-circle/child/library')}
              cardClassName="w-36"
              renderCard={(rp) => {
                const book = theaterContent.storybooks.find(b => b.id === rp.bookId);
                if (!book) return null;
                return (
                  <StreamingBookCard
                    book={book}
                    onClick={() => router.push(`/my-circle/child/library/${book.id}`)}
                    progress={rp}
                  />
                );
              }}
            />
          </div>
        )}

        {/* Quick Actions — 2×2 Grid */}
        {(activeFilter === 'ALL') && (
          <section className="px-4">
            <h2
              className="text-xl font-bold text-white mb-4"
              style={{ fontFamily: 'Space Grotesk, sans-serif' }}
            >
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {/* Movies */}
              <button
                onClick={() => router.push('/my-circle/child/movies')}
                className="group relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center gap-2">
                  <Film className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                  <span className="text-white font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>MOVIES</span>
                </div>
              </button>

              {/* Books */}
              <button
                onClick={() => router.push('/my-circle/child/library')}
                className="group relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-500 to-orange-400 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center gap-2">
                  <BookOpen className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                  <span className="text-white font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>BOOKS</span>
                </div>
              </button>

              {/* Games */}
              <button
                onClick={() => router.push('/my-circle/child/arcade')}
                className="group relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-cyan-500 to-teal-500 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center gap-2">
                  <Gamepad2 className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                  <span className="text-white font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>GAMES</span>
                </div>
              </button>

              {/* People */}
              <button
                onClick={() => router.push('/my-circle/child/my-circle-page')}
                className="group relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center gap-2">
                  <Users className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                  <span className="text-white font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>MY CIRCLE</span>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* All Movies Row */}
        {(activeFilter === 'ALL' || activeFilter === 'Movies') && (
          <div className="px-4">
            <HorizontalScrollRow
              title="All Movies"
              items={theaterContent.videos}
              onViewAll={() => router.push('/my-circle/child/movies')}
              cardClassName="w-40"
              renderCard={(video) => (
                <StreamingMovieCard
                  video={video}
                  onClick={() => router.push(`/my-circle/child/movies/${video.id}`)}
                  progress={progressMap[video.id]?.progress}
                />
              )}
            />
          </div>
        )}

        {/* All Books Row */}
        {(activeFilter === 'ALL' || activeFilter === 'Books') && (
          <div className="px-4">
            <HorizontalScrollRow
              title="All Books"
              items={theaterContent.storybooks}
              onViewAll={() => router.push('/my-circle/child/library')}
              cardClassName="w-36"
              renderCard={(book) => (
                <StreamingBookCard
                  book={book}
                  onClick={() => router.push(`/my-circle/child/library/${book.id}`)}
                  progress={bookProgressMap[book.id]}
                />
              )}
            />
          </div>
        )}

        {/* Games CTA */}
        {(activeFilter === 'Games') && (
          <div className="px-4">
            <button
              onClick={() => router.push('/my-circle/child/arcade')}
              className="w-full h-48 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-600 flex flex-col items-center justify-center gap-3 shadow-xl shadow-cyan-500/20 hover:scale-[1.01] transition-transform"
            >
              <Gamepad2 className="w-16 h-16 text-white" strokeWidth={1.5} />
              <span className="text-white font-black text-2xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Play Games</span>
              <span className="text-cyan-200 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Memory Match, Tic-Tac-Toe & more</span>
            </button>
          </div>
        )}

        {/* People CTA */}
        {(activeFilter === 'People') && (
          <div className="px-4">
            <button
              onClick={() => router.push('/my-circle/child/my-circle-page')}
              className="w-full h-48 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex flex-col items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 hover:scale-[1.01] transition-transform"
            >
              <Users className="w-16 h-16 text-white" strokeWidth={1.5} />
              <span className="text-white font-black text-2xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>My Circle</span>
              <span className="text-emerald-200 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Call your family & friends</span>
            </button>
          </div>
        )}
      </main>

      <KidBottomNav />

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
