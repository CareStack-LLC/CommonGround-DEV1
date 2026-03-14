'use client';

import { Card } from '@/components/ui/card';
import { Clock, Users } from 'lucide-react';

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
  period?: PeriodInfo;
}

interface ParentingTimeCardProps {
  stats: ChildCustodyStats;
  parentAName?: string;
  parentBName?: string;
  parentAColor?: string;
  parentBColor?: string;
  agreementStartDate?: string;
  className?: string;
  onPeriodChange?: (period: string) => void;
  currentPeriod?: string;
}

const PERIOD_OPTIONS = [
  { value: '30_days', label: 'Last 30 Days' },
  { value: '90_days', label: 'Last 90 Days' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all_time', label: 'All Time' },
];

export default function ParentingTimeCard({
  stats,
  parentAName = 'Parent A',
  parentBName = 'Parent B',
  parentAColor,
  parentBColor,
  agreementStartDate,
  className = '',
  onPeriodChange,
  currentPeriod = '30_days',
}: ParentingTimeCardProps) {
  // Calculate total tracked days
  const totalTrackedDays = stats.parent_a.days + stats.parent_b.days;

  // Format agreement start date if provided
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate days since agreement start
  const daysSinceStart = agreementStartDate
    ? Math.floor((Date.now() - new Date(agreementStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : stats.total_days;

  // Total days in the period (e.g., 30 days)
  const periodTotalDays = stats.total_days || 30;

  // Individual bar component - bar width based on days out of period total
  const ParentBarSection = ({
    name,
    days,
    color,
  }: {
    name: string;
    days: number;
    color: 'sage' | 'slate';
  }) => {
    // Bar width = days / period total (e.g., 1 day out of 30 = 3.3%)
    // Minimum width of 1% so it's visible even with 0 days
    const barWidth = periodTotalDays > 0 ? Math.max((days / periodTotalDays) * 100, days > 0 ? 3 : 0) : 0;
    const colorClasses = color === 'sage' ? 'bg-cg-sage' : 'bg-cg-slate';
    const bgClasses = color === 'sage' ? 'bg-cg-sage-subtle' : 'bg-cg-slate-subtle';

    return (
      <div className="space-y-2">
        {/* Parent name and stats */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">{days}</span>
            <span className="text-xs text-muted-foreground">{days === 1 ? 'day' : 'days'}</span>
          </div>
        </div>

        {/* Bar graph - width based on days out of period total */}
        <div className={`h-7 ${bgClasses} rounded-lg overflow-hidden relative`}>
          <div
            className={`h-full ${colorClasses} rounded-lg transition-all duration-700 ease-out`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-2xl border-2 border-slate-200 shadow-lg p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cg-sage/10 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-cg-sage" />
          </div>
          <h3 className="font-semibold text-foreground" style={{ fontFamily: 'DM Serif Display, Georgia, serif' }}>Parenting Time</h3>
        </div>

        {/* Period Selector */}
        {onPeriodChange && (
          <select
            value={currentPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background text-foreground focus:ring-2 focus:ring-cg-sage/30 focus:border-cg-sage transition-all"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Parent Bars - Stacked vertically */}
      <div className="space-y-5">
        {/* Parent A */}
        <ParentBarSection
          name={parentAName}
          days={stats.parent_a.days}
          color="sage"
        />

        {/* Parent B */}
        <ParentBarSection
          name={parentBName}
          days={stats.parent_b.days}
          color="slate"
        />
      </div>

      {/* Footer - Tracking Info */}
      <div className="mt-5 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {totalTrackedDays} {totalTrackedDays === 1 ? 'day' : 'days'} tracked
              {stats.unknown_days > 0 && (
                <span className="text-cg-amber ml-1">
                  ({stats.unknown_days} untracked)
                </span>
              )}
            </span>
          </div>
          {agreementStartDate && (
            <span className="text-muted-foreground">
              Since {formatDate(agreementStartDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
