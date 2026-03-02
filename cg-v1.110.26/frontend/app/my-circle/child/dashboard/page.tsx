'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Search,
  Bell,
  Play,
  BookOpen,
  Gamepad2,
  Film,
  Users,
  Calendar,
  ChevronRight,
  Plus,
  Clock,
  Star,
  Sparkles,
} from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
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

const AVATAR_COLORS = [
  'from-cyan-500 to-teal-500',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-500',
];

// Coming Soon — horizontal wide-format posters from /posters folder
const COMING_SOON = [
  {
    id: 'cs-1',
    poster: '/kidsComms/posters/4D7C4F13-F90D-4EB2-A9E2-4E5DBFB68CE4.png',
  },
  {
    id: 'cs-2',
    poster: '/kidsComms/posters/91AC0B05-5FE6-436C-A85E-05A48ED20E71.png',
  },
  {
    id: 'cs-3',
    poster: '/kidsComms/posters/C7668A38-5A1C-4D9B-9F83-2366C14A2CD7.png',
  },
];

// Ayanna S Clark — Luna and Midnight ONLY (single book)
const AYANNA_BOOKS = [
  {
    ...theaterContent.storybooks.find(b => b.id === 'luna-midnight')!,
    author: 'Ayanna S Clark',
  },
];

const MOCK_EVENTS = [
  {
    id: 'e1',
    title: 'Movie Night',
    emoji: '🎬',
    date: 'Fri, Mar 7',
    time: '7:00 PM',
    color: 'from-red-500 to-orange-500',
  },
  {
    id: 'e2',
    title: 'Reading Circle',
    emoji: '📚',
    date: 'Sat, Mar 8',
    time: '3:00 PM',
    color: 'from-amber-500 to-yellow-400',
  },
];

