'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
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
const categoryColors: Record<string, { bg: string; text: string }> = {
  communication: { bg: 'bg-cg-slate-subtle', text: 'text-cg-slate' },
  custody: { bg: 'bg-cg-sage-subtle', text: 'text-cg-sage' },
  schedule: { bg: 'bg-cg-amber-subtle', text: 'text-cg-amber' },
  financial: { bg: 'bg-cg-error-subtle', text: 'text-cg-error' },
  system: { bg: 'bg-muted', text: 'text-muted-foreground' },
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
      className={`w-full p-4 flex items-start gap-4 text-left transition-colors hover:bg-muted/50 ${
        !activity.is_read ? 'bg-cg-sage-subtle/30 border-l-4 border-l-cg-sage' : ''
      }`}
    >
      <div
        className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-5 h-5 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            !activity.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'
          }`}
        >
          {activity.title}
        </p>
        {activity.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
            {activity.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
      </div>
      {!activity.is_read && (
        <div className="w-2 h-2 bg-cg-sage rounded-full flex-shrink-0 mt-2" />
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
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-4">
        {title}
      </h3>
      <div className="cg-card divide-y divide-border/50">
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
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [familyFileId, setFamilyFileId] = useState<string | null>(null);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

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
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 py-8 pb-24 lg:pb-8">
          <div className="flex items-center justify-center h-[60vh]">
            <div className="text-center">
              <div className="w-12 h-12 bg-cg-sage/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Bell className="w-6 h-6 text-cg-sage" />
              </div>
              <p className="mt-4 text-muted-foreground">Loading activities...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24 lg:pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Activity</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isMarkingRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-cg-sage hover:bg-cg-sage-subtle rounded-lg transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              {isMarkingRead ? 'Marking...' : 'Mark all read'}
            </button>
          )}
        </div>

        {/* Activities */}
        {activities.length === 0 ? (
          <div className="cg-card p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No activity yet
            </h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
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
