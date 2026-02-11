'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useWebSocket } from '@/contexts/websocket-context';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { useRouter } from 'next/navigation';
import { formatInUserTimezone, isToday as isTodayTz } from '@/lib/timezone';
import {
  familyFilesAPI,
  agreementsAPI,
  dashboardAPI,
  activitiesAPI,

  getImageUrl,
  FamilyFileDetail,
  Agreement,

  DashboardSummary,
  UpcomingEvent,

} from '@/lib/api';
import {
  Calendar,
  MessageSquare,
  ChevronRight,
  FolderOpen,
  Wallet,
  Users,
  ArrowRight,
  Heart,
  MapPin,
  FileText,
  CheckCircle,
  Zap,
  Gavel,

} from 'lucide-react';

import { UpgradeBanner } from '@/components/upgrade-banner';
import { useSubscription } from '@/contexts/subscription-context';
import { CustodyTimeline } from '@/components/schedule/custody-timeline';


/**
 * CommonGround Dashboard - "The Morning Brief"
 *
 * Design: Warm Earth Tones
 * Philosophy: Situational awareness for the busy parent
 * Key Elements: Greeting, Custody Status, Action Stream
 */

interface FamilyFileWithData {
  familyFile: FamilyFileDetail;
  agreements: Agreement[];
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

// Calculate child's age
function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// Get initials for avatar
function getInitials(firstName: string, lastName?: string): string {
  if (lastName) {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }
  return firstName.charAt(0).toUpperCase();
}

// Format hours remaining into a human-readable string
function formatHoursRemaining(hours: number | undefined): string {
  if (!hours) return 'Unknown';
  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  }
  if (hours < 24) {
    return `${Math.round(hours)} hours`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  }
  return `${days} day${days > 1 ? 's' : ''}, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
}


// Action Stream Item
function ActionStreamItem({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  hasNotification,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  hasNotification?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4 text-left hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] group"
    >
      <div className={`w-14 h-14 ${iconBg} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{title}</p>
        <p className="text-sm text-muted-foreground truncate font-medium">{subtitle}</p>
      </div>
      {hasNotification && (
        <div className="w-3 h-3 bg-cg-error rounded-full flex-shrink-0 shadow-md animate-pulse" />
      )}
      <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
    </button>
  );
}

// Quick Action Button
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-105"
    >
      <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
        <Icon className="w-6 h-6 text-[var(--portal-primary)]" />
      </div>
      <span className="text-sm font-bold text-foreground">{label}</span>
    </button>
  );
}

// Get icon and colors based on event category
function getCategoryStyles(category: string) {
  switch (category) {
    case 'exchange':
      return { bg: 'bg-cg-slate-subtle', color: 'text-cg-slate', Icon: MapPin };
    case 'medical':
      return { bg: 'bg-cg-error-subtle', color: 'text-cg-error', Icon: Heart };
    case 'school':
      return { bg: 'bg-cg-amber-subtle', color: 'text-cg-amber', Icon: FileText };
    case 'sports':
      return { bg: 'bg-[var(--portal-primary)]/10', color: 'text-[var(--portal-primary)]', Icon: Users };
    default:
      return { bg: 'bg-[var(--portal-primary)]/10', color: 'text-[var(--portal-primary)]', Icon: Calendar };
  }
}

