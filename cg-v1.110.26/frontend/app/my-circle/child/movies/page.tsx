'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Users, Phone, Video, X, Play, Star, Sparkles } from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidSpaceHeader } from '@/components/kidcoms/kidspace-header';
import { FeaturedHeroBanner } from '@/components/kidcoms/featured-hero-banner';
import { HorizontalScrollRow } from '@/components/kidcoms/horizontal-scroll-row';
import { StreamingMovieCard } from '@/components/kidcoms/streaming-movie-card';
import { OriginalsBadge } from '@/components/kidcoms/originals-badge';
import { MovieDetailModal } from '@/components/kidcoms/movie-detail-modal';
import { kidcomsAPI } from '@/lib/api';
import { theaterContent, VideoCategory, videoCategories } from '@/lib/theater-content';
import type { VideoContent } from '@/lib/theater-content';
import type { WatchProgress, VideoStats } from '@/lib/watch-progress';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ChildUserData {
  userId: string;
  childId: string;
  childName: string;
  avatarId?: string;
  familyFileId: string;
}

interface ChildContact {
  contact_id: string;
  display_name: string;
  contact_type: 'parent_a' | 'parent_b' | 'circle';
  relationship?: string;
  can_video_call: boolean;
  can_voice_call: boolean;
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

  // Movie detail modal state
  const [selectedMovie, setSelectedMovie] = useState<VideoContent | null>(null);

  // API-only video list (no hardcoded fallback)
  const [allVideos, setAllVideos] = useState<VideoContent[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);

  // Watch Together state
  const [contacts, setContacts] = useState<ChildContact[]>([]);
  const [watchTogetherMovie, setWatchTogetherMovie] = useState<any | null>(null);
  const [isStartingCall, setIsStartingCall] = useState(false);

  // Fetch movies from KidSpace API only — no hardcoded fallback
  useEffect(() => {
    const fetchApiMovies = async () => {
      setIsLoadingVideos(true);
      try {
        const res = await fetch(`${API_BASE}/api/v1/kidspace/movies?limit=50`);
        if (res.ok) {
          const data = await res.json();
          const items = data.movies || data || [];
          const genreMap: Record<string, VideoCategory> = {
            comedy: 'comedy', adventure: 'adventure', educational: 'educational',
            animation: 'animation', action: 'action', family: 'family',
            commonground_originals: 'commonground_originals',
          };
          const apiMapped: VideoContent[] = items.map((m: any) => ({
            id: m.id,
            title: m.title,
            url: m.video_url || '',
            thumbnail: m.poster_url || '',
            duration: m.duration_minutes ? `${m.duration_minutes} min` : undefined,
            description: m.description || '',
            category: genreMap[(m.genre_name || 'comedy').toLowerCase()] || 'comedy',
            ageRange: m.age_min && m.age_max ? `${m.age_min}-${m.age_max}` : '3-12',
          }));
          setAllVideos(apiMapped);
        }
      } catch (err) {
        console.error("[KidSpace Movies] API fetch failed:", err);
      } finally {
        setIsLoadingVideos(false);
      }
    };
    fetchApiMovies();
  }, []);

  // Auto-rotate featured banner
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex(i => (i + 1) % allVideos.length);
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

      // Load contacts
      const contactsStr = localStorage.getItem('child_contacts');
      if (contactsStr) {
        try { setContacts(JSON.parse(contactsStr) as ChildContact[]); } catch { setContacts([]); }
      }

      const { getVideoStats, getContinueWatching, getWatchProgress, getFavorites } = require('@/lib/watch-progress');
      setStats(getVideoStats());
      setContinueWatching(getContinueWatching());

      const map: Record<string, WatchProgress | null> = {};
      allVideos.forEach(v => { map[v.id] = getWatchProgress(v.id); });
      setProgressMap(map);
      setFavoritesSet(new Set(getFavorites() as string[]));

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  const featuredVideo = allVideos.length > 0 ? allVideos[featuredIndex % allVideos.length] : null;

  const filteredVideos = allVideos.filter(video => {
    if (selectedCategory === 'favorites') return favoritesSet.has(video.id);
    if (selectedCategory === 'continue') return continueWatching.some(p => p.videoId === video.id);
    if (selectedCategory !== 'all' && video.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return video.title.toLowerCase().includes(q) || video.description?.toLowerCase().includes(q);
    }
    return true;
  });

  // Group videos by genre for the Netflix-style rows
  const videosByGenre = useMemo(() => {
    const grouped: Record<VideoCategory, VideoContent[]> = {
      comedy: [],
      adventure: [],
      educational: [],
      animation: [],
      action: [],
    };
    allVideos.forEach(v => {
      if (grouped[v.category]) {
        grouped[v.category].push(v);
      }
    });
    return grouped;
  }, []);

