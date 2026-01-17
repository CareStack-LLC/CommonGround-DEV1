'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CGAvatar } from '@/components/cg';
import { Clock, Calendar, ChevronRight, FileText, Users, ArrowRight, MapPin } from 'lucide-react';
import { exchangesAPI, CustodyExchangeInstance } from '@/lib/api';
import { formatInUserTimezone, isToday as isTodayTz } from '@/lib/timezone';
import { useAuth } from '@/lib/auth-context';

interface ParentStats {
  user_id: string;
  days: number;
  percentage: number;
}

interface AgreedSchedule {
  pattern: string | null;
  parent_a_percentage: number;
  parent_b_percentage: number;
}

interface CustodyVariance {
  parent_a: number;
  parent_b: number;
}

interface PeriodInfo {
  start_date: string;
  end_date: string;
  total_days?: number;
}

interface ChildCustodyStats {
  child_id: string;
  child_name: string;
  total_days: number;
  recorded_days: number;
  unknown_days: number;
  parent_a: ParentStats;
  parent_b: ParentStats;
  agreed_schedule: AgreedSchedule;
  variance: CustodyVariance;
  comparison_summary: string;
  period: PeriodInfo;
}

interface FamilyCustodyStats {
  family_file_id: string;
  period: PeriodInfo;
  parent_a_id: string;
  parent_b_id: string;
  children: ChildCustodyStats[];
  summary: string;
}

interface CustodyDashboardWidgetProps {
  familyFileId: string;
  familyStats?: FamilyCustodyStats | null;
  isLoading?: boolean;
  parentAName?: string;
  parentBName?: string;
  currentUserId?: string;
  className?: string;
  onViewReport?: () => void;
}

const PERIOD_OPTIONS = [
  { value: '30_days', label: '30 Days' },
  { value: '90_days', label: '90 Days' },
  { value: 'ytd', label: 'YTD' },
];

