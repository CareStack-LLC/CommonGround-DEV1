'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useNotification } from '@/contexts/notification-context';
import { useRealtimeActivities } from '@/hooks/use-realtime-activities';
import { ProtectedRoute } from '@/components/protected-route';
import { Navigation } from '@/components/navigation';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import {
  familyFilesAPI,
  activitiesAPI,
  RecentActivity,
  FamilyFile,
} from '@/lib/api';
import {
  Bell,
  ArrowLeft,
  MessageSquare,
  Users,
  Calendar,
  Check,
  X,
  FileText,
  Wallet,
  Mail,
  Clock,
  CheckCheck,
} from 'lucide-react';

// Map activity icons to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  message: MessageSquare,
  users: Users,
  calendar: Calendar,
  check: Check,
  x: X,
  file: FileText,
  wallet: Wallet,
  mail: Mail,
  info: Clock,
};

// Map categories to colors
const categoryColors: Record<string, { bg: string; text: string; gradient: string }> = {
  communication: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', gradient: 'from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10' },
  custody: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', gradient: 'from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10' },
  schedule: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', gradient: 'from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-900/10' },
  financial: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', gradient: 'from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-900/10' },
  system: { bg: 'bg-slate-100 dark:bg-slate-800/50', text: 'text-slate-500 dark:text-slate-400', gradient: 'from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-800/30' },
};

interface GroupedActivities {
  today: RecentActivity[];
  yesterday: RecentActivity[];
  earlier: RecentActivity[];
}

function groupActivitiesByDate(activities: RecentActivity[]): GroupedActivities {
  const grouped: GroupedActivities = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  activities.forEach((activity) => {
    const activityDate = new Date(activity.created_at);
    if (isToday(activityDate)) {
      grouped.today.push(activity);
    } else if (isYesterday(activityDate)) {
      grouped.yesterday.push(activity);
    } else {
      grouped.earlier.push(activity);
    }
  });

  return grouped;
}

