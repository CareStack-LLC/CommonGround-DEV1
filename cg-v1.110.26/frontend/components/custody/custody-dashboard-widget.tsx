'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CGAvatar } from '@/components/cg';
import { Clock, Calendar, ChevronRight, FileText, Users } from 'lucide-react';

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
  className?: string;
  onViewReport?: () => void;
}

const PERIOD_OPTIONS = [
  { value: '30_days', label: '30 Days' },
  { value: '90_days', label: '90 Days' },
  { value: 'ytd', label: 'YTD' },
];

function ChildCustodyRow({
  child,
  parentAName,
  parentBName,
  onClick,
}: {
  child: ChildCustodyStats;
  parentAName: string;
  parentBName: string;
  onClick?: () => void;
}) {
  const progressValue = child.recorded_days > 0 ? child.parent_a.percentage : 50;

  // Determine color based on variance
  const getStatusColor = () => {
    const variance = Math.abs(child.variance.parent_a);
    if (variance <= 5) return 'bg-emerald-500';
    if (variance <= 15) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
    >
      {/* Child Avatar */}
      <CGAvatar name={child.child_name} size="sm" color="sage" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{child.child_name}</p>

        {/* Mini Progress Bar */}
        <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${getStatusColor()} transition-all`}
            style={{ width: `${progressValue}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {child.parent_a.percentage.toFixed(0)}% / {child.parent_b.percentage.toFixed(0)}%
          </span>
          <span className="text-xs text-gray-400">
            {child.recorded_days} days
          </span>
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

export default function CustodyDashboardWidget({
  familyFileId,
  familyStats,
  isLoading = false,
  parentAName = 'Parent A',
  parentBName = 'Parent B',
  className = '',
  onViewReport,
}: CustodyDashboardWidgetProps) {
  const router = useRouter();

  // Loading state
  if (isLoading) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        </div>
      </Card>
    );
  }

  // No data state
  if (!familyStats || familyStats.children.length === 0) {
    return (
      <Card className={`p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-sage-600" />
          <h3 className="font-semibold text-gray-900">Parenting Time</h3>
        </div>
        <div className="text-center py-6">
          <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            No custody data yet
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Check-ins and exchanges will appear here
          </p>
        </div>
      </Card>
    );
  }

  // Calculate overall stats
  const totalParentADays = familyStats.children.reduce((sum, c) => sum + c.parent_a.days, 0);
  const totalParentBDays = familyStats.children.reduce((sum, c) => sum + c.parent_b.days, 0);
  const totalDays = totalParentADays + totalParentBDays;
  const overallParentAPercent = totalDays > 0 ? (totalParentADays / totalDays) * 100 : 50;

  return (
    <Card className={`p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-sage-600" />
          <h3 className="font-semibold text-gray-900">Parenting Time</h3>
        </div>
        {onViewReport && (
          <button
            onClick={onViewReport}
            className="text-sm text-sage-600 hover:text-sage-700 flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            Report
          </button>
        )}
      </div>

      {/* Overall Summary Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
          <span>{parentAName}: {overallParentAPercent.toFixed(0)}%</span>
          <span>{parentBName}: {(100 - overallParentAPercent).toFixed(0)}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-sage-500 transition-all duration-500"
            style={{ width: `${overallParentAPercent}%` }}
          />
        </div>
      </div>

      {/* Per-Child Breakdown */}
      <div className="space-y-1">
        {familyStats.children.map((child) => (
          <ChildCustodyRow
            key={child.child_id}
            child={child}
            parentAName={parentAName}
            parentBName={parentBName}
            onClick={() => router.push(`/family-files/${familyFileId}/children/${child.child_id}`)}
          />
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">{familyStats.summary}</p>
        <div className="flex items-center gap-2 mt-2">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-xs text-gray-400">
            {familyStats.period.total_days || 30} days tracked
          </span>
        </div>
      </div>
    </Card>
  );
}
