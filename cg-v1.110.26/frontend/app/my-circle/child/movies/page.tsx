'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StreamingMovieCard } from '@/components/kidcoms/streaming-movie-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { theaterContent, VideoCategory, videoCategories } from '@/lib/theater-content';
import { Film, Search, Heart, Clock, Sparkles } from 'lucide-react';

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
  const [stats, setStats] = useState<VideoStats>({ totalWatched: 0, totalCompleted: 0, totalMinutes: 0, favorites: [] });
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress | null>>({});
  const [favoritesSet, setFavoritesSet] = useState<Set<string>>(new Set());

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

      // Load watch state only on client after auth passes
      const { getVideoStats, getContinueWatching, getWatchProgress, getFavorites, toggleFavorite } = require('@/lib/watch-progress');
      setStats(getVideoStats());
      setContinueWatching(getContinueWatching());

      const videos = theaterContent.videos;
      const map: Record<string, WatchProgress | null> = {};
      videos.forEach(v => { map[v.id] = getWatchProgress(v.id); });
      setProgressMap(map);

      const favIds: string[] = getFavorites();
      setFavoritesSet(new Set(favIds));

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  function handleVideoSelect(video: typeof theaterContent.videos[0]) {
    router.push(`/my-circle/child/movies/${video.id}`);
  }

  function handleFavoriteToggle(videoId: string) {
    const { toggleFavorite } = require('@/lib/watch-progress');
    const newState = toggleFavorite(videoId);

    setFavoritesSet(prev => {
      const next = new Set(prev);
      if (newState) {
        next.add(videoId);
      } else {
        next.delete(videoId);
      }
      return next;
    });
  }

  const videos = theaterContent.videos;

  // Filter videos
  const filteredVideos = videos.filter(video => {
    // Category filter
    if (selectedCategory === 'favorites') {
      if (!favoritesSet.has(video.id)) return false;
    } else if (selectedCategory === 'continue') {
      if (!continueWatching.find(p => p.videoId === video.id)) return false;
    } else if (selectedCategory !== 'all' && video.category !== selectedCategory) {
      return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        video.title.toLowerCase().includes(query) ||
        video.description?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Loading Movies...
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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Film className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-white text-2xl mb-0.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Movies
              </h1>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  {videos.length} titles
                </span>
                {stats.totalWatched > 0 && (
                  <>
                    <span>•</span>
                    <span>{stats.totalWatched} watched</span>
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
              placeholder="Search for movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>
      </header>

      {/* Category Tabs - Dark theme */}
      <div className="sticky top-[132px] z-30 px-4 py-3 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
            )}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            All Movies
          </button>

          {continueWatching.length > 0 && (
            <button
              onClick={() => setSelectedCategory('continue')}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2',
                selectedCategory === 'continue'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              )}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Clock className="w-4 h-4" />
              Continue Watching
            </button>
          )}

          {favoritesSet.size > 0 && (
            <button
              onClick={() => setSelectedCategory('favorites')}
              className={cn(
                'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2',
                selectedCategory === 'favorites'
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/30'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              )}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Heart className="w-4 h-4" />
              My Favorites
            </button>
          )}

          {(Object.keys(videoCategories) as VideoCategory[]).map((cat) => {
            const category = videoCategories[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200',
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg shadow-red-500/30'
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
              {selectedCategory === 'continue' && 'Continue Watching'}
              {selectedCategory === 'favorites' && 'My Favorites'}
              {selectedCategory !== 'continue' && selectedCategory !== 'favorites' && videoCategories[selectedCategory as VideoCategory]?.name}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {filteredVideos.length} {filteredVideos.length === 1 ? 'movie' : 'movies'}
            </p>
          </div>
        )}

        {/* Movies Grid - Portrait layout */}
        {filteredVideos.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Film className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {searchQuery ? 'No movies found' : 'No movies here yet'}
            </h3>
            <p className="text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              {searchQuery ? 'Try searching for something else' : 'Check back later for more content'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredVideos.map((video) => {
              const progress = progressMap[video.id] ?? null;
              const favorite = favoritesSet.has(video.id);

              return (
                <StreamingMovieCard
                  key={video.id}
                  video={video}
                  onClick={() => handleVideoSelect(video)}
                  onFavoriteToggle={() => handleFavoriteToggle(video.id)}
                  progress={progress?.progress}
                  isFavorite={favorite}
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
