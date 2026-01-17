'use client';

import { Card } from '@/components/ui/card';
import { Clock, Calendar, TrendingUp, TrendingDown, Scale } from 'lucide-react';

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
}

interface ParentingTimeCardProps {
  stats: ChildCustodyStats;
  parentAName?: string;
  parentBName?: string;
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

function VarianceIndicator({ variance, label }: { variance: number; label: string }) {
  if (Math.abs(variance) <= 5) {
    return (
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Scale className="h-3 w-3" />
        On track
      </span>
    );
  }

  if (variance > 0) {
    return (
      <span className="text-xs text-blue-600 flex items-center gap-1">
        <TrendingUp className="h-3 w-3" />
        +{variance.toFixed(1)}% {label}
      </span>
    );
  }

  return (
    <span className="text-xs text-amber-600 flex items-center gap-1">
      <TrendingDown className="h-3 w-3" />
      {variance.toFixed(1)}% {label}
    </span>
  );
}

export default function ParentingTimeCard({
  stats,
  parentAName = 'Parent A',
  parentBName = 'Parent B',
  className = '',
  onPeriodChange,
  currentPeriod = '30_days',
}: ParentingTimeCardProps) {
  // Calculate progress bar value (parent A's percentage out of 100)
  const progressValue = stats.recorded_days > 0 ? stats.parent_a.percentage : 50;

  // Determine bar colors based on variance
  const getBarColor = () => {
    const variance = Math.abs(stats.variance.parent_a);
    if (variance <= 5) return 'bg-emerald-500';
    if (variance <= 15) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <Card className={`p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-sage-600" />
          <h3 className="font-semibold text-gray-900">Parenting Time</h3>
        </div>

        {/* Period Selector */}
        {onPeriodChange && (
          <select
            value={currentPeriod}
            onChange={(e) => onPeriodChange(e.target.value)}
            className="text-sm border-gray-200 rounded-lg px-2 py-1 focus:ring-sage-500 focus:border-sage-500"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Main Progress Bar */}
      <div className="mb-4">
        <div className="relative h-6 bg-gray-100 rounded-full overflow-hidden">
          {/* Parent A side (left) */}
          <div
            className={`absolute left-0 top-0 h-full ${getBarColor()} transition-all duration-500`}
            style={{ width: `${progressValue}%` }}
          />
          {/* Parent B side (right) - shown as remaining space */}
          <div
            className="absolute right-0 top-0 h-full bg-gray-300 transition-all duration-500"
            style={{ width: `${100 - progressValue}%` }}
          />
          {/* Center marker for 50/50 */}
          <div className="absolute left-1/2 top-0 w-0.5 h-full bg-white/50" />
        </div>
      </div>

      {/* Parent Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Parent A */}
        <div className="text-left">
          <p className="text-sm font-medium text-gray-700 truncate">{parentAName}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gray-900">
              {stats.parent_a.percentage.toFixed(0)}%
            </span>
            <span className="text-sm text-gray-500">
              ({stats.parent_a.days} days)
            </span>
          </div>
          <VarianceIndicator variance={stats.variance.parent_a} label="above agreed" />
        </div>

        {/* Parent B */}
        <div className="text-right">
          <p className="text-sm font-medium text-gray-700 truncate">{parentBName}</p>
          <div className="flex items-baseline gap-1 justify-end">
            <span className="text-2xl font-bold text-gray-900">
              {stats.parent_b.percentage.toFixed(0)}%
            </span>
            <span className="text-sm text-gray-500">
              ({stats.parent_b.days} days)
            </span>
          </div>
          <VarianceIndicator variance={stats.variance.parent_b} label="above agreed" />
        </div>
      </div>

      {/* Agreed Schedule Info */}
      <div className="border-t border-gray-100 pt-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">
              Agreed: {stats.agreed_schedule.pattern ?
                PATTERN_LABELS[stats.agreed_schedule.pattern] || stats.agreed_schedule.pattern :
                'Not specified'
              }
            </span>
          </div>
          <span className="text-gray-500">
            {stats.agreed_schedule.parent_a_percentage}/{stats.agreed_schedule.parent_b_percentage}
          </span>
        </div>

        {/* Summary */}
        <p className="text-xs text-gray-500 mt-2">
          {stats.comparison_summary}
        </p>

        {/* Data completeness indicator */}
        {stats.unknown_days > 0 && (
          <p className="text-xs text-amber-600 mt-1">
            {stats.unknown_days} days without tracking data
          </p>
        )}
      </div>
    </Card>
  );
}