export default function ChildDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentVideos, setRecentVideos] = useState<WatchProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress | null>>({});
  const [bookProgressMap, setBookProgressMap] = useState<Record<string, ReadingProgress | null>>({});
  const [showAddEvent, setShowAddEvent] = useState(false);

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

      const { getRecentlyWatched, getWatchProgress } = require('@/lib/watch-progress');
      const { getReadingProgress } = require('@/lib/reading-progress');

      setRecentVideos(getRecentlyWatched());

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

  // Always show Continue Watching — fallback to all videos if none in progress
  const continueVideos = recentVideos.filter(v => v.progress > 0 && v.progress < 90);
  // Demo fallback: show first 2 videos when no watch history exists
  const displayContinue = continueVideos.length > 0
    ? continueVideos.map(wp => ({
      video: theaterContent.videos.find(v => v.id === wp.videoId)!,
      progress: wp.progress,
    })).filter(x => x.video)
    : theaterContent.videos.slice(0, 2).map(v => ({ video: v, progress: 0 }));

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

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
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/60">
        <div className="px-4 py-3 flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Search">
              <Search className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center flex-shrink-0 ring-2 ring-offset-2 ring-offset-slate-950 ring-cyan-500/50`}>
              <span className="text-white font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{userInitial}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-8 pt-5 pb-6">

        {/* ─────────────────────────────────────────────
            1. CONTINUE WATCHING — TOP, large 16:9
        ───────────────────────────────────────────── */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Continue Watching
            </h2>
            <button
              onClick={() => router.push('/my-circle/child/movies')}
              className="flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              See All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
            <div className="flex gap-4 min-w-max pb-2">
              {displayContinue.map(({ video, progress }) => {
                const progressPct = Math.round(progress);
                return (
                  <button
                    key={video.id}
                    onClick={() => router.push(`/my-circle/child/movies/${video.id}`)}
                    className="relative flex-shrink-0 w-[340px] rounded-2xl overflow-hidden bg-slate-800 group hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-xl shadow-black/30"
                  >
                    {/* 16:9 poster */}
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      {video.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-slate-900 flex items-center justify-center">
                          <Film className="w-12 h-12 text-slate-600" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                      {/* Play button (visible on hover) */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
                          <Play className="w-8 h-8 text-white ml-1" fill="currentColor" />
                        </div>
                      </div>

                      {/* Progress bar */}
                      {progressPct > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                          <div
                            className="h-full bg-cyan-500 rounded-r-full"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Card info row */}
                    <div className="px-4 py-3 flex items-center gap-3">
                      {/* "With Mom" avatar */}
                      <div className="flex-shrink-0 flex items-center gap-1.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center ring-2 ring-slate-800 shadow">
                          <span className="text-white font-bold text-xs" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>M</span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <h3 className="font-bold text-white text-sm leading-tight line-clamp-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-pink-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>with Mom</span>
                          {video.duration && (
                            <>
                              <span className="text-slate-600">·</span>
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>{video.duration}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {progressPct > 0 && (
                        <span className="text-cyan-400 text-xs font-bold flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {progressPct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            2. QUICK ACTIONS — 2×2 Grid
        ───────────────────────────────────────────── */}
        <section className="px-4">
          <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'MOVIES', icon: Film, color: 'from-red-600 to-red-500', shadow: 'shadow-red-500/20', href: '/my-circle/child/movies' },
              { label: 'BOOKS', icon: BookOpen, color: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20', href: '/my-circle/child/library' },
              { label: 'GAMES', icon: Gamepad2, color: 'from-cyan-500 to-teal-500', shadow: 'shadow-cyan-500/20', href: '/my-circle/child/arcade' },
              { label: 'MY CIRCLE', icon: Users, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', href: '/my-circle/child/my-circle-page' },
            ].map(({ label, icon: Icon, color, shadow, href }) => (
              <button
                key={label}
                onClick={() => router.push(href)}
                className={`group relative h-32 rounded-2xl overflow-hidden bg-gradient-to-br ${color} shadow-lg ${shadow} hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                <div className="relative h-full flex flex-col items-center justify-center gap-2">
                  <Icon className="w-10 h-10 text-white/90" strokeWidth={1.5} />
                  <span className="text-white font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{label}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            3. UPCOMING EVENTS WIDGET
        ───────────────────────────────────────────── */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Upcoming Events
            </h2>
          </div>

          <div className="space-y-3">
            {MOCK_EVENTS.map(event => (
              <div
                key={event.id}
                className="flex items-center gap-4 bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${event.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <span className="text-2xl leading-none">{event.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="text-slate-400 text-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {event.date} · {event.time}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
              </div>
            ))}
            <button
              onClick={() => setShowAddEvent(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-700 text-slate-500 hover:border-cyan-500/50 hover:text-cyan-400 transition-all duration-200"
              style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
            >
              <Plus className="w-4 h-4" /> Add new event
            </button>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            4. COMING SOON — larger horizontal posters
               Uses <img> tag to bypass Next.js domain config
        ───────────────────────────────────────────── */}
        <section>
          <div className="px-4 flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Coming Soon
            </h2>
            <button
              onClick={() => router.push('/my-circle/child/movies')}
              className="flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-hide px-4">
            <div className="flex gap-4 min-w-max pb-2">
              {COMING_SOON.map(item => (
                <div
                  key={item.id}
                  className="relative flex-shrink-0 w-72 rounded-2xl overflow-hidden bg-slate-800 hover:scale-[1.02] transition-transform duration-200 shadow-xl shadow-black/30 group"
                >
                  {/* True 16:9 aspect using padding trick, <img> bypasses Next.js domain restriction */}
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.poster}
                      alt="Coming soon"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* Badge */}
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-cyan-500 text-white text-[10px] font-bold uppercase tracking-wide shadow-lg">
                        Coming Soon
                      </span>
                    </div>
                    {/* Bottom label */}
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                      <span className="text-white/80 text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Watch for it!</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            5. FEATURED AUTHOR — Ayanna S Clark
               Single-column portrait book list
        ───────────────────────────────────────────── */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                Featured Author
              </p>
            </div>
            <button
              onClick={() => router.push('/my-circle/child/library')}
              className="flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Library <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Author bio */}
          <div className="bg-gradient-to-br from-amber-950/40 to-slate-800/60 rounded-2xl p-4 mb-4 border border-amber-800/30">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500/30 flex-shrink-0 shadow-lg shadow-amber-500/20">
                <img
                  src="/kidsComms/posters/authors/ayaanasclark.jpg"
                  alt="Ayanna S Clark"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-white font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Ayanna S Clark</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                  <span className="text-amber-400 text-xs ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>Top Author</span>
                </div>
                <p className="text-slate-300 text-xs mt-2 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Ayanna S. Clark is a Compton-born illustrator and author who creates magical stories that inspire confidence, imagination, and empowerment in young readers. Through vibrant art and heartfelt storytelling, she brings characters to life in ways that encourage children to see the magic within themselves. ✨
                </p>
              </div>
            </div>
          </div>

        </section>

        {/* ─────────────────────────────────────────────
            6. FEATURED PROMO — Luna and Midnight
        ───────────────────────────────────────────── */}
        <section className="px-4 pb-12">
          <div className="bg-slate-900/50 rounded-3xl overflow-hidden border border-slate-800/60 shadow-2xl">
            <div className="relative aspect-[16/9] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/kidsComms/posters/featuredartistpromo.png"
                alt="Luna and Midnight Promo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>

            <div className="p-6">
              <h3 className="text-2xl font-black text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Luna has found a glowing key… and it unlocks the stars. ✨
              </h3>

              <div className="space-y-4">
                <p className="text-slate-300 text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                  When the sky begins to whisper secrets, Luna and her brave cat Midnight step into a magical adventure filled with constellations, courage, and a little bit of mystery.
                </p>

                <p className="text-cyan-400 font-bold text-base italic" style={{ fontFamily: 'Inter, sans-serif' }}>
                  If you love magic, friendship, and nighttime adventures, this is your next favorite story.
                </p>

                <button
                  onClick={() => router.push('/my-circle/child/library/luna-midnight')}
                  className="w-full sm:w-auto mt-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-2xl text-white font-black text-lg shadow-xl shadow-cyan-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                >
                  READ NOW
                </button>
              </div>
            </div>
          </div>
        </section>

      </main>

      <KidBottomNav />

      {/* ── Add Event Bottom Sheet ── */}
      {showAddEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
          onClick={() => setShowAddEvent(false)}
        >
          <div
            className="w-full bg-slate-900 rounded-t-3xl p-6 border-t border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Add Event
            </h3>
            <div className="space-y-3">
              {[
                { emoji: '🎬', label: 'Movie Night', color: 'from-red-600 to-red-500' },
                { emoji: '📚', label: 'Reading Time', color: 'from-amber-500 to-orange-400' },
                { emoji: '🎮', label: 'Game Session', color: 'from-cyan-500 to-teal-500' },
                { emoji: '📞', label: 'Family Call', color: 'from-emerald-500 to-teal-500' },
              ].map(type => (
                <button
                  key={type.label}
                  onClick={() => setShowAddEvent(false)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${type.color} hover:opacity-90 active:scale-[0.98] transition-all`}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-white font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{type.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddEvent(false)}
              className="w-full mt-4 py-3 text-slate-400 text-sm hover:text-slate-300 transition-colors"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Cancel
            </button>
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
