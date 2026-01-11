'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare,
  Users,
  Calendar,
  Check,
  X,
  FileText,
  Wallet,
  Mail,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { RecentActivity } from '@/lib/api';

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

interface ActivityItemProps {
  activity: RecentActivity;
  onNavigate?: (activity: RecentActivity) => void;
}

function ActivityItem({ activity, onNavigate }: ActivityItemProps) {
  const Icon = iconMap[activity.icon] || Clock;
  const colors = categoryColors[activity.category] || categoryColors.system;

  // Format relative time
  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: false,
  });

  // Format time for display (e.g., "2m", "3h", "1d")
  const formatTimeShort = (time: string): string => {
    if (time.includes('less than a minute')) return 'now';
    if (time.includes('minute')) {
      const mins = parseInt(time);
      return isNaN(mins) ? '1m' : `${mins}m`;
    }
    if (time.includes('hour')) {
      const hrs = parseInt(time);
      return isNaN(hrs) ? '1h' : `${hrs}h`;
    }
    if (time.includes('day')) {
      const days = parseInt(time);
      return isNaN(days) ? '1d' : `${days}d`;
    }
    return time.split(' ')[0];
  };

  const handleClick = () => {
    if (onNavigate) {
      onNavigate(activity);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`w-full p-3 flex items-center gap-3 text-left rounded-lg transition-colors hover:bg-muted/50 ${
        !activity.is_read ? 'bg-cg-sage-subtle/30 border-l-2 border-l-cg-sage' : ''
      }`}
    >
      <div
        className={`w-9 h-9 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}
      >
        <Icon className={`w-4 h-4 ${colors.text}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${
            !activity.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground'
          } truncate`}
        >
          {activity.title}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0">
        {formatTimeShort(timeAgo)}
      </span>
    </button>
  );
}

interface ActivityFeedProps {
  activities: RecentActivity[];
  unreadCount?: number;
  onSeeAll?: () => void;
  onActivityClick?: (activity: RecentActivity) => void;
  isLoading?: boolean;
  maxItems?: number;
}

export function ActivityFeed({
  activities,
  unreadCount = 0,
  onSeeAll,
  onActivityClick,
  isLoading = false,
  maxItems = 5,
}: ActivityFeedProps) {
  const router = useRouter();

  // Navigate based on activity subject type
  const handleActivityClick = (activity: RecentActivity) => {
    if (onActivityClick) {
      onActivityClick(activity);
    }

    // Default navigation based on subject type
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

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 animate-pulse flex items-center gap-3">
            <div className="w-9 h-9 bg-muted rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
            <div className="h-3 bg-muted rounded w-8" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  const displayedActivities = activities.slice(0, maxItems);
  const hasMore = activities.length > maxItems;

  return (
    <div>
      <div className="divide-y divide-border/50">
        {displayedActivities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            onNavigate={handleActivityClick}
          />
        ))}
      </div>

      {(hasMore || onSeeAll) && (
        <button
          onClick={onSeeAll}
          className="w-full p-3 text-sm font-medium text-cg-sage hover:text-cg-sage/80 flex items-center justify-center gap-1 transition-colors"
        >
          See all activity
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ActivityFeed;