function ActivityItem({
  activity,
  onNavigate,
}: {
  activity: RecentActivity;
  onNavigate: (activity: RecentActivity) => void;
}) {
  const Icon = iconMap[activity.icon] || Clock;
  const colors = categoryColors[activity.category] || categoryColors.system;

  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
  });

  return (
    <button
      onClick={() => onNavigate(activity)}
      className={`w-full p-4 flex items-start gap-4 text-left transition-all duration-300 hover:bg-muted/50 ${
        !activity.is_read ? 'bg-[var(--portal-primary)]/5 border-l-4 border-l-[var(--portal-primary)]' : ''
      }`}
    >
      <div
        className={`w-12 h-12 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}
      >
        <Icon className={`w-5 h-5 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            !activity.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground'
          }`}
        >
          {activity.title}
        </p>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 font-medium">
            {activity.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1 font-medium">{timeAgo}</p>
      </div>
      {!activity.is_read && (
        <div className="w-2.5 h-2.5 bg-[var(--portal-primary)] rounded-full flex-shrink-0 mt-2" />
      )}
    </button>
  );
}

function ActivitySection({
  title,
  activities,
  onNavigate,
}: {
  title: string;
  activities: RecentActivity[];
  onNavigate: (activity: RecentActivity) => void;
}) {
  if (activities.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3 px-1" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
        {title}
      </h3>
      <div className="bg-card rounded-2xl border-2 border-border shadow-lg divide-y divide-border overflow-hidden">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function ActivitiesContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshUnreadCount, markAllRead: markAllReadInContext, decrementUnread } = useNotification();
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [familyFileId, setFamilyFileId] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  // Handle new activity from Supabase Realtime
  const handleNewActivity = useCallback((activity: RecentActivity) => {
    // Add new activity at the beginning of the list (most recent first)
    setActivities((prev) => {
      // Check if activity already exists
      if (prev.some((a) => a.id === activity.id)) {
        return prev;
      }
      return [activity, ...prev];
    });
    // Increment unread count
    setUnreadCount((prev) => prev + 1);
  }, []);

  // Subscribe to realtime activity updates
  useRealtimeActivities({
    familyFileId,
    onNewActivity: handleNewActivity,
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setIsLoading(true);
      // Get the active family file
      const familyFilesResponse = await familyFilesAPI.list();
      const activeFile = familyFilesResponse.items.find(
        (ff: FamilyFile) => ff.status === 'active'
      );

      if (!activeFile) {
        setIsLoading(false);
        return;
      }

      setFamilyFileId(activeFile.id);

      // Fetch activities (backend limit is max 20 for recent, use regular activities for more)
      const [activitiesData, unreadData] = await Promise.all([
        activitiesAPI.getActivities(activeFile.id, { limit: 50 }),
        activitiesAPI.getUnreadCount(activeFile.id),
      ]);

      setActivities(activitiesData.items);
      setUnreadCount(unreadData.unread_count);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!familyFileId || unreadCount === 0) return;

    try {
      setIsMarkingRead(true);
      await activitiesAPI.markAllAsRead(familyFileId);

      // Update local state
      setActivities((prev) =>
        prev.map((a) => ({ ...a, is_read: true }))
      );
      setUnreadCount(0);

      // Update the global notification context (updates the bell badge)
      await markAllReadInContext();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleActivityClick = async (activity: RecentActivity) => {
    // Mark as read if not already
    if (!activity.is_read && familyFileId) {
      try {
        await activitiesAPI.markAsRead(familyFileId, activity.id);
        setActivities((prev) =>
          prev.map((a) =>
            a.id === activity.id ? { ...a, is_read: true } : a
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Update the global notification context (updates the bell badge)
        decrementUnread();
      } catch (error) {
        console.error('Failed to mark activity as read:', error);
      }
    }

    // Navigate based on subject type
    switch (activity.subject_type) {
      case 'message':
        router.push('/messages');
        break;
      case 'child':
        if (activity.subject_id) {
          router.push(`/children/${activity.subject_id}`);
        }
        break;
      case 'event':
        router.push('/schedule');
        break;
      case 'exchange':
        router.push('/schedule');
        break;
      case 'agreement':
        if (activity.subject_id) {
          router.push(`/agreements/${activity.subject_id}`);
        } else {
          router.push('/agreements');
        }
        break;
      default:
        break;
    }
  };

  const groupedActivities = groupActivitiesByDate(activities);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-24 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-14 h-14 border-3 border-[var(--portal-primary)]/20 border-t-[var(--portal-primary)] rounded-full animate-spin mx-auto" />
              <p className="mt-4 text-muted-foreground font-medium">Loading activities...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-xl bg-card border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[var(--portal-primary)]/10 to-[var(--portal-primary)]/5 rounded-2xl flex items-center justify-center shadow-md">
                <Bell className="w-5 h-5 text-[var(--portal-primary)]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Activity</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground font-medium">
                    {unreadCount} unread
                  </p>
                )}
              </div>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingRead}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-[var(--portal-primary)] bg-card border-2 border-border hover:border-[var(--portal-primary)]/30 hover:shadow-lg rounded-xl transition-all duration-300 disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {isMarkingRead ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        {/* Activities */}
        {activities.length === 0 ? (
          <div className="bg-card rounded-2xl border-2 border-border shadow-lg p-8 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-muted to-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
              <Bell className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>
              No activity yet
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto font-medium">
              When you or your co-parent send messages, update profiles, or
              complete exchanges, you&apos;ll see the activity here.
            </p>
          </div>
        ) : (
          <>
            <ActivitySection
              title="Today"
              activities={groupedActivities.today}
              onNavigate={handleActivityClick}
            />
            <ActivitySection
              title="Yesterday"
              activities={groupedActivities.yesterday}
              onNavigate={handleActivityClick}
            />
            <ActivitySection
              title="Earlier"
              activities={groupedActivities.earlier}
              onNavigate={handleActivityClick}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <ProtectedRoute>
      <ActivitiesContent />
    </ProtectedRoute>
  );
}
