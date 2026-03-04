'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { CGAvatar } from '@/components/cg';
import { Clock, Calendar, ChevronRight, FileText, Users } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getImageUrl } from '@/lib/api';

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

interface ChildData {
  id: string;
  first_name: string;
  last_name?: string;
  photo_url?: string | null;
}

interface CustodyDashboardWidgetProps {
  familyFileId: string;
  familyStats?: FamilyCustodyStats | null;
  childrenData?: ChildData[];
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

// Child custody summary row - shows only logged-in parent's time
function ChildCustodyRow({
  child,
  childData,
  isParentA,
  onClick,
}: {
  child: ChildCustodyStats;
  childData?: ChildData;
  isParentA: boolean;
  onClick?: () => void;
}) {
  const [imageError, setImageError] = useState(false);

  // Get only the current user's days
  const myDays = isParentA ? child.parent_a.days : child.parent_b.days;
  const totalTracked = child.recorded_days;

  // Bar width based on total days in period
  const periodTotalDays = child.total_days || 30;
  const myBarWidth = periodTotalDays > 0 ? Math.max((myDays / periodTotalDays) * 100, myDays > 0 ? 3 : 0) : 0;

  // Get photo URL
  const photoUrl = childData?.photo_url ? getImageUrl(childData.photo_url) : null;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      {/* Child Avatar with Photo */}
      <div className="w-10 h-10 rounded-full bg-cg-amber-subtle flex items-center justify-center flex-shrink-0 overflow-hidden ring-2 ring-card">
        {photoUrl && !imageError ? (
          <img
            src={photoUrl}
            alt={child.child_name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <span className="text-sm font-semibold text-cg-amber">
            {child.child_name.charAt(0)}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Child name */}
        <p className="font-medium text-foreground text-sm truncate mb-1.5">{child.child_name}</p>

        {/* Your days with progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="h-2 bg-cg-sage-subtle rounded-full overflow-hidden">
              <div
                className="h-full bg-cg-sage rounded-full transition-all duration-500"
                style={{ width: `${myBarWidth}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-bold text-cg-sage whitespace-nowrap">{myDays} {myDays === 1 ? 'day' : 'days'}</span>
        </div>

        {/* Tracking info */}
        <div className="mt-1">
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

export default function CustodyDashboardWidget({
  familyFileId,
  familyStats,
  childrenData = [],
  isLoading = false,
  parentAName = 'Parent A',
  parentBName = 'Parent B',
  currentUserId,
  className = '',
  onViewReport,
}: CustodyDashboardWidgetProps) {
  const router = useRouter();
  const { user } = useAuth();

  // Determine if current user is parent A
  const isParentA = currentUserId
    ? familyStats?.parent_a_id === currentUserId
    : user?.id === familyStats?.parent_a_id;

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

  // No data state
  const hasNoStats = !familyStats || familyStats.children.length === 0;

  if (hasNoStats) {
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

      {/* Per-Child Breakdown */}
      {familyStats && familyStats.children.length > 0 && (
        <div className="space-y-1 mb-4">
          {familyStats.children.map((child) => {
            const childData = childrenData.find(c => c.id === child.child_id);
            return (
              <ChildCustodyRow
                key={child.child_id}
                child={child}
                childData={childData}
                isParentA={isParentA}
                onClick={() => router.push(`/family-files/${familyFileId}/children/${child.child_id}`)}
              />
            );
          })}
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