// Single Upcoming Event Item
function UpcomingEventItem({ event }: { event: UpcomingEvent }) {
  const { timezone } = useAuth();
  const router = useRouter();

  // Format the event time (timezone-aware)
  const eventTime = event.start_time;
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString();
  const isToday = isTodayTz(eventTime, timezone);
  const isTomorrow = formatInUserTimezone(eventTime, timezone, 'yyyy-MM-dd') ===
    formatInUserTimezone(tomorrow, timezone, 'yyyy-MM-dd');
  const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatInUserTimezone(eventTime, timezone, 'EEE');
  const timeLabel = event.all_day ? 'All day' : formatInUserTimezone(eventTime, timezone, 'h:mm a');

  // Calculate time remaining
  const eventDate = new Date(event.start_time);
  const diffMs = eventDate.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeRemaining = '';
  if (diffMins < 0) {
    timeRemaining = 'Now';
  } else if (diffMins < 60) {
    timeRemaining = `${diffMins}m`;
  } else if (diffHours < 24) {
    timeRemaining = `${diffHours}h ${diffMins % 60}m`;
  } else {
    timeRemaining = `${diffDays}d`;
  }

  const { bg, color, Icon } = getCategoryStyles(event.event_category);

  // Get display title
  const getDisplayTitle = () => {
    if (!event.is_exchange) return event.title;
    if (event.viewer_role === 'pickup') return 'Pickup';
    if (event.viewer_role === 'dropoff') return 'Dropoff';
    return event.title || 'Exchange';
  };

  // Determine what to show in the subtitle
  const getSubtitle = () => {
    if (event.is_exchange && event.other_parent_name) {
      return `with ${event.other_parent_name}`;
    }
    if (event.child_names && event.child_names.length > 0) {
      return event.child_names.join(', ');
    }
    return event.location || null;
  };

  const subtitle = getSubtitle();

  return (
    <button
      onClick={() => router.push('/schedule')}
      className="w-full p-4 flex items-center gap-4 text-left hover:bg-slate-50 transition-all duration-200 rounded-xl group"
    >
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-200`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-foreground truncate" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>{getDisplayTitle()}</p>
        <p className="text-sm text-muted-foreground truncate font-medium">
          {timeLabel}
          {subtitle && ` • ${subtitle}`}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className="text-xs font-bold text-white bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] px-3 py-1 rounded-full shadow-md">
          {timeRemaining}
        </span>
        <span className="text-xs text-muted-foreground font-semibold">{dayLabel}</span>
      </div>
    </button>
  );
}

// Upcoming Events List - shows all events in next 7 days with vertical scroll
function UpcomingEventsList({ events }: { events?: UpcomingEvent[] }) {
  const router = useRouter();

  console.log('UpcomingEventsList received events:', events);

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md">
            <CheckCircle className="w-6 h-6 text-[var(--portal-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>All caught up!</p>
            <p className="text-sm text-muted-foreground font-medium">No upcoming events in the next 7 days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-lg">
      <div className="max-h-[280px] overflow-y-auto divide-y-2 divide-slate-100">
        {events.map((event) => (
          <UpcomingEventItem key={event.id} event={event} />
        ))}
      </div>
      {events.length > 3 && (
        <div className="p-3 border-t-2 border-slate-100 bg-slate-50">
          <button
            onClick={() => router.push('/schedule')}
            className="w-full text-center text-sm text-[var(--portal-primary)] hover:text-[#1e4442] font-bold py-2 transition-all duration-200 hover:scale-105"
          >
            View full schedule →
          </button>
        </div>
      )}
    </div>
  );
}

// WS5: No polling - dashboard now fully WebSocket-based with window focus refresh as fallback

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { isFree } = useSubscription();
  const {
    subscribe,
    unsubscribe,
    onExchangeCreated,
    onExchangeUpdated,
    onExchangeCheckin,
    onObligationCreated,
    onObligationUpdated,
    onPaymentReceived,
    onDashboardUpdate,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onAgreementCreated,
    onAgreementUpdated,
    onAgreementApproved,
  } = useWebSocket();
  const [familyFilesWithData, setFamilyFilesWithData] = useState<FamilyFileWithData[]>([]);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeFileIdsRef = useRef<string[]>([]);

  // Lightweight refresh - only updates summary data (for auto-refresh)
  const refreshSummary = useCallback(async () => {
    if (activeFileIdsRef.current.length === 0) return;

    try {
      // Fetch dashboard summaries for ALL active family files
      const summaryPromises = activeFileIdsRef.current.map(id =>
        dashboardAPI.getSummary(id).catch(() => null)
      );

      const summaryResults = await Promise.all(summaryPromises);

      // Merge summaries from all family files
      const validSummaries = summaryResults.filter((s): s is DashboardSummary => s !== null);

      if (validSummaries.length > 0) {
        // Combine upcoming events from all family files and sort by start_time
        const allUpcomingEvents = validSummaries
          .flatMap(s => s.upcoming_events)
          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
          .slice(0, 10);

        const mergedSummary: DashboardSummary = {
          ...validSummaries[0],
          upcoming_events: allUpcomingEvents,
          next_event: allUpcomingEvents[0] || undefined,
          pending_expenses_count: validSummaries.reduce((sum, s) => sum + s.pending_expenses_count, 0),
          pending_expenses: validSummaries.flatMap(s => s.pending_expenses).slice(0, 5),
          unread_messages_count: validSummaries.reduce((sum, s) => sum + s.unread_messages_count, 0),
          unread_messages: validSummaries.flatMap(s => s.unread_messages).slice(0, 3),
          pending_agreements_count: validSummaries.reduce((sum, s) => sum + s.pending_agreements_count, 0),
          pending_agreements: validSummaries.flatMap(s => s.pending_agreements),
          active_quick_accords_count: validSummaries.reduce((sum, s) => sum + s.active_quick_accords_count, 0),
          active_quick_accords: validSummaries.flatMap(s => s.active_quick_accords).slice(0, 5),
          unread_court_count: validSummaries.reduce((sum, s) => sum + s.unread_court_count, 0),
          court_notifications: validSummaries.flatMap(s => s.court_notifications).slice(0, 5),
          recent_activities: validSummaries.flatMap(s => s.recent_activities)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 10),
          unread_activity_count: validSummaries.reduce((sum, s) => sum + s.unread_activity_count, 0),
        };

        setDashboardSummary(mergedSummary);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard:', error);
    }
  }, []);

  // Full data load (initial load)
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const familyFilesResponse = await familyFilesAPI.list();
      const familyFiles = familyFilesResponse.items;

      const filesWithData: FamilyFileWithData[] = await Promise.all(
        familyFiles.map(async (ff) => {
          let agreements: Agreement[] = [];
          let familyFileDetail: FamilyFileDetail;

          try {
            familyFileDetail = await familyFilesAPI.get(ff.id);
          } catch {
            familyFileDetail = {
              ...ff,
              children: [],
              active_agreement_count: 0,
              quick_accord_count: 0,
            };
          }

          if (ff.status === 'active') {
            try {
              const agreementsData = await agreementsAPI.listForFamilyFile(ff.id);
              agreements = agreementsData.items;
            } catch {
              // No agreements yet
            }
          }

          return { familyFile: familyFileDetail, agreements };
        })
      );

      setFamilyFilesWithData(filesWithData);

      // Fetch custody status for ALL active family files
      const activeFiles = familyFiles.filter(ff => ff.status === 'active');
      if (activeFiles.length > 0) {
        // Store active file IDs for auto-refresh
        activeFileIdsRef.current = activeFiles.map(f => f.id);

        // Fetch dashboard summaries for ALL active family files
        const summaryPromises = activeFiles.map(file =>
          dashboardAPI.getSummary(file.id).catch((err) => {
            console.error(`Failed to load dashboard summary for ${file.id}:`, err);
            return null;
          })
        );

        const summaryResults = await Promise.all(summaryPromises);

        // Merge summaries from all family files
        const validSummaries = summaryResults.filter((s): s is DashboardSummary => s !== null);

        if (validSummaries.length > 0) {
          // Combine upcoming events from all family files and sort by start_time
          const allUpcomingEvents = validSummaries
            .flatMap(s => s.upcoming_events)
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
            .slice(0, 10); // Limit to 10 events

          // Use first summary as base, but merge events from all
          const mergedSummary: DashboardSummary = {
            ...validSummaries[0],
            // Merge all upcoming events
            upcoming_events: allUpcomingEvents,
            next_event: allUpcomingEvents[0] || undefined,
            // Sum up counts from all family files
            pending_expenses_count: validSummaries.reduce((sum, s) => sum + s.pending_expenses_count, 0),
            pending_expenses: validSummaries.flatMap(s => s.pending_expenses).slice(0, 5),
            unread_messages_count: validSummaries.reduce((sum, s) => sum + s.unread_messages_count, 0),
            unread_messages: validSummaries.flatMap(s => s.unread_messages).slice(0, 3),
            pending_agreements_count: validSummaries.reduce((sum, s) => sum + s.pending_agreements_count, 0),
            pending_agreements: validSummaries.flatMap(s => s.pending_agreements),
            active_quick_accords_count: validSummaries.reduce((sum, s) => sum + s.active_quick_accords_count, 0),
            active_quick_accords: validSummaries.flatMap(s => s.active_quick_accords).slice(0, 5),
            unread_court_count: validSummaries.reduce((sum, s) => sum + s.unread_court_count, 0),
            court_notifications: validSummaries.flatMap(s => s.court_notifications).slice(0, 5),
            recent_activities: validSummaries.flatMap(s => s.recent_activities)
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 10),
            unread_activity_count: validSummaries.reduce((sum, s) => sum + s.unread_activity_count, 0),
          };

          console.log('Dashboard summaries merged from', validSummaries.length, 'family files');
          console.log('Total upcoming events:', allUpcomingEvents.length);
          setDashboardSummary(mergedSummary);
        } else {
          console.log('No dashboard summaries returned');
        }

        // No family files with children
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // WS5: WebSocket subscriptions and real-time event handling
  useEffect(() => {
    // Subscribe to all active family files
    activeFileIdsRef.current.forEach(familyFileId => {
      subscribe(familyFileId);
    });

    // Set up event listeners for real-time updates
    const unsubscribeFns = [
      onExchangeCreated(() => {
        console.log('[Dashboard] Exchange created - refreshing...');
        refreshSummary();
      }),
      onExchangeUpdated(() => {
        console.log('[Dashboard] Exchange updated - refreshing...');
        refreshSummary();
      }),
      onExchangeCheckin(() => {
        console.log('[Dashboard] Exchange check-in - refreshing...');
        refreshSummary();
      }),
      onObligationCreated(() => {
        console.log('[Dashboard] Obligation created - refreshing...');
        refreshSummary();
      }),
      onObligationUpdated(() => {
        console.log('[Dashboard] Obligation updated - refreshing...');
        refreshSummary();
      }),
      onPaymentReceived(() => {
        console.log('[Dashboard] Payment received - refreshing...');
        refreshSummary();
      }),
      onDashboardUpdate(() => {
        console.log('[Dashboard] Dashboard update - refreshing...');
        refreshSummary();
      }),
      // WS5: Event notifications
      onEventCreated(() => {
        console.log('[Dashboard] Event created - refreshing...');
        refreshSummary();
      }),
      onEventUpdated(() => {
        console.log('[Dashboard] Event updated - refreshing...');
        refreshSummary();
      }),
      onEventDeleted(() => {
        console.log('[Dashboard] Event deleted - refreshing...');
        refreshSummary();
      }),
      // WS5: Agreement notifications
      onAgreementCreated(() => {
        console.log('[Dashboard] Agreement created - refreshing...');
        refreshSummary();
      }),
      onAgreementUpdated(() => {
        console.log('[Dashboard] Agreement updated - refreshing...');
        refreshSummary();
      }),
      onAgreementApproved(() => {
        console.log('[Dashboard] Agreement approved - refreshing...');
        refreshSummary();
      }),
    ];

    // Cleanup: unsubscribe from WebSocket and remove listeners
    return () => {
      activeFileIdsRef.current.forEach(familyFileId => {
        unsubscribe(familyFileId);
      });
      unsubscribeFns.forEach(fn => fn());
    };
  }, [
    subscribe,
    unsubscribe,
    onExchangeCreated,
    onExchangeUpdated,
    onExchangeCheckin,
    onObligationCreated,
    onObligationUpdated,
    onPaymentReceived,
    onDashboardUpdate,
    onEventCreated,
    onEventUpdated,
    onEventDeleted,
    onAgreementCreated,
    onAgreementUpdated,
    onAgreementApproved,
    refreshSummary,
  ]);

  // WS5: Polling removed - dashboard now relies entirely on WebSocket updates
  // The window focus refresh below provides fallback when user returns to tab

  // Refresh when window regains focus (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoading) {
        refreshSummary();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isLoading, refreshSummary]);

  // Auto-mark activities as read when dashboard loads with unread activities
  useEffect(() => {
    const markActivitiesAsRead = async () => {
      if (activeFileIdsRef.current.length === 0) return;
      if (!dashboardSummary) return;
      if (dashboardSummary.unread_activity_count === 0) return;

      try {
        await activitiesAPI.markAllAsRead(activeFileIdsRef.current[0]);
        // Update local state to reflect that activities are now read
        setDashboardSummary(prev => prev ? {
          ...prev,
          unread_activity_count: 0,
          recent_activities: prev.recent_activities.map(a => ({ ...a, is_read: true }))
        } : null);
      } catch (error) {
        console.error('Failed to mark activities as read:', error);
      }
    };

    // Small delay to ensure the user has "seen" the dashboard
    const timeoutId = setTimeout(markActivitiesAsRead, 2000);
    return () => clearTimeout(timeoutId);
  }, [dashboardSummary?.unread_activity_count]);

  const greeting = getGreeting();
  // We need to re-calculate needsSetup here since we removed the variable from handleWithMe
  // Actually, needsSetup depends on familyFilesWithData which is state.
  // In the original code, needsSetup was: const needsSetup = familyFilesWithData.length === 0;
  // Let's deduce it from state.
  const needsSetup = familyFilesWithData.length === 0 && !isLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32 lg:pb-8">
        {/* Header with Greeting */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            {greeting},
          </h1>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--portal-primary)]" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
            {user?.first_name}
          </h2>
        </div>

        {/* Upgrade Banner for Free Users */}
        {isFree() && !needsSetup && (
          <div className="mb-6">
            <UpgradeBanner variant="card" dismissible />
          </div>
        )}

        {
          needsSetup ? (
            // Getting Started
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border-2 border-slate-200 p-10 text-center shadow-2xl">
                <div className="w-20 h-20 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <FolderOpen className="w-10 h-10 text-[var(--portal-primary)]" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Welcome to CommonGround
                </h3>
                <p className="text-muted-foreground font-medium mb-8 max-w-md mx-auto">
                  Create a Family File to get started with co-parenting tools, shared calendars, and secure messaging.
                </p>
                <button
                  onClick={() => router.push('/family-files/new')}
                  className="bg-gradient-to-r from-[var(--portal-primary)] to-[#1f4644] text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 inline-flex items-center gap-3"
                >
                  Create Family File
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center mb-4 shadow-md">
                    <MessageSquare className="w-6 h-6 text-[var(--portal-primary)]" />
                  </div>
                  <h4 className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>ARIA Messaging</h4>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">
                    AI-powered communication that reduces conflict
                  </p>
                </div>
                <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center mb-4 shadow-md">
                    <Calendar className="w-6 h-6 text-[var(--portal-primary)]" />
                  </div>
                  <h4 className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>Shared Calendar</h4>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">
                    Track custody schedules and exchanges
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Custody Status Cards - One per child across all family files */}




              {/* Action Stream */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Action Stream
                </h3>
                <div className="space-y-3">
                  {/* Show "all caught up" if no action items */}
                  {dashboardSummary &&
                    dashboardSummary.pending_expenses_count === 0 &&
                    dashboardSummary.unread_messages_count === 0 &&
                    dashboardSummary.pending_agreements_count === 0 &&
                    dashboardSummary.unread_court_count === 0 && (
                      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 flex items-center gap-4 shadow-lg">
                        <div className="w-14 h-14 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
                          <CheckCircle className="w-7 h-7 text-[var(--portal-primary)]" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>All caught up!</p>
                          <p className="text-sm text-muted-foreground font-medium">No pending items to review</p>
                        </div>
                      </div>
                    )}

                  {/* Pending Expenses */}
                  {(dashboardSummary?.pending_expenses_count ?? 0) > 0 && (
                    <ActionStreamItem
                      icon={Wallet}
                      iconBg="bg-cg-error-subtle"
                      iconColor="text-cg-error"
                      title="Pending Expenses"
                      subtitle={`${dashboardSummary!.pending_expenses_count} item${dashboardSummary!.pending_expenses_count > 1 ? 's' : ''} to review`}
                      hasNotification
                      onClick={() => router.push('/payments')}
                    />
                  )}

                  {/* Unread Messages */}
                  {(dashboardSummary?.unread_messages_count ?? 0) > 0 && (
                    <ActionStreamItem
                      icon={MessageSquare}
                      iconBg="bg-cg-slate-subtle"
                      iconColor="text-cg-slate"
                      title="Unread Messages"
                      subtitle={
                        dashboardSummary!.sender_name
                          ? `${dashboardSummary!.unread_messages_count} message${dashboardSummary!.unread_messages_count > 1 ? 's' : ''} from ${dashboardSummary!.sender_name}`
                          : `${dashboardSummary!.unread_messages_count} unread message${dashboardSummary!.unread_messages_count > 1 ? 's' : ''}`
                      }
                      hasNotification
                      onClick={() => router.push('/messages')}
                    />
                  )}

                  {/* Pending SharedCare Agreements */}
                  {(() => {
                    const sharedCareAgreements = dashboardSummary?.pending_agreements.filter(
                      a => a.agreement_type === 'shared_care'
                    ) || [];
                    if (sharedCareAgreements.length === 0) return null;
                    const count = sharedCareAgreements.length;
                    return (
                      <ActionStreamItem
                        icon={FileText}
                        iconBg="bg-[var(--portal-primary)]/10"
                        iconColor="text-[var(--portal-primary)]"
                        title="Agreement Approval"
                        subtitle={
                          count === 1
                            ? `"${sharedCareAgreements[0].title}" needs approval`
                            : `${count} agreements need approval`
                        }
                        hasNotification
                        onClick={() => router.push('/agreements')}
                      />
                    );
                  })()}

                  {/* Pending QuickAccords */}
                  {(() => {
                    const quickAccords = dashboardSummary?.pending_agreements.filter(
                      a => a.agreement_type === 'quick_accord'
                    ) || [];
                    if (quickAccords.length === 0) return null;
                    const familyFileId = activeFileIdsRef.current[0];
                    const count = quickAccords.length;
                    return (
                      <ActionStreamItem
                        icon={Zap}
                        iconBg="bg-cg-amber-subtle"
                        iconColor="text-cg-amber"
                        title="QuickAccord Approval"
                        subtitle={
                          count === 1
                            ? `"${quickAccords[0].title}" needs your approval`
                            : `${count} QuickAccords need your approval`
                        }
                        hasNotification
                        onClick={() => router.push(`/family-files/${familyFileId}/quick-accord/${quickAccords[0].id}`)}
                      />
                    );
                  })()}

                  {/* Active QuickAccords - Awaiting Completion */}
                  {(() => {
                    const activeAccords = dashboardSummary?.active_quick_accords || [];
                    if (activeAccords.length === 0) return null;
                    const familyFileId = activeFileIdsRef.current[0];
                    const count = activeAccords.length;
                    return (
                      <ActionStreamItem
                        icon={CheckCircle}
                        iconBg="bg-[var(--portal-primary)]/10"
                        iconColor="text-[var(--portal-primary)]"
                        title="QuickAccord Active"
                        subtitle={
                          count === 1
                            ? `"${activeAccords[0].title}" - mark as completed when done`
                            : `${count} QuickAccords ready for completion tracking`
                        }
                        onClick={() => router.push(`/family-files/${familyFileId}/quick-accord/${activeAccords[0].id}`)}
                      />
                    );
                  })()}

                  {/* Court Notifications */}
                  {(dashboardSummary?.unread_court_count ?? 0) > 0 && (
                    <ActionStreamItem
                      icon={Gavel}
                      iconBg="bg-cg-amber-subtle"
                      iconColor="text-cg-amber"
                      title="Court Notification"
                      subtitle={
                        dashboardSummary!.court_notifications.some(n => n.is_urgent)
                          ? `${dashboardSummary!.unread_court_count} notification${dashboardSummary!.unread_court_count > 1 ? 's' : ''} (urgent)`
                          : `${dashboardSummary!.unread_court_count} notification${dashboardSummary!.unread_court_count > 1 ? 's' : ''} from court`
                      }
                      hasNotification={dashboardSummary!.court_notifications.some(n => n.is_urgent)}
                      onClick={() => router.push('/court')}
                    />
                  )}

                  {/* Loading state for action stream */}
                  {!dashboardSummary && (
                    <div className="cg-card p-4 animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-xl" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-1/3" />
                          <div className="h-3 bg-muted rounded w-1/2" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Upcoming Events */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Coming Up
                </h3>
                <UpcomingEventsList events={dashboardSummary?.upcoming_events} />
              </section>

              {/* Quick Actions */}
              <section>
                <h3 className="text-lg font-semibold text-foreground mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-4 gap-3">
                  <QuickActionButton
                    icon={MessageSquare}
                    label="Message"
                    onClick={() => router.push('/messages')}
                  />
                  <QuickActionButton
                    icon={Calendar}
                    label="Schedule"
                    onClick={() => router.push('/schedule')}
                  />
                  <QuickActionButton
                    icon={Wallet}
                    label="Expense"
                    onClick={() => router.push('/payments/new')}
                  />
                  <QuickActionButton
                    icon={FolderOpen}
                    label="Files"
                    onClick={() => router.push('/family-files')}
                  />
                </div>
              </section>

              {/* Family Files Summary */}
              {familyFilesWithData.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                      Family Files
                    </h3>
                    <button
                      onClick={() => router.push('/family-files')}
                      className="text-sm font-medium text-[var(--portal-primary)] hover:text-[#1e4442] transition-colors flex items-center gap-1"
                    >
                      View all
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {familyFilesWithData.slice(0, 2).map(({ familyFile }) => (
                      <button
                        key={familyFile.id}
                        onClick={() => router.push(`/family-files/${familyFile.id}`)}
                        className="group w-full bg-white rounded-2xl border-2 border-slate-200 p-5 flex items-center gap-4 text-left hover:border-[var(--portal-primary)]/30 hover:shadow-xl transition-all duration-300 hover:scale-[1.01]"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                          <FolderOpen className="w-6 h-6 text-[var(--portal-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground truncate" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                            {familyFile.title}
                          </p>
                          <p className="text-sm text-muted-foreground font-medium">
                            {familyFile.children?.length || 0} children
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[var(--portal-primary)] group-hover:translate-x-1 transition-all duration-300" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Recent Activity */}
              <section>
                <h3 className="text-lg font-bold text-slate-900 mb-4" style={{ fontFamily: 'Crimson Text, Georgia, serif' }}>
                  Recent Activity
                </h3>
                <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-300">
                  <ActivityFeed
                    activities={dashboardSummary?.recent_activities || []}
                    unreadCount={dashboardSummary?.unread_activity_count || 0}
                    onSeeAll={() => router.push('/activities')}
                    isLoading={!dashboardSummary}
                  />
                </div>
              </section>
            </div>
          )
        }
      </main>
    </div >
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
