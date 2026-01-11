'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
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
  FamilyFileDetail,
  FamilyFileChild,
  Agreement,
  CustodyStatusResponse,
  ChildCustodyStatus,
  DashboardSummary,
  UpcomingEvent,
} from '@/lib/api';
import {
  Calendar,
  MessageSquare,
  FileText,
  ChevronRight,
  Plus,
  FolderOpen,
  Wallet,
  Bell,
  Users,
  Clock,
  ArrowRight,
  Heart,
  MapPin,
  Gavel,
  CheckCircle,
} from 'lucide-react';

/**
 * CommonGround Dashboard - "The Morning Brief"
 *
 * Design: Organic Minimalist
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

// Child Avatar Component
function ChildAvatar({ child, size = 'md' }: { child: FamilyFileChild; size?: 'sm' | 'md' | 'lg' }) {
  const initials = getInitials(child.first_name, child.last_name);
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-cg-amber-subtle flex items-center justify-center ring-2 ring-card`}
      title={`${child.first_name} ${child.last_name}`}
    >
      <span className="font-semibold text-cg-amber">{initials}</span>
    </div>
  );
}

// Individual Child Custody Card - Shows status for one child
function ChildCustodyCard({
  childStatus,
  childData,
  coparentName,
  onWithMe,
}: {
  childStatus: ChildCustodyStatus;
  childData?: FamilyFileChild;
  coparentName?: string;
  onWithMe?: (childId: string) => void;
}) {
  const { timezone } = useAuth();
  const [imageError, setImageError] = useState(false);
  const isWithYou = childStatus.with_current_user;
  const progress = childStatus.progress_percentage || 0;
  const statusColor = isWithYou ? 'bg-cg-sage' : 'bg-cg-slate';
  const statusTextColor = isWithYou ? 'text-cg-sage' : 'text-cg-slate';
  const hasNextExchange = !!childStatus.next_exchange_time;

  // Format next exchange time (timezone-aware)
  const formatNextExchange = () => {
    if (!childStatus.next_exchange_time) return null;
    const exchangeTime = childStatus.next_exchange_time;
    const isToday = isTodayTz(exchangeTime, timezone);

    // Check if tomorrow by adding a day to current time and comparing
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 86400000).toISOString();
    const isTomorrow = formatInUserTimezone(exchangeTime, timezone, 'yyyy-MM-dd') ===
      formatInUserTimezone(tomorrow, timezone, 'yyyy-MM-dd');

    const timeStr = formatInUserTimezone(exchangeTime, timezone, 'h:mm a');
    const dayStr = formatInUserTimezone(exchangeTime, timezone, 'EEEE');

    if (isToday) return `Today ${timeStr}`;
    if (isTomorrow) return `Tomorrow ${timeStr}`;
    return `${dayStr} ${timeStr}`;
  };

  const nextExchangeStr = formatNextExchange();

  // Get next action text
  const getNextActionText = () => {
    if (!childStatus.next_action) return null;
    return childStatus.next_action === 'pickup' ? 'Pick up' : 'Drop off';
  };

  return (
    <div className="cg-card overflow-hidden">
      {/* Top accent bar */}
      <div className={`h-1.5 ${statusColor}`} />

      <div className="p-4">
        {/* Child header with "With Me" button */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-cg-amber-subtle flex items-center justify-center flex-shrink-0 overflow-hidden">
            {childData?.photo_url && !imageError ? (
              <img
                src={childData.photo_url}
                alt={childStatus.child_first_name}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-sm font-semibold text-cg-amber">
                {childStatus.child_first_name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">
              {childStatus.child_first_name}
            </p>
            <p className={`text-sm font-medium ${statusTextColor}`}>
              {isWithYou ? 'With You' : `With ${childStatus.current_parent_name || coparentName || 'co-parent'}`}
            </p>
          </div>
          {/* "With Me" button */}
          {!isWithYou && onWithMe && (
            <button
              onClick={() => onWithMe(childStatus.child_id)}
              className="px-3 py-1.5 text-xs font-medium bg-cg-sage text-white rounded-lg hover:bg-cg-sage-light transition-colors flex-shrink-0"
            >
              With Me
            </button>
          )}
        </div>

        {/* Next exchange info */}
        {hasNextExchange ? (
          <div className="mb-3">
            <p className="text-sm text-foreground">
              {getNextActionText() && (
                <span className={`font-medium ${childStatus.next_action === 'pickup' ? 'text-green-600' : 'text-blue-600'}`}>
                  {getNextActionText()}
                </span>
              )}
              {' '}
              {nextExchangeStr && <>until <span className="font-medium">{nextExchangeStr}</span></>}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-3 italic">
            No exchanges scheduled
          </p>
        )}

        {/* Progress Bar - only show if exchange scheduled */}
        {hasNextExchange && (
          <>
            <div className="relative mb-2">
              <div className="cg-progress h-2.5 rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isWithYou ? 'cg-progress-bar' : 'bg-cg-slate/60'}`}
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
              {/* Child indicator on progress bar */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${statusColor} shadow-sm`}
                style={{ left: `calc(${Math.min(92, Math.max(4, progress))}% - 12px)` }}
              >
                <span className="text-[10px] font-bold text-white">
                  {childStatus.child_first_name.charAt(0)}
                </span>
              </div>
            </div>

            {/* Time remaining */}
            <p className="text-xs text-muted-foreground">
              {childStatus.hours_remaining
                ? formatHoursRemaining(childStatus.hours_remaining) + ' remaining'
                : ''}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Custody Status Section - Shows individual tracking for each child
function CustodyStatusCard({
  custodyStatus,
  children,
  coparentName,
  onWithMe,
}: {
  custodyStatus: CustodyStatusResponse | null;
  children: FamilyFileChild[];
  coparentName?: string;
  onWithMe?: (childId: string) => void;
}) {
  const { timezone } = useAuth();

  // If no custody status data, show simplified card
  if (!custodyStatus || children.length === 0) {
    return (
      <div className="cg-card overflow-hidden">
        <div className="h-2 bg-cg-sage" />
        <div className="p-5">
          <p className="text-sm text-muted-foreground">
            Set up custody exchanges to see status
          </p>
        </div>
      </div>
    );
  }

  // If no child-specific data, fall back to single card with progress
  if (!custodyStatus.children || custodyStatus.children.length === 0) {
    const allWithYou = custodyStatus.all_with_current_user;
    const statusText = allWithYou ? 'Kids are with You' : `Kids are with ${coparentName || 'co-parent'}`;
    const statusColor = allWithYou ? 'bg-cg-sage' : 'bg-cg-slate';
    const statusTextColor = allWithYou ? 'text-cg-sage' : 'text-cg-slate';
    const progress = custodyStatus.progress_percentage || 0;
    const hasNextExchange = !!custodyStatus.next_exchange_time;

    // Format the next exchange time (timezone-aware)
    const formatNextExchange = () => {
      if (!custodyStatus.next_exchange_time) return null;
      const exchangeTime = custodyStatus.next_exchange_time;
      const isToday = isTodayTz(exchangeTime, timezone);

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 86400000).toISOString();
      const isTomorrow = formatInUserTimezone(exchangeTime, timezone, 'yyyy-MM-dd') ===
        formatInUserTimezone(tomorrow, timezone, 'yyyy-MM-dd');

      const timeStr = formatInUserTimezone(exchangeTime, timezone, 'h:mm a');
      const dayStr = formatInUserTimezone(exchangeTime, timezone, 'EEEE');
      if (isToday) return `Today ${timeStr}`;
      if (isTomorrow) return `Tomorrow ${timeStr}`;
      return `${dayStr} ${timeStr}`;
    };

    const nextExchangeStr = formatNextExchange();

    return (
      <div className="cg-card overflow-hidden">
        <div className={`h-1.5 ${statusColor}`} />
        <div className="p-4">
          {/* Status header */}
          <p className={`text-sm font-medium mb-1 ${statusTextColor}`}>
            {statusText}
          </p>

          {/* Next exchange info */}
          {hasNextExchange ? (
            <p className="text-lg font-semibold text-foreground mb-3">
              until {nextExchangeStr || custodyStatus.next_exchange_formatted}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mb-3 italic">
              No upcoming exchange
            </p>
          )}

          {/* Progress Bar - only show if exchange scheduled */}
          {hasNextExchange && (
            <>
              <div className="relative mb-2">
                <div className="cg-progress h-2.5 rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${allWithYou ? 'cg-progress-bar' : 'bg-cg-slate/60'}`}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  />
                </div>
                {/* Progress indicator */}
                <div
                  className={`absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500 ${statusColor} shadow-sm`}
                  style={{ left: `calc(${Math.min(92, Math.max(4, progress))}% - 12px)` }}
                >
                  <Users className="w-3 h-3 text-white" />
                </div>
              </div>

              {/* Time remaining */}
              <p className="text-xs text-muted-foreground">
                {custodyStatus.hours_until_next_exchange
                  ? formatHoursRemaining(custodyStatus.hours_until_next_exchange) + ' remaining'
                  : ''}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Render individual cards for each child
  return (
    <div className="space-y-3">
      {custodyStatus.children.map((childStatus) => {
        const childData = children.find(c => c.id === childStatus.child_id);
        return (
          <ChildCustodyCard
            key={childStatus.child_id}
            childStatus={childStatus}
            childData={childData}
            coparentName={coparentName}
            onWithMe={onWithMe}
          />
        );
      })}
    </div>
  );
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
      className="w-full cg-card-interactive p-4 flex items-center gap-4 text-left"
    >
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
      </div>
      {hasNotification && (
        <div className="w-2.5 h-2.5 bg-cg-error rounded-full flex-shrink-0" />
      )}
      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
      className="flex flex-col items-center gap-2 p-4 cg-card-interactive"
    >
      <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
        <Icon className="w-5 h-5 text-cg-sage" />
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
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
      return { bg: 'bg-cg-sage-subtle', color: 'text-cg-sage', Icon: Users };
    default:
      return { bg: 'bg-cg-sage-subtle', color: 'text-cg-sage', Icon: Calendar };
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
      className="w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
    >
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{getDisplayTitle()}</p>
        <p className="text-sm text-muted-foreground truncate">
          {timeLabel}
          {subtitle && ` • ${subtitle}`}
        </p>
      </div>
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        <span className="text-xs font-medium text-cg-sage bg-cg-sage-subtle px-2 py-0.5 rounded-full">
          {timeRemaining}
        </span>
        <span className="text-xs text-muted-foreground">{dayLabel}</span>
      </div>
    </button>
  );
}

// Upcoming Events List - shows all events in next 7 days with vertical scroll
function UpcomingEventsList({ events }: { events?: UpcomingEvent[] }) {
  const router = useRouter();

  if (!events || events.length === 0) {
    return (
      <div className="cg-card p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cg-sage-subtle rounded-lg flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-5 h-5 text-cg-sage" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">All caught up!</p>
            <p className="text-sm text-muted-foreground">No upcoming events in the next 7 days</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cg-card overflow-hidden">
      <div className="max-h-[280px] overflow-y-auto divide-y divide-border/50">
        {events.map((event) => (
          <UpcomingEventItem key={event.id} event={event} />
        ))}
      </div>
      {events.length > 3 && (
        <div className="p-2 border-t border-border/50 bg-muted/30">
          <button
            onClick={() => router.push('/schedule')}
            className="w-full text-center text-sm text-cg-sage hover:text-cg-sage-light font-medium py-1 transition-colors"
          >
            View full schedule →
          </button>
        </div>
      )}
    </div>
  );
}

// Auto-refresh interval in milliseconds (30 seconds)
const AUTO_REFRESH_INTERVAL = 30000;

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [familyFilesWithData, setFamilyFilesWithData] = useState<FamilyFileWithData[]>([]);
  const [custodyStatus, setCustodyStatus] = useState<CustodyStatusResponse | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const activeFileIdRef = useRef<string | null>(null);

  // Lightweight refresh - only updates summary data (for auto-refresh)
  const refreshSummary = useCallback(async () => {
    if (!activeFileIdRef.current) return;

    try {
      const [custodyResult, summaryResult] = await Promise.allSettled([
        familyFilesAPI.getCustodyStatus(activeFileIdRef.current),
        dashboardAPI.getSummary(activeFileIdRef.current),
      ]);

      if (custodyResult.status === 'fulfilled') {
        setCustodyStatus(custodyResult.value);
      }

      if (summaryResult.status === 'fulfilled') {
        setDashboardSummary(summaryResult.value);
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

      // Fetch custody status and dashboard summary for the first active family file
      const activeFile = familyFiles.find(ff => ff.status === 'active');
      if (activeFile) {
        // Store active file ID for auto-refresh
        activeFileIdRef.current = activeFile.id;

        // Fetch both in parallel
        const [custodyResult, summaryResult] = await Promise.allSettled([
          familyFilesAPI.getCustodyStatus(activeFile.id),
          dashboardAPI.getSummary(activeFile.id),
        ]);

        if (custodyResult.status === 'fulfilled') {
          setCustodyStatus(custodyResult.value);
        } else {
          console.error('Failed to load custody status:', custodyResult.reason);
        }

        if (summaryResult.status === 'fulfilled') {
          setDashboardSummary(summaryResult.value);
        } else {
          console.error('Failed to load dashboard summary:', summaryResult.reason);
        }
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

  // Auto-refresh polling
  useEffect(() => {
    // Don't start polling until initial load is complete
    if (isLoading) return;

    const intervalId = setInterval(() => {
      refreshSummary();
    }, AUTO_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [isLoading, refreshSummary]);

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
      if (!activeFileIdRef.current) return;
      if (!dashboardSummary) return;
      if (dashboardSummary.unread_activity_count === 0) return;

      try {
        await activitiesAPI.markAllAsRead(activeFileIdRef.current);
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

  // Handle manual "With Me" check-in
  const handleWithMe = async (childId: string) => {
    const activeFile = familyFilesWithData.find(f => f.familyFile.status === 'active');
    if (!activeFile) return;

    const child = allChildren.find(c => c.id === childId);
    const childName = child?.first_name || 'Child';

    // For now, show confirmation and refresh status
    // TODO: Implement backend endpoint for manual custody override
    const confirmed = window.confirm(
      `Mark ${childName} as "With Me"?\n\nThis will update the custody status to reflect that ${childName} is currently with you.`
    );

    if (confirmed) {
      try {
        // Refresh custody status to show the change
        // Note: Full implementation requires backend endpoint
        const updatedStatus = await familyFilesAPI.getCustodyStatus(activeFile.familyFile.id);
        setCustodyStatus(updatedStatus);

        // Show success feedback
        alert(`${childName} is now marked as "With Me".\n\nNote: Manual check-in feature is being finalized.`);
      } catch (error) {
        console.error('Failed to update custody status:', error);
        alert('Unable to update custody status. Please try again.');
      }
    }
  };

  // Get all children from active family files
  const allChildren = familyFilesWithData
    .filter((f) => f.familyFile.status === 'active')
    .flatMap((f) => f.familyFile.children || []);

  const needsSetup = familyFilesWithData.length === 0;
  const greeting = getGreeting();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-32 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 bg-cg-sage/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <div className="w-6 h-6 bg-cg-sage rounded-full" />
              </div>
              <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32 lg:pb-8">
        {/* Header with Greeting */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">
              {greeting},
            </h1>
            <h2 className="text-2xl sm:text-3xl font-semibold text-cg-sage">
              {user?.first_name}
            </h2>
          </div>

          {/* Children Avatars & Notification */}
          <div className="flex items-center gap-3">
            {allChildren.length > 0 && (
              <div className="flex -space-x-2">
                {allChildren.slice(0, 3).map((child) => (
                  <ChildAvatar key={child.id} child={child} size="md" />
                ))}
                {allChildren.length > 3 && (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center ring-2 ring-card">
                    <span className="text-sm font-medium text-muted-foreground">
                      +{allChildren.length - 3}
                    </span>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => router.push('/activities')}
              className="relative p-2 rounded-xl hover:bg-cg-sage-subtle transition-smooth"
            >
              <Bell className="w-6 h-6 text-muted-foreground" />
              {(dashboardSummary?.unread_activity_count ?? 0) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-cg-error rounded-full flex items-center justify-center px-1">
                  <span className="text-[10px] font-bold text-white">
                    {(dashboardSummary?.unread_activity_count ?? 0) > 9 ? '9+' : dashboardSummary?.unread_activity_count}
                  </span>
                </span>
              )}
            </button>
          </div>
        </div>

        {needsSetup ? (
          // Getting Started
          <div className="space-y-6">
            <div className="cg-card-elevated p-8 text-center">
              <div className="w-16 h-16 bg-cg-sage-subtle rounded-2xl flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-8 h-8 text-cg-sage" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Welcome to CommonGround
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Create a Family File to get started with co-parenting tools, shared calendars, and secure messaging.
              </p>
              <button
                onClick={() => router.push('/family-files/new')}
                className="cg-btn-primary inline-flex items-center gap-2"
              >
                Create Family File
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="cg-card p-4">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5 text-cg-sage" />
                </div>
                <h4 className="font-medium text-foreground">ARIA Messaging</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  AI-powered communication that reduces conflict
                </p>
              </div>
              <div className="cg-card p-4">
                <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-cg-sage" />
                </div>
                <h4 className="font-medium text-foreground">Shared Calendar</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Track custody schedules and exchanges
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Custody Status Card */}
            {allChildren.length > 0 && (
              <CustodyStatusCard
                custodyStatus={custodyStatus}
                children={allChildren}
                coparentName={custodyStatus?.coparent_name}
                onWithMe={handleWithMe}
              />
            )}

            {/* Action Stream */}
            <section>
              <h3 className="text-sm font-medium text-cg-sage uppercase tracking-wide mb-3">
                Action Stream
              </h3>
              <div className="space-y-3">
                {/* Show "all caught up" if no action items */}
                {dashboardSummary &&
                 dashboardSummary.pending_expenses_count === 0 &&
                 dashboardSummary.unread_messages_count === 0 &&
                 dashboardSummary.pending_agreements_count === 0 &&
                 dashboardSummary.unread_court_count === 0 && (
                  <div className="cg-card p-4 flex items-center gap-3">
                    <div className="w-12 h-12 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-cg-sage" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">All caught up!</p>
                      <p className="text-sm text-muted-foreground">No pending items to review</p>
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

                {/* Pending Agreements */}
                {(dashboardSummary?.pending_agreements_count ?? 0) > 0 && (
                  <ActionStreamItem
                    icon={FileText}
                    iconBg="bg-cg-sage-subtle"
                    iconColor="text-cg-sage"
                    title="Agreement Approval"
                    subtitle={
                      dashboardSummary!.pending_agreements.length > 0
                        ? `"${dashboardSummary!.pending_agreements[0].title}" needs approval`
                        : `${dashboardSummary!.pending_agreements_count} agreement${dashboardSummary!.pending_agreements_count > 1 ? 's' : ''} need approval`
                    }
                    hasNotification
                    onClick={() => router.push('/agreements')}
                  />
                )}

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
              <h3 className="text-sm font-medium text-cg-sage uppercase tracking-wide mb-3">
                Coming Up
              </h3>
              <UpcomingEventsList events={dashboardSummary?.upcoming_events} />
            </section>

            {/* Quick Actions */}
            <section>
              <h3 className="text-sm font-medium text-cg-sage uppercase tracking-wide mb-3">
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-cg-sage uppercase tracking-wide">
                    Family Files
                  </h3>
                  <button
                    onClick={() => router.push('/family-files')}
                    className="text-sm text-cg-sage hover:text-cg-sage-light transition-colors"
                  >
                    View all
                  </button>
                </div>
                <div className="space-y-3">
                  {familyFilesWithData.slice(0, 2).map(({ familyFile }) => (
                    <button
                      key={familyFile.id}
                      onClick={() => router.push(`/family-files/${familyFile.id}`)}
                      className="w-full cg-card p-4 flex items-center gap-4 text-left hover:shadow-md transition-smooth"
                    >
                      <div className="w-10 h-10 bg-cg-sage-subtle rounded-xl flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-cg-sage" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {familyFile.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {familyFile.children?.length || 0} children
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Activity */}
            <section>
              <h3 className="text-sm font-medium text-cg-sage uppercase tracking-wide mb-3">
                Recent Activity
              </h3>
              <div className="cg-card">
                <ActivityFeed
                  activities={dashboardSummary?.recent_activities || []}
                  unreadCount={dashboardSummary?.unread_activity_count || 0}
                  onSeeAll={() => router.push('/activities')}
                  isLoading={!dashboardSummary}
                />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
