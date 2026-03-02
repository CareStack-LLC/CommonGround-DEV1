'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KidMovieCard } from '@/components/kidcoms/kid-movie-card';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { theaterContent, VideoCategory, videoCategories } from '@/lib/theater-content';
import { Film, Search, Heart, TrendingUp, Clock } from 'lucide-react';

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
      const { getVideoStats, getContinueWatching, getWatchProgress, isFavorite, getFavorites } = require('@/lib/watch-progress');
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Film className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-xl" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Movies
              </h1>
              <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                {stats.totalWatched} watched · {stats.totalCompleted} completed
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              style={{ fontFamily: 'Inter, sans-serif' }}
            />
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${selectedCategory === 'all'
              ? 'bg-gradient-to-r from-teal-500 to-violet-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            All
          </button>

          {continueWatching.length > 0 && (
            <button
              onClick={() => setSelectedCategory('continue')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${selectedCategory === 'continue'
                ? 'bg-gradient-to-r from-teal-500 to-violet-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              <Clock className="w-3.5 h-3.5" />
              Continue
            </button>
          )}

          <button
            onClick={() => setSelectedCategory('favorites')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 flex items-center gap-1.5 ${selectedCategory === 'favorites'
              ? 'bg-gradient-to-r from-teal-500 to-violet-500 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <Heart className="w-3.5 h-3.5" />
            Favorites
          </button>

          {(Object.keys(videoCategories) as VideoCategory[]).map((cat) => {
            const category = videoCategories[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${selectedCategory === cat
                  ? 'bg-gradient-to-r from-teal-500 to-violet-500 text-white'
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
        {filteredVideos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-slate-600 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
              {searchQuery ? 'No movies found' : 'No movies in this category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredVideos.map((video) => {
              const progress = progressMap[video.id] ?? null;
              const favorite = favoritesSet.has(video.id);

              return (
                <div key={video.id} className="relative">
                  <KidMovieCard
                    video={video}
                    onClick={() => handleVideoSelect(video)}
                    progress={progress?.progress}
                    isFavorite={favorite}
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