  async function handleWatchTogetherCall(contact: ChildContact, movie: any) {
    if (isStartingCall) return;
    setIsStartingCall(true);
    try {
      const response = await kidcomsAPI.createChildSession({
        contact_type: contact.contact_type,
        contact_id: contact.contact_id,
        session_type: 'video_call',
      });

      localStorage.setItem('child_call_session', JSON.stringify({
        sessionId: response.session_id,
        roomUrl: response.room_url,
        token: response.token,
        participantName: response.participant_name,
        contactName: contact.display_name,
        callType: 'video',
        autoPlayMedia: {
          type: 'video',
          id: movie.id,
          title: movie.title
        }
      }));

      router.push(`/my-circle/child/call?session=${response.session_id}`);
    } catch (error) {
      console.error('Failed to start watch together call:', error);
      alert('Could not start call. Please try again!');
      setIsStartingCall(false);
    }
  }

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Loading...</div>
      </div>
    );
  }

  // Determine if we are in the "browse all" home view vs filtered/search
  const isHomeView = selectedCategory === 'all' && !searchQuery;

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--portal-background)' }}>
      {/* Header */}
      <KidSpaceHeader
        title="Movies"
        subtitle={stats.totalWatched > 0 ? `${stats.totalWatched} watched · ${stats.totalCompleted} completed` : 'Watch something fun!'}
        userInitial={userInitial}
        avatarGradient="from-red-500 to-orange-500"
        actions={
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--portal-surface)', color: 'var(--portal-muted)' }}
          >
            <Search className="w-4 h-4" />
          </button>
        }
      >
        {/* Search Bar */}
        {showSearch && (
          <div className="relative px-4 pb-2">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--portal-muted)' }} />
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              style={{ fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)', color: 'var(--portal-text)' }}
            />
          </div>
        )}

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
                  ? 'bg-gradient-to-r from-[#3DAA8A] to-[#349878] text-white shadow-lg shadow-[#3DAA8A]/30'
                  : ''
                  }`}
                style={selectedCategory !== key
                  ? { fontFamily: 'Inter, sans-serif', background: 'var(--portal-surface)', color: 'var(--portal-muted)' }
                  : { fontFamily: 'Inter, sans-serif' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </KidSpaceHeader>

      <main className="space-y-6 pt-4 pb-6">

        {/* ── HERO BANNER ── Large cinematic banner for the featured video */}
        {isHomeView && featuredVideo && (
          <section className="relative px-4">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{ minHeight: '320px' }}
            >
              {/* Backdrop image */}
              <div className="absolute inset-0">
                {featuredVideo.thumbnail ? (
                  <img
                    src={featuredVideo.thumbnail}
                    alt={featuredVideo.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full" style={{ background: 'var(--portal-surface)' }} />
                )}
                {/* Cinematic gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
              </div>

              {/* Hero content */}
              <div className="relative z-10 flex flex-col justify-end p-6" style={{ minHeight: '320px' }}>
                {/* Badge row */}
                <div className="flex items-center gap-2 mb-3">
                  <OriginalsBadge size="md" />
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {(4.5 - featuredIndex * 0.1).toFixed(1)}
                  </span>
                  {featuredVideo.ageRange && (
                    <span className="text-[10px] font-bold text-white/70 px-2 py-0.5 rounded border border-white/20">
                      {featuredVideo.ageRange}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2
                  className="text-3xl md:text-4xl font-black text-white mb-2 leading-tight drop-shadow-lg"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  {featuredVideo.title}
                </h2>

                {/* Description */}
                {featuredVideo.description && (
                  <p
                    className="text-sm text-white/80 mb-4 max-w-md line-clamp-2"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {featuredVideo.description}
                  </p>
                )}

                {/* CTA buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => router.push(`/my-circle/child/movies/${featuredVideo.id}`)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-red-500/40 active:scale-95"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    }}
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                    Watch Now
                  </button>
                  <button
                    onClick={() => setWatchTogetherMovie(featuredVideo)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white/90 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    <Users className="w-4 h-4" />
                    Watch Together
                  </button>
                  <button
                    onClick={() => setSelectedMovie(featuredVideo)}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white/90 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      background: 'rgba(255,255,255,0.15)',
                      border: '1px solid rgba(255,255,255,0.25)',
                    }}
                  >
                    More Info
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Empty state when no movies uploaded */}
        {!isLoadingVideos && allVideos.length === 0 && (
          <section className="px-4 py-16 text-center">
            <div className="text-4xl mb-3 opacity-50">🎬</div>
            <h3 className="text-lg font-semibold text-white/80 mb-1">No Movies Yet</h3>
            <p className="text-sm text-white/50">Movies will appear here once added by the CommonGround team.</p>
          </section>
        )}

        {/* ── COMMONGROUND ORIGINALS ROW ── */}
        {isHomeView && allVideos.length > 0 && (
          <section className="px-4">
            <HorizontalScrollRow
              title="CommonGround Originals"
              items={allVideos}
              showViewAll={false}
              cardClassName="w-36"
              renderCard={(video) => (
                <div className="relative group">
                  {/* Glowing border effect for originals */}
                  <div
                    className="absolute -inset-[2px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                    style={{ background: 'linear-gradient(135deg, #3DAA8A, #4BA8C8, #3DAA8A)' }}
                  />
                  <div className="relative rounded-xl overflow-hidden" style={{ border: '2px solid transparent', background: 'var(--portal-surface)' }}>
                    <button
                      onClick={() => setSelectedMovie(video)}
                      className="w-full focus:outline-none"
                    >
                      <div className="relative aspect-[2/3]">
                        {video.thumbnail ? (
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--portal-surface)' }}>
                            <Play className="w-8 h-8" style={{ color: 'var(--portal-muted)' }} />
                          </div>
                        )}
                        {/* Originals badge overlay */}
                        <div className="absolute top-2 left-2 z-10">
                          <OriginalsBadge size="sm" />
                        </div>
                        {/* Bottom gradient */}
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                        {/* Title over image */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <p className="text-white text-xs font-bold line-clamp-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                            {video.title}
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            />
          </section>
        )}

        {/* ── CONTINUE WATCHING ROW ── */}
        {continueWatching.length > 0 && isHomeView && (
          <section className="px-4">
            <HorizontalScrollRow
              title="Continue Watching"
              items={continueWatching}
              onViewAll={() => setSelectedCategory('continue')}
              cardClassName="w-40"
              renderCard={(wp) => {
                const video = allVideos.find(v => v.id === wp.videoId);
                if (!video) return null;
                return (
                  <StreamingMovieCard
                    video={video}
                    onClick={() => setSelectedMovie(video)}
                    progress={wp.progress}
                    isFavorite={favoritesSet.has(video.id)}
                    onWatchTogether={() => setWatchTogetherMovie(video)}
                  />
                );
              }}
            />
          </section>
        )}

        {/* ── GENRE ROWS (Netflix-style) ── Only on home view */}
        {isHomeView && (
          <>
            {(Object.entries(videoCategories) as [VideoCategory, typeof videoCategories[VideoCategory]][]).map(([category, meta]) => {
              const genreVideos = videosByGenre[category];
              if (!genreVideos || genreVideos.length === 0) return null;
              return (
                <section key={category} className="px-4">
                  <HorizontalScrollRow
                    title={`${meta.emoji} ${meta.name}`}
                    items={genreVideos}
                    onViewAll={() => setSelectedCategory(category)}
                    cardClassName="w-40"
                    renderCard={(video) => (
                      <StreamingMovieCard
                        video={video}
                        onClick={() => setSelectedMovie(video)}
                        progress={progressMap[video.id]?.progress}
                        isFavorite={favoritesSet.has(video.id)}
                        onWatchTogether={() => setWatchTogetherMovie(video)}
                      />
                    )}
                  />
                </section>
              );
            })}
          </>
        )}

        {/* ── WATCH TOGETHER CTA CARD ── */}
        {isHomeView && (
          <section className="px-4">
            <div
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--portal-surface), var(--portal-background))',
                border: '1px solid var(--portal-border)',
              }}
            >
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'radial-gradient(circle at 20% 50%, var(--portal-primary) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--portal-primary) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
              {/* Glow accent */}
              <div
                className="absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20"
                style={{ background: 'var(--portal-primary)' }}
              />

              <div className="relative z-10 flex items-center gap-5 p-6">
                {/* Icon */}
                <div
                  className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #4BA8C8, #3DAA8A)',
                    boxShadow: '0 8px 32px rgba(75, 168, 200, 0.3)',
                  }}
                >
                  <span className="text-3xl">🍿</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3
                    className="text-lg font-black mb-1"
                    style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}
                  >
                    Watch with someone!
                  </h3>
                  <p
                    className="text-xs leading-relaxed mb-3"
                    style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}
                  >
                    Pick a movie and invite someone from your circle to watch together on a video call.
                  </p>
                  <button
                    onClick={() => {
                      // Pick the first video as a default for the Watch Together flow
                      if (allVideos.length > 0) {
                        setWatchTogetherMovie(allVideos[0]);
                      }
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
                    style={{
                      fontFamily: 'Space Grotesk, sans-serif',
                      background: 'linear-gradient(135deg, #4BA8C8, #3DAA8A)',
                      boxShadow: '0 4px 16px rgba(75, 168, 200, 0.3)',
                    }}
                  >
                    <Users className="w-4 h-4" />
                    Start Watch Party
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── FILTERED / SEARCH GRID ── Shown when a category or search is active */}
        {!isHomeView && (
          <section className="px-4">
            <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              {filteredVideos.length} {filteredVideos.length === 1 ? 'Movie' : 'Movies'}
            </h2>

            {filteredVideos.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎬</div>
                <p className="font-medium" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  {searchQuery ? 'No movies found' : 'No movies in this category'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredVideos.map(video => (
                  <StreamingMovieCard
                    key={video.id}
                    video={video}
                    onClick={() => setSelectedMovie(video)}
                    progress={progressMap[video.id]?.progress}
                    isFavorite={favoritesSet.has(video.id)}
                    onWatchTogether={() => setWatchTogetherMovie(video)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <KidBottomNav />

      {/* ── Movie Detail Modal ── */}
      <MovieDetailModal
        video={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onWatchNow={(v) => router.push(`/my-circle/child/movies/${v.id}`)}
        onWatchTogether={(v) => { setSelectedMovie(null); setWatchTogetherMovie(v); }}
        progress={selectedMovie ? progressMap[selectedMovie.id] : null}
        rating={selectedMovie ? 4.5 - allVideos.indexOf(selectedMovie) * 0.1 : 4.5}
      />

      {/* ── Watch Together Contact Picker Modal ── */}
      {watchTogetherMovie && (
        <div
          className="fixed inset-0 z-50 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'var(--portal-overlay)' }}
          onClick={() => setWatchTogetherMovie(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--portal-surface-elevated)', border: '1px solid var(--portal-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--portal-divider)', background: 'var(--portal-surface-elevated)' }}>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                  Watch Together 🎬
                </h3>
                <p className="text-xs truncate max-w-[240px]" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  Invite someone to watch <span className="text-[#4BA8C8] font-bold">{watchTogetherMovie.title}</span>
                </p>
              </div>
              <button
                onClick={() => setWatchTogetherMovie(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ background: 'var(--portal-surface)', color: 'var(--portal-muted)' }}
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contacts List */}
            <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-10 px-6">
                  <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                    No contacts found. Ask a parent to add someone to your circle!
                  </p>
                </div>
              ) : (
                contacts.map(contact => {
                  const avatarColor = ['from-[#3DAA8A] to-emerald-500', 'from-[#4BA8C8] to-[#3DAA8A]', 'from-amber-500 to-orange-400', 'from-red-500 to-orange-500', 'from-pink-500 to-rose-500', 'from-[#2D6A8F] to-purple-500'][contact.display_name.length % 6];

                  return (
                    <button
                      key={contact.contact_id}
                      onClick={() => handleWatchTogetherCall(contact, watchTogetherMovie)}
                      disabled={!contact.can_video_call}
                      className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                    >
                      <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br ${avatarColor} shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <span className="text-white font-bold text-lg">{contact.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h4 className="font-bold text-sm truncate" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                          {contact.display_name}
                        </h4>
                        <p className="text-xs capitalize" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                          {contact.relationship?.replace('_', ' ') || 'Circle Member'}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-[#4BA8C8]/10 flex items-center justify-center text-[#4BA8C8] group-hover:bg-[#4BA8C8] group-hover:text-white transition-colors">
                        <Video className="w-5 h-5" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6" style={{ borderTop: '1px solid var(--portal-divider)', background: 'var(--portal-surface)' }}>
              <button
                onClick={() => setWatchTogetherMovie(null)}
                className="w-full py-4 rounded-2xl font-bold transition-colors"
                style={{ fontFamily: 'Inter, sans-serif', background: 'var(--portal-surface-hover)', color: 'var(--portal-text-light)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calling overlay */}
      {isStartingCall && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[60]">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4BA8C8] to-[#3DAA8A] flex items-center justify-center mx-auto animate-pulse shadow-2xl shadow-[#4BA8C8]/20">
              <Video className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Connecting...
              </h2>
              <p className="text-slate-300" style={{ fontFamily: 'Inter, sans-serif' }}>
                Getting ready to watch together! 🎬
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
