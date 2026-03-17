'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Video,
  Phone,
  MessageCircle,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import { KidBottomNav } from '@/components/kidcoms/kid-bottom-nav';
import { KidSpaceHeader } from '@/components/kidcoms/kidspace-header';
import { KidComsLogo } from '@/components/kidcoms/kidcoms-logo';
import { FeaturedHeroBanner } from '@/components/kidcoms/featured-hero-banner';
import { ARIAHelper } from '@/components/kidcoms/aria-helper';
import { MovieDetailModal } from '@/components/kidcoms/movie-detail-modal';
import { theaterContent } from '@/lib/theater-content';
import type { VideoContent } from '@/lib/theater-content';
import { useKidSpaceTheme } from '@/components/kidcoms/kidspace-theme-provider';
import {
  circleMessagesAPI,
  circleCallsAPI,
  childEventsAPI,
  type CircleConversationData,
  type ChildCallHistoryEntry,
  type ChildEvent,
  type ChildEventCreateRequest,
} from '@/lib/api';
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
  'from-[#4BA8C8] to-[#3DAA8A]',
  'from-red-500 to-orange-500',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-[#3DAA8A]',
];

const CONTACT_COLORS = [
  'from-emerald-400 to-[#3DAA8A]',
  'from-pink-400 to-rose-500',
  'from-blue-400 to-indigo-500',
  'from-amber-400 to-orange-500',
  'from-purple-400 to-[#2D6A8F]',
];

const COMING_SOON = [
  { id: 'cs-1', poster: '/kidsComms/posters/4D7C4F13-F90D-4EB2-A9E2-4E5DBFB68CE4.png' },
  { id: 'cs-2', poster: '/kidsComms/posters/91AC0B05-5FE6-436C-A85E-05A48ED20E71.png' },
  { id: 'cs-3', poster: '/kidsComms/posters/C7668A38-5A1C-4D9B-9F83-2366C14A2CD7.png' },
];

const EVENT_TYPES = [
  { key: 'movie_night' as const, emoji: '🎬', label: 'Movie Night', color: 'from-red-600 to-red-500' },
  { key: 'reading_time' as const, emoji: '📚', label: 'Reading Time', color: 'from-amber-500 to-orange-400' },
  { key: 'game_session' as const, emoji: '🎮', label: 'Game Session', color: 'from-[#4BA8C8] to-[#3DAA8A]' },
  { key: 'family_call' as const, emoji: '📞', label: 'Family Call', color: 'from-emerald-500 to-[#3DAA8A]' },
];

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatEventTime(isoStr: string): { date: string; time: string } {
  const d = new Date(isoStr);
  return {
    date: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  };
}

function getEventEmoji(type: string): string {
  const map: Record<string, string> = {
    movie_night: '🎬', reading_time: '📚', game_session: '🎮', family_call: '📞', custom: '📅',
  };
  return map[type] || '📅';
}

function getEventColor(type: string): string {
  const map: Record<string, string> = {
    movie_night: 'from-red-500 to-orange-500', reading_time: 'from-amber-500 to-yellow-400',
    game_session: 'from-[#4BA8C8] to-[#3DAA8A]', family_call: 'from-emerald-500 to-[#3DAA8A]',
    custom: 'from-purple-500 to-indigo-500',
  };
  return map[type] || 'from-slate-500 to-slate-600';
}

