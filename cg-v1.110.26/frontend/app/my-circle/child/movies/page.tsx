'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { FeaturedHeroBanner } from '@/components/kidcoms/featured-hero-banner';
import { HorizontalScrollRow } from '@/components/kidcoms/horizontal-scroll-row';
import { StreamingMovieCard } from '@/components/kidcoms/streaming-movie-card';
import { theaterContent, VideoCategory, videoCategories } from '@/lib/theater-content';
import type { WatchProgress, VideoStats } from '@/lib/watch-progress';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

export default function MoviesPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | 'all' | 'favorites' | 'continue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [stats, setStats] = useState<VideoStats>({ totalWatched: 0, totalCompleted: 0, totalMinutes: 0, favorites: [] });
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress | null>>({});
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());
  const [featuredIndex, setFeaturedIndex] = useState(0);

  // Auto-rotate featured banner
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex(i => (i + 1) % theaterContent.videos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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

      const { getVideoStats, getContinueWatching, getWatchProgress, getFavorites } = require('@/lib/watch-progress');
      setStats(getVideoStats());
      setContinueWatching(getContinueWatching());

      const map: Record<string, WatchProgress | null> = {};
      theaterContent.videos.forEach(v => { map[v.id] = getWatchProgress(v.id); });
      setProgressMap(map);
      setFavoritesSet(new Set(getFavorites() as string[]));

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  const featuredVideo = theaterContent.videos[featuredIndex];

  const filteredVideos = theaterContent.videos.filter(video => {
    if (selectedCategory === 'favorites') return favoritesSet.has(video.id);
    if (selectedCategory === 'continue') return continueWatching.some(p => p.videoId === video.id);
    if (selectedCategory !== 'all' && video.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return video.title.toLowerCase().includes(q) || video.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Dark Header */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-white text-lg">🎬</span>
              </div>
              <div>
                <h1 className="font-black text-white text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Movies</h1>
                <p className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {stats.totalWatched > 0 ? `${stats.totalWatched} watched · ${stats.totalCompleted} completed` : 'Watch something fun!'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center ring-2 ring-offset-2 ring-offset-slate-950 ring-red-500/50">
                <span className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{userInitial}</span>
              </div>
            </div>
          </div>

          {/* Search Bar — toggles */}
          {showSearch && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
            </div>
          )}
        </div>

        {/* Category Pills */}
        <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            {[
              { key: 'all', label: 'All' },
              { key: 'continue', label: '▶ Continue' },
              { key: 'favorites', label: '♥ Favorites' },
              ...Object.entries(videoCategories).map(([key, cat]) => ({ key, label: `${cat.emoji} ${cat.name}` })),
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key as any)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${selectedCategory === key
                  ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="space-y-6 pt-4 pb-6">
        {/* Featured Hero Banner — auto-rotates */}
        {!searchQuery && selectedCategory === 'all' && (
          <div className="px-4">
            <div className="min-h-[300px] sm:min-h-[380px]">
              <FeaturedHeroBanner
                content={{
                  id: featuredVideo.id,
                  title: featuredVideo.title,
                  cover: featuredVideo.thumbnail,
                  description: featuredVideo.description,
                  duration: featuredVideo.duration ? parseInt(featuredVideo.duration) : undefined,
                  type: 'video',
                  category: featuredVideo.category,
                  rating: 4.5 - (featuredIndex * 0.1),
                  ratingCount: 2400 - (featuredIndex * 200),
                }}
                badge={featuredIndex === 0 ? '🔥 Trending' : featuredIndex === 1 ? '⭐ Popular' : '✨ Featured'}
                onPlay={() => router.push(`/my-circle/child/movies/${featuredVideo.id}`)}
                onFavorite={() => { }}
                isFavorite={favoritesSet.has(featuredVideo.id)}
              />
            </div>
            {/* Dots indicator */}
            <div className="flex gap-1.5 justify-center mt-3">
              {theaterContent.videos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setFeaturedIndex(i)}
                  className={`rounded-full transition-all duration-300 ${i === featuredIndex ? 'w-6 h-1.5 bg-cyan-500' : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-500'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Continue Watching Horizontal Row */}
        {continueWatching.length > 0 && selectedCategory === 'all' && !searchQuery && (
          <div className="px-4">
            <HorizontalScrollRow
              title="Continue Watching"
              items={continueWatching}
              onViewAll={() => setSelectedCategory('continue')}
              cardClassName="w-40"
              renderCard={(wp) => {
                const video = theaterContent.videos.find(v => v.id === wp.videoId);
                if (!video) return null;
                return (
                  <StreamingMovieCard
                    video={video}
                    onClick={() => router.push(`/my-circle/child/movies/${video.id}`)}
                    progress={wp.progress}
                    isFavorite={favoritesSet.has(video.id)}
                  />
                );
              }}
            />
          </div>
        )}

        {/* Main Movies Grid */}
        <section className="px-4">
          {selectedCategory === 'all' && !searchQuery ? (
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              All Movies
            </h2>
          ) : (
            <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {filteredVideos.length} {filteredVideos.length === 1 ? 'Movie' : 'Movies'}
            </h2>
          )}

          {filteredVideos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">🎬</div>
              <p className="text-slate-400 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                {searchQuery ? 'No movies found' : 'No movies in this category'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredVideos.map(video => (
                <StreamingMovieCard
                  key={video.id}
                  video={video}
                  onClick={() => router.push(`/my-circle/child/movies/${video.id}`)}
                  progress={progressMap[video.id]?.progress}
                  isFavorite={favoritesSet.has(video.id)}
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
