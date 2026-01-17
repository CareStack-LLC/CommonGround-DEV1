'use client';

import { Card } from '@/components/ui/card';
import { Clock, Calendar, Users, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react';

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

const PATTERN_LABELS: Record<string, string> = {
  'week_on_week_off': 'Week On/Week Off',
  'alternating_weeks': 'Alternating Weeks',
  '2-2-3': '2-2-3 Rotation',
  '5-2-2-5': '5-2-2-5 Pattern',
  'every_other_weekend': 'Every Other Weekend',
  'every_weekend': 'Every Weekend',
  'primary_custody': 'Primary Custody',
  'custom': 'Custom Schedule',
};

function VarianceIndicator({ variance }: { variance: number }) {
  if (Math.abs(variance) <= 5) {
    return (
      <span className="text-xs text-cg-sage flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        On track
      </span>
    );
  }

  if (variance > 0) {
    return (
      <span className="text-xs text-cg-slate flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        +{variance.toFixed(1)}%
      </span>
    );
  }

  return (
    <span className="text-xs text-cg-amber flex items-center gap-1">
      <TrendingDown className="h-3 w-3" />
      {variance.toFixed(1)}%
    </span>
  );
}

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

  // Individual bar component with access to stats
  const ParentBarSection = ({
    name,
    days,
    percentage,
    color,
    variance,
    agreedPercentage,
  }: {
    name: string;
    days: number;
    percentage: number;
    color: 'sage' | 'slate';
    variance: number;
    agreedPercentage: number;
  }) => {
    const barWidth = totalTrackedDays > 0 ? Math.max((days / totalTrackedDays) * 100, 2) : 2;
    const colorClasses = color === 'sage' ? 'bg-cg-sage' : 'bg-cg-slate';
    const bgClasses = color === 'sage' ? 'bg-cg-sage-subtle' : 'bg-cg-slate-subtle';
    const textColorClasses = color === 'sage' ? 'text-cg-sage' : 'text-cg-slate';

    return (
      <div className="space-y-2">
        {/* Parent name and stats */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-foreground">{days}</span>
            <span className="text-xs text-muted-foreground">days</span>
          </div>
        </div>

        {/* Bar graph */}
        <div className={`h-7 ${bgClasses} rounded-lg overflow-hidden relative`}>
          <div
            className={`h-full ${colorClasses} rounded-lg transition-all duration-700 ease-out flex items-center justify-end px-2.5`}
            style={{ width: `${barWidth}%` }}
          >
            {barWidth > 20 && (
              <span className="text-xs font-semibold text-white">
                {percentage.toFixed(0)}%
              </span>
            )}
          </div>
          {barWidth <= 20 && (
            <span className={`absolute top-1/2 -translate-y-1/2 left-2.5 text-xs font-semibold ${textColorClasses}`}>
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>

        {/* Variance indicator */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Agreed: {agreedPercentage}%
          </span>
          <VarianceIndicator variance={variance} />
        </div>
      </div>
    );
  };

  return (
    <Card className={`p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cg-sage/10 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-cg-sage" />
          </div>
          <h3 className="font-semibold text-foreground">Parenting Time</h3>
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

      {/* Parent Bars - Stacked vertically on left */}
      <div className="space-y-5">
        {/* Parent A */}
        <ParentBarSection
          name={parentAName}
          days={stats.parent_a.days}
          percentage={stats.parent_a.percentage}
          color="sage"
          variance={stats.variance.parent_a}
          agreedPercentage={stats.agreed_schedule.parent_a_percentage}
        />

        {/* Parent B */}
        <ParentBarSection
          name={parentBName}
          days={stats.parent_b.days}
          percentage={stats.parent_b.percentage}
          color="slate"
          variance={stats.variance.parent_b}
          agreedPercentage={stats.agreed_schedule.parent_b_percentage}
        />
      </div>

      {/* Footer - Agreement & Tracking Info */}
      <div className="mt-5 pt-4 border-t border-border space-y-2">
        {/* Schedule Pattern */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {stats.agreed_schedule.pattern
                ? PATTERN_LABELS[stats.agreed_schedule.pattern] || stats.agreed_schedule.pattern
                : 'Custom schedule'}
            </span>
          </div>
          <span className="text-muted-foreground font-medium">
            {stats.agreed_schedule.parent_a_percentage}/{stats.agreed_schedule.parent_b_percentage}
          </span>
        </div>

        {/* Tracking Period */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">
              {totalTrackedDays} days tracked
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

        {/* Summary */}
        {stats.comparison_summary && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {stats.comparison_summary}
          </p>
        )}
      </div>
    </Card>
  );
}