export default function ChildDashboardPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<ChildUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [recentVideos, setRecentVideos] = useState<WatchProgress[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress | null>>({});
  const [bookProgressMap, setBookProgressMap] = useState<Record<string, ReadingProgress | null>>({});
  const [recentMessages, setRecentMessages] = useState<CircleConversationData[]>([]);

  // Real API data
  const [recentCalls, setRecentCalls] = useState<ChildCallHistoryEntry[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [upcomingEvents, setUpcomingEvents] = useState<ChildEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Add event modal
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [eventStep, setEventStep] = useState<'type' | 'details'>('type');
  const [newEventType, setNewEventType] = useState<ChildEventCreateRequest['event_type']>('custom');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventParents, setNewEventParents] = useState<'both' | 'parent_a' | 'parent_b' | 'none'>('both');
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventCreated, setEventCreated] = useState(false);

  useEffect(() => {
    validateAndLoadUser();
  }, []);

  async function validateAndLoadUser() {
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

      // Load real data in parallel (non-blocking)
      loadRecentMessages();
      loadRecentCalls();
      loadUpcomingEvents();
    } catch (error) {
      console.error('Failed to load user:', error);
      if (typeof localStorage !== 'undefined') localStorage.clear();
      router.push('/my-circle/child');
    }
  }

  async function loadRecentMessages() {
    try {
      const convos = await circleMessagesAPI.getConversationsAsChild();
      setRecentMessages(convos.items.slice(0, 3));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }

  async function loadRecentCalls() {
    try {
      const calls = await circleCallsAPI.getChildCallHistory(5, 0);
      setRecentCalls(calls);
    } catch (err) {
      console.error('Failed to load call history:', err);
    } finally {
      setCallsLoading(false);
    }
  }

  async function loadUpcomingEvents() {
    try {
      const events = await childEventsAPI.getUpcoming(10);
      setUpcomingEvents(events);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setEventsLoading(false);
    }
  }

  function openAddEventWithType(type: ChildEventCreateRequest['event_type'], label: string) {
    setNewEventType(type);
    setNewEventTitle(label);
    setNewEventDate('');
    setNewEventTime('');
    setNewEventParents('both');
    setEventStep('details');
    setEventCreated(false);
  }

  async function handleCreateEvent() {
    if (!newEventTitle || !newEventDate || !newEventTime) return;

    setIsCreatingEvent(true);
    try {
      const startTime = new Date(`${newEventDate}T${newEventTime}`);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

      await childEventsAPI.create({
        title: newEventTitle,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: newEventType,
        invite_parents: newEventParents,
      });

      setEventCreated(true);
      // Reload events
      loadUpcomingEvents();

      // Auto-close after showing success
      setTimeout(() => {
        setShowAddEvent(false);
        setEventStep('type');
        setEventCreated(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setIsCreatingEvent(false);
    }
  }

  // Combined "Pick Back Up" — Video + Books progress (real data only, no mock fallback)
  const pickBackUp = [
    ...recentVideos.filter(v => v.progress > 0 && v.progress < 90).map(wp => ({
      type: 'video' as const,
      id: wp.videoId,
      item: theaterContent.videos.find(v => v.id === wp.videoId)!,
      progress: wp.progress,
      lastAction: wp.lastWatched ? new Date(wp.lastWatched).getTime() : 0,
    })),
    ...Object.entries(bookProgressMap)
      .filter(([_, p]) => p && p.currentPage > 0 && !p.completed)
      .map(([id, p]) => ({
        type: 'book' as const,
        id,
        item: theaterContent.storybooks.find(b => b.id === id)!,
        progress: p!.totalPages > 0 ? (p!.currentPage / p!.totalPages) * 100 : 0,
        lastAction: p!.lastRead ? new Date(p!.lastRead).getTime() : 0,
      }))
  ].filter(e => e.item).sort((a, b) => b.lastAction - a.lastAction);

  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [selectedMovie, setSelectedMovie] = useState<VideoContent | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex(i => (i + 1) % theaterContent.videos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const featuredVideo = theaterContent.videos[featuredIndex];

  const userInitial = userData?.childName?.charAt(0).toUpperCase() || 'K';
  const avatarGradient = AVATAR_COLORS[(userData?.childName?.length || 0) % AVATAR_COLORS.length];

  const { resolvedTheme } = useKidSpaceTheme();
  const logoVariant = resolvedTheme === 'dark' ? 'dark' : 'light';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--portal-background)' }}>
        <div className="text-center space-y-4">
          <KidComsLogo showText={false} size="lg" variant={logoVariant} className="mx-auto animate-pulse" />
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--portal-background)' }}>
      {/* Header */}
      <KidSpaceHeader
        title={`Hey ${userData?.childName || 'friend'} 👋`}
        subtitle="What are we doing today?"
        userInitial={userInitial}
        avatarGradient={avatarGradient}
        sticky={false}
        actions={
          <>
            <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--portal-surface)', color: 'var(--portal-muted)' }} aria-label="Search">
              <Search className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: 'var(--portal-surface)', color: 'var(--portal-muted)' }} aria-label="Notifications">
              <Bell className="w-4 h-4" />
            </button>
          </>
        }
      />

      <main className="space-y-6 pb-6">
        {/* Featured Hero Banner */}
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
            badge="✨ Featured"
            onPlay={() => router.push(`/my-circle/child/movies/${featuredVideo.id}`)}
            onMoreInfo={() => setSelectedMovie(featuredVideo)}
            onFavorite={() => { }}
            isFavorite={false}
          />
        </div>

        {/* Pick Back Up — real progress only */}
        {pickBackUp.length > 0 && (
          <section className="px-4">
            <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              Pick Back Up
            </h2>
            <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
              <div className="flex gap-4 min-w-max pb-2">
                {pickBackUp.map((entry) => {
                  const progressPct = Math.round(entry.progress);
                  const isVideo = entry.type === 'video';
                  const item = entry.item;

                  return (
                    <button
                      key={`${entry.type}-${entry.id}`}
                      onClick={() => router.push(isVideo ? `/my-circle/child/movies/${entry.id}` : `/my-circle/child/library/${entry.id}`)}
                      className="relative flex-shrink-0 w-[340px] rounded-2xl overflow-hidden group hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                      style={{ background: 'var(--portal-surface)', boxShadow: 'var(--portal-shadow-lg)' }}
                    >
                      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                        <img
                          src={isVideo ? (item as any).thumbnail : (item as any).cover}
                          alt={item.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-xl">
                            {isVideo ? <Play className="w-8 h-8 text-white ml-1" fill="currentColor" /> : <BookOpen className="w-8 h-8 text-white" />}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                          <div
                            className={`h-full ${isVideo ? 'bg-[#4BA8C8]' : 'bg-amber-500'} rounded-r-full`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                      <div className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0 text-left">
                          <h3 className="font-bold text-sm leading-tight line-clamp-1" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                            {item.title}
                          </h3>
                          <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                            {isVideo ? 'Movie' : 'Book'}
                          </span>
                        </div>
                        <span className={`${isVideo ? 'text-[#4BA8C8]' : 'text-amber-400'} text-xs font-bold flex-shrink-0`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {progressPct}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Quick Actions — 2x2 Grid */}
        <section className="px-4">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'MOVIES', icon: Film, color: 'from-red-600 to-red-500', shadow: 'shadow-red-500/20', href: '/my-circle/child/movies' },
              { label: 'BOOKS', icon: BookOpen, color: 'from-amber-500 to-orange-400', shadow: 'shadow-amber-500/20', href: '/my-circle/child/library' },
              { label: 'GAMES', icon: Gamepad2, color: 'from-[#4BA8C8] to-[#3DAA8A]', shadow: 'shadow-[#4BA8C8]/20', href: '/my-circle/child/arcade' },
              { label: 'MY CIRCLE', icon: Users, color: 'from-emerald-500 to-[#3DAA8A]', shadow: 'shadow-emerald-500/20', href: '/my-circle/child/my-circle-page' },
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

        {/* Recent Calls — Real API data */}
        <section className="px-4">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
            Recent Calls
          </h2>
          <div className="rounded-3xl overflow-hidden divide-y" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', ['--tw-divide-color' as string]: 'var(--portal-divider)' }}>
            {callsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--portal-muted)' }} />
              </div>
            ) : recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <Phone className="w-8 h-8 mb-2" style={{ color: 'var(--portal-muted)' }} />
                <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  No calls yet — call someone from your circle!
                </p>
              </div>
            ) : (
              recentCalls.map((call) => {
                const colorIdx = call.contact_name.charCodeAt(0) % CONTACT_COLORS.length;
                const initial = call.contact_name.charAt(0).toUpperCase();
                const isVideo = call.call_type === 'video';
                const timeStr = call.initiated_at ? formatRelativeTime(call.initiated_at) : '';

                return (
                  <div key={call.id} className="flex items-center gap-4 p-4 transition-colors group" style={{ borderBottom: '1px solid var(--portal-divider)' }}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${CONTACT_COLORS[colorIdx]} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform`}>
                      <span className="text-white font-black text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{initial}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>{call.contact_name}</h3>
                      <p className="text-xs flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                        {isVideo ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        {isVideo ? 'Video Call' : 'Voice Call'}
                        {timeStr && <> · {timeStr}</>}
                        {call.status === 'missed' && <span className="text-red-400 ml-1">Missed</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/my-circle/child/my-circle-page`)}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:text-[#5BC4A0] transition-all"
                      style={{ background: 'var(--portal-surface-hover, var(--portal-surface))', color: 'var(--portal-muted)' }}
                    >
                      {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Recent Messages */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              Recent Messages
            </h2>
            <button
              onClick={() => router.push('/my-circle/child/my-circle-page')}
              className="text-xs text-[#3DAA8A] hover:text-[#5BC4A0] font-semibold flex items-center gap-1"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="rounded-3xl overflow-hidden divide-y" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', ['--tw-divide-color' as string]: 'var(--portal-divider)' }}>
            {recentMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <MessageCircle className="w-8 h-8 mb-2" style={{ color: 'var(--portal-muted)' }} />
                <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  No messages yet — say hi to someone in your circle!
                </p>
              </div>
            ) : (
              recentMessages.map((conv) => {
                const colorIdx = conv.partner_name.charCodeAt(0) % CONTACT_COLORS.length;
                const initial = conv.partner_name.charAt(0).toUpperCase();
                const hasUnread = conv.unread_count > 0;
                const timeStr = conv.last_message_at ? formatRelativeTime(conv.last_message_at) : '';

                return (
                  <button
                    key={conv.partner_id}
                    onClick={() => router.push(`/my-circle/child/chat/${conv.partner_id}`)}
                    className="w-full flex items-center gap-4 p-4 transition-colors group text-left"
                    style={{ borderBottom: '1px solid var(--portal-divider)' }}
                  >
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${CONTACT_COLORS[colorIdx]} flex items-center justify-center shadow-lg transform group-hover:scale-105 transition-transform relative`}>
                      <span className="text-white font-black text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{initial}</span>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#3DAA8A] rounded-full" style={{ border: '2px solid var(--portal-background)' }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: hasUnread ? 'var(--portal-text-heading)' : 'var(--portal-text)' }}>
                        {conv.partner_name}
                      </h3>
                      <p className="text-xs truncate" style={{ fontFamily: 'Inter, sans-serif', color: hasUnread ? 'var(--portal-text)' : 'var(--portal-muted)' }}>
                        {conv.last_message || 'Start a conversation'}
                      </p>
                    </div>
                    <span className="text-[10px] flex-shrink-0" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                      {timeStr}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Upcoming Events — Real API data */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              Upcoming Events
            </h2>
          </div>
          <div className="space-y-3">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--portal-muted)' }} />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 px-4 text-center rounded-2xl" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}>
                <Calendar className="w-8 h-8 mb-2" style={{ color: 'var(--portal-muted)' }} />
                <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                  No upcoming events — create one below!
                </p>
              </div>
            ) : (
              upcomingEvents.map(event => {
                const { date, time } = formatEventTime(event.start_time);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 rounded-2xl p-4 transition-colors"
                    style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getEventColor(event.event_type)} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <span className="text-2xl leading-none">{getEventEmoji(event.event_type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                        {event.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Calendar className="w-3 h-3" style={{ color: 'var(--portal-muted)' }} />
                        <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>
                          {date} · {time}
                        </span>
                        {event.created_by_child && (
                          <span className="text-[#4BA8C8] text-[10px] font-medium ml-1">You created this</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--portal-muted)' }} />
                  </div>
                );
              })
            )}
            <button
              onClick={() => { setShowAddEvent(true); setEventStep('type'); setEventCreated(false); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed hover:border-[#4BA8C8]/50 hover:text-[#5BC4A0] transition-all duration-200"
              style={{ borderColor: 'var(--portal-border)', color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}
            >
              <Plus className="w-4 h-4" /> Add new event
            </button>
          </div>
        </section>

        {/* Coming Soon */}
        <section>
          <div className="px-4 flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
              Coming Soon
            </h2>
            <button
              onClick={() => router.push('/my-circle/child/movies')}
              className="flex items-center gap-1 text-sm font-semibold text-[#4BA8C8] hover:text-[#5BC4A0] transition-colors"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto scrollbar-hide px-4">
            <div className="flex gap-4 min-w-max pb-2">
              {COMING_SOON.map(item => (
                <div key={item.id} className="relative flex-shrink-0 w-72 rounded-2xl overflow-hidden hover:scale-[1.02] transition-transform duration-200 group" style={{ background: 'var(--portal-surface)', boxShadow: 'var(--portal-shadow-lg)' }}>
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <img src={item.poster} alt="Coming soon" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="px-3 py-1 rounded-full bg-[#4BA8C8] text-white text-[10px] font-bold uppercase tracking-wide shadow-lg">
                        Coming Soon
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#5BC4A0]" />
                      <span className="text-white/80 text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>Watch for it!</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Author */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[#4BA8C8] text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: 'Inter, sans-serif' }}>
              Featured Author
            </p>
            <button onClick={() => router.push('/my-circle/child/library')} className="flex items-center gap-1 text-sm font-semibold text-[#4BA8C8] hover:text-[#5BC4A0] transition-colors">
              Library <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="bg-gradient-to-br from-amber-950/40 to-slate-800/60 rounded-2xl p-4 mb-4 border border-amber-800/30">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500/30 flex-shrink-0 shadow-lg shadow-amber-500/20">
                <img src="/kidsComms/posters/authors/ayaanasclark.jpg" alt="Ayanna S Clark" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="font-bold text-base" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>Ayanna S Clark</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                  <span className="text-amber-400 text-xs ml-1" style={{ fontFamily: 'Inter, sans-serif' }}>Top Author</span>
                </div>
                <p className="text-xs mt-2 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                  Ayanna S. Clark is a Compton-born illustrator and author who creates magical stories that inspire confidence, imagination, and empowerment in young readers.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Promo — Luna and Midnight */}
        <section className="px-4 pb-12">
          <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)', boxShadow: 'var(--portal-shadow-xl)' }}>
            <div className="relative aspect-[16/9] w-full">
              <img src="/kidsComms/posters/featuredartistpromo.png" alt="Luna and Midnight Promo" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-black mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                Luna has found a glowing key... and it unlocks the stars.
              </h3>
              <div className="space-y-4">
                <p className="text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-text)' }}>
                  When the sky begins to whisper secrets, Luna and her brave cat Midnight step into a magical adventure filled with constellations, courage, and a little bit of mystery.
                </p>
                <p className="text-[#4BA8C8] font-bold text-base italic" style={{ fontFamily: 'Inter, sans-serif' }}>
                  If you love magic, friendship, and nighttime adventures, this is your next favorite story.
                </p>
                <button
                  onClick={() => router.push('/my-circle/child/library/luna-midnight')}
                  className="w-full sm:w-auto mt-2 px-8 py-4 bg-gradient-to-r from-[#4BA8C8] to-[#3DAA8A] rounded-2xl text-white font-black text-lg shadow-xl shadow-[#4BA8C8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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

      {/* Movie Detail Modal */}
      <MovieDetailModal
        video={selectedMovie}
        onClose={() => setSelectedMovie(null)}
        onWatchNow={(v) => router.push(`/my-circle/child/movies/${v.id}`)}
        progress={selectedMovie ? progressMap[selectedMovie.id] : null}
        rating={4.5}
      />

      {/* ARIA Greeting */}
      <ARIAHelper
        message={`Hey ${userData?.childName || 'there'}! What shall we do today?`}
        mood="waving"
        position="bottom-right"
        autoDismiss
        dismissDelay={5000}
      />

      {/* Add Event Modal */}
      {showAddEvent && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end"
          onClick={() => setShowAddEvent(false)}
        >
          <div
            className="w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto"
            style={{ background: 'var(--portal-surface)', borderTop: '1px solid var(--portal-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--portal-border)' }} />

            {eventCreated ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                  Event Created!
                </h3>
                <p className="text-slate-400 text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Your event has been added
                </p>
              </div>
            ) : eventStep === 'type' ? (
              <>
                <h3 className="text-xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                  What kind of event?
                </h3>
                <div className="space-y-3">
                  {EVENT_TYPES.map(type => (
                    <button
                      key={type.key}
                      onClick={() => openAddEventWithType(type.key, type.label)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${type.color} hover:opacity-90 active:scale-[0.98] transition-all`}
                    >
                      <span className="text-2xl">{type.emoji}</span>
                      <span className="text-white font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{type.label}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => openAddEventWithType('custom', '')}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl transition-all"
                    style={{ background: 'var(--portal-surface)', border: '1px solid var(--portal-border)' }}
                  >
                    <span className="text-2xl">📅</span>
                    <span className="text-white font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Custom Event</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setEventStep('type')} className="text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', color: 'var(--portal-text-heading)' }}>
                    Event Details
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Event Name</label>
                    <input
                      type="text"
                      value={newEventTitle}
                      onChange={e => setNewEventTitle(e.target.value)}
                      placeholder="What's happening?"
                      className="w-full rounded-xl px-4 py-3 focus:outline-none focus:border-[#4BA8C8] transition-colors"
                      style={{ fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)', color: 'var(--portal-text)' }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Date</label>
                      <input
                        type="date"
                        value={newEventDate}
                        onChange={e => setNewEventDate(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 focus:outline-none focus:border-[#4BA8C8] transition-colors"
                        style={{ fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)', color: 'var(--portal-text)' }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1.5 block" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Time</label>
                      <input
                        type="time"
                        value={newEventTime}
                        onChange={e => setNewEventTime(e.target.value)}
                        className="w-full rounded-xl px-4 py-3 focus:outline-none focus:border-[#4BA8C8] transition-colors"
                        style={{ fontFamily: 'Inter, sans-serif', background: 'var(--portal-input-bg)', border: '1px solid var(--portal-input-border)', color: 'var(--portal-text)' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1.5 block" style={{ fontFamily: 'Inter, sans-serif', color: 'var(--portal-muted)' }}>Include Parents</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'both' as const, label: 'Both Parents' },
                        { value: 'parent_a' as const, label: 'Mom Only' },
                        { value: 'parent_b' as const, label: 'Dad Only' },
                        { value: 'none' as const, label: 'Just Me' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setNewEventParents(opt.value)}
                          className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                            newEventParents === opt.value
                              ? 'bg-[#4BA8C8] text-white'
                              : ''
                          }`}
                          style={newEventParents !== opt.value ? { background: 'var(--portal-input-bg)', color: 'var(--portal-muted)', border: '1px solid var(--portal-input-border)', fontFamily: 'Inter, sans-serif' } : { fontFamily: 'Inter, sans-serif' }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleCreateEvent}
                    disabled={!newEventTitle || !newEventDate || !newEventTime || isCreatingEvent}
                    className="w-full py-3.5 bg-gradient-to-r from-[#4BA8C8] to-[#3DAA8A] rounded-xl text-white font-bold shadow-lg shadow-[#4BA8C8]/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  >
                    {isCreatingEvent ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Create Event'
                    )}
                  </button>
                </div>
              </>
            )}

            {!eventCreated && (
              <button
                onClick={() => setShowAddEvent(false)}
                className="w-full mt-4 py-3 text-sm transition-colors"
                style={{ color: 'var(--portal-muted)', fontFamily: 'Inter, sans-serif' }}
              >
                Cancel
              </button>
            )}
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