// Child custody summary row
function ChildCustodyRow({
  child,
  parentAName,
  parentBName,
  isParentA,
  onClick,
}: {
  child: ChildCustodyStats;
  parentAName: string;
  parentBName: string;
  isParentA: boolean;
  onClick?: () => void;
}) {
  // Get the current user's days
  const myDays = isParentA ? child.parent_a.days : child.parent_b.days;
  const theirDays = isParentA ? child.parent_b.days : child.parent_a.days;
  const totalTracked = child.recorded_days;

  // Bar width based on total days in period (like parenting time card)
  const periodTotalDays = child.total_days || 30;
  const myBarWidth = periodTotalDays > 0 ? Math.max((myDays / periodTotalDays) * 100, myDays > 0 ? 3 : 0) : 0;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      {/* Child Avatar */}
      <CGAvatar name={child.child_name} size="sm" color="sage" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="font-medium text-foreground text-sm truncate">{child.child_name}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-cg-sage">{myDays}</span>
            <span className="text-xs text-muted-foreground">days with you</span>
          </div>
        </div>

        {/* Progress Bar - sage color for current user's days */}
        <div className="h-2 bg-cg-sage-subtle rounded-full overflow-hidden">
          <div
            className="h-full bg-cg-sage rounded-full transition-all duration-500"
            style={{ width: `${myBarWidth}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">
            {totalTracked > 0 ? `${totalTracked} days tracked` : 'No data yet'}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    </button>
  );
}

// Upcoming exchange row
function ExchangeRow({
  exchange,
  timezone,
  onClick,
}: {
  exchange: CustodyExchangeInstance;
  timezone: string;
  onClick?: () => void;
}) {
  const scheduledTime = exchange.override_time || exchange.scheduled_time;

  // Format the date
  const isToday = isTodayTz(scheduledTime, timezone);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString();
  const isTomorrow = formatInUserTimezone(scheduledTime, timezone, 'yyyy-MM-dd') ===
    formatInUserTimezone(tomorrow, timezone, 'yyyy-MM-dd');

  const timeStr = formatInUserTimezone(scheduledTime, timezone, 'h:mm a');
  const dayStr = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatInUserTimezone(scheduledTime, timezone, 'EEE, MMM d');

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-lg bg-cg-slate-subtle/50 cursor-pointer hover:bg-cg-slate-subtle transition-colors"
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-lg bg-cg-slate/10 flex items-center justify-center flex-shrink-0">
        <ArrowRight className="h-4 w-4 text-cg-slate" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">Exchange</p>
        <p className="text-xs text-muted-foreground">
          {dayStr} at {timeStr}
        </p>
      </div>
      {exchange.override_location && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

export default function CustodyDashboardWidget({
  familyFileId,
  familyStats,
  isLoading = false,
  parentAName = 'Parent A',
  parentBName = 'Parent B',
  currentUserId,
  className = '',
  onViewReport,
}: CustodyDashboardWidgetProps) {
  const router = useRouter();
  const { user, timezone } = useAuth();
  const [upcomingExchanges, setUpcomingExchanges] = useState<CustodyExchangeInstance[]>([]);
  const [exchangesLoading, setExchangesLoading] = useState(true);

  // Determine if current user is parent A
  const isParentA = currentUserId
    ? familyStats?.parent_a_id === currentUserId
    : user?.id === familyStats?.parent_a_id;

  // Fetch upcoming exchanges
  useEffect(() => {
    async function loadExchanges() {
      if (!familyFileId) return;

      try {
        setExchangesLoading(true);
        const exchanges = await exchangesAPI.getUpcoming(familyFileId, undefined, undefined, 3);
        setUpcomingExchanges(exchanges);
      } catch (err) {
        console.error('Failed to load upcoming exchanges:', err);
        setUpcomingExchanges([]);
      } finally {
        setExchangesLoading(false);
      }
    }

    loadExchanges();
  }, [familyFileId]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 bg-muted rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-muted/50 rounded" />
            <div className="h-12 bg-muted/50 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  // Calculate total days for current user across all children
  const totalMyDays = familyStats?.children.reduce((sum, c) => {
    return sum + (isParentA ? c.parent_a.days : c.parent_b.days);
  }, 0) || 0;

  const totalTheirDays = familyStats?.children.reduce((sum, c) => {
    return sum + (isParentA ? c.parent_b.days : c.parent_a.days);
  }, 0) || 0;

  const totalDays = totalMyDays + totalTheirDays;

  // No data state - but still show upcoming exchanges if any
  const hasNoStats = !familyStats || familyStats.children.length === 0;
  const hasNoExchanges = upcomingExchanges.length === 0;

  if (hasNoStats && hasNoExchanges && !exchangesLoading) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-cg-sage/10 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-cg-sage" />
          </div>
          <h3 className="font-semibold text-foreground">Parenting Time</h3>
        </div>
        <div className="text-center py-6">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No custody data yet
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check-ins and exchanges will appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cg-sage/10 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-cg-sage" />
          </div>
          <h3 className="font-semibold text-foreground">Parenting Time</h3>
        </div>
        {onViewReport && familyStats && (
          <button
            onClick={onViewReport}
            className="text-sm text-cg-sage hover:text-cg-sage/80 flex items-center gap-1 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Report
          </button>
        )}
      </div>

      {/* Total Days Summary */}
      {familyStats && familyStats.children.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-cg-sage-subtle/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total with you</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-cg-sage">{totalMyDays}</span>
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>
          {totalDays > 0 && (
            <div className="mt-2 h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-cg-sage rounded-full transition-all duration-500"
                style={{ width: `${(totalMyDays / totalDays) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Per-Child Breakdown */}
      {familyStats && familyStats.children.length > 0 && (
        <div className="space-y-1 mb-4">
          {familyStats.children.map((child) => (
            <ChildCustodyRow
              key={child.child_id}
              child={child}
              parentAName={parentAName}
              parentBName={parentBName}
              isParentA={isParentA}
              onClick={() => router.push(`/family-files/${familyFileId}/children/${child.child_id}`)}
            />
          ))}
        </div>
      )}

      {/* Upcoming Exchanges */}
      {!exchangesLoading && upcomingExchanges.length > 0 && (
        <div className="pt-3 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Upcoming Exchanges
          </h4>
          <div className="space-y-2">
            {upcomingExchanges.slice(0, 2).map((exchange) => (
              <ExchangeRow
                key={exchange.id}
                exchange={exchange}
                timezone={timezone}
                onClick={() => router.push(`/schedule`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer - Period Info */}
      {familyStats && (
        <div className="mt-4 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Last {familyStats.period.total_days || 30} days
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
