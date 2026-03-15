'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { format, parseISO, subDays, startOfYear, differenceInDays } from 'date-fns';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  ArrowRight,
  Shield,
  Timer,
  BarChart3,
  Repeat,
  Navigation,
} from 'lucide-react';
import {
  custodyTimeAPI,
  CustodySession,
  RealTimeComplianceStats,
  CustodyTimelineResponse,
  ChildCustodyStats,
  TimePeriod,
  exchangeComplianceAPI,
  ExchangeComplianceResponse,
  ExchangeDetail,
  eventsAPI,
  EventV2,
  FamilyFileDetail,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// TYPES
// =============================================================================

interface CustodyDashboardProps {
  childId: string;
  familyFileId: string;
  familyFile: FamilyFileDetail;
}

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '30_days', label: '30 Days' },
  { value: '90_days', label: '90 Days' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all_time', label: 'All Time' },
];

// =============================================================================
// HELPERS
// =============================================================================

function periodToDays(period: TimePeriod): number {
  switch (period) {
    case '30_days': return 30;
    case '90_days': return 90;
    case 'ytd': return differenceInDays(new Date(), startOfYear(new Date())) + 1;
    case 'all_time': return 365;
  }
}

function periodToDateRange(period: TimePeriod): { startDate?: string; endDate?: string } {
  const now = new Date();
  const end = format(now, 'yyyy-MM-dd');
  switch (period) {
    case '30_days': return { startDate: format(subDays(now, 30), 'yyyy-MM-dd'), endDate: end };
    case '90_days': return { startDate: format(subDays(now, 90), 'yyyy-MM-dd'), endDate: end };
    case 'ytd': return { startDate: format(startOfYear(now), 'yyyy-MM-dd'), endDate: end };
    case 'all_time': return {};
  }
}

function formatDuration(minutes: number): string {
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${Math.round(minutes % 60)}m`;
  return `${Math.round(minutes)}m`;
}

function formatSchedulePattern(pattern: string | null): string {
  if (!pattern) return 'Not specified';
  const labels: Record<string, string> = {
    'week_on_week_off': 'Alternating Weeks',
    'alternating_weeks': 'Alternating Weeks',
    '2-2-3': '2-2-3 Rotation',
    '5-2-2-5': '5-2-2-5 Rotation',
    'every_other_weekend': 'Every Other Weekend',
    'every_weekend': 'Every Weekend',
    'primary_custody': 'Primary Custody',
    'custom': 'Custom Schedule',
  };
  return labels[pattern] || pattern.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function outcomeColor(outcome: string | null): string {
  switch (outcome) {
    case 'completed': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
    case 'missed': return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
    case 'one_party_present': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
    case 'disputed': return 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function outcomeLabel(outcome: string | null): string {
  switch (outcome) {
    case 'completed': return 'Completed';
    case 'missed': return 'Missed';
    case 'one_party_present': return 'Partial';
    case 'disputed': return 'Disputed';
    case 'pending': return 'Pending';
    case 'pending_qr': return 'Awaiting QR';
    default: return outcome || 'Unknown';
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CustodyDashboard({ childId, familyFileId, familyFile }: CustodyDashboardProps) {
  const [period, setPeriod] = useState<TimePeriod>('30_days');
  const [loading, setLoading] = useState(true);

  // Data states
  const [timelineData, setTimelineData] = useState<CustodyTimelineResponse | null>(null);
  const [childStats, setChildStats] = useState<ChildCustodyStats | null>(null);
  const [complianceData, setComplianceData] = useState<ExchangeComplianceResponse | null>(null);
  const [exchangeDetails, setExchangeDetails] = useState<ExchangeDetail[]>([]);
  const [swapEvents, setSwapEvents] = useState<EventV2[]>([]);

  // Live timer
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Parent name helpers
  const parentAName = familyFile.parent_a_info?.first_name || 'Parent A';
  const parentBName = familyFile.parent_b_info?.first_name || 'Parent B';

  const getParentName = (userId: string | undefined | null): string => {
    if (!userId) return 'Unknown';
    if (userId === familyFile.parent_a_id) return parentAName;
    if (userId === familyFile.parent_b_id) return parentBName;
    return 'Unknown';
  };

  const getRoleName = (role: string): string => {
    if (role === 'petitioner') return parentAName;
    if (role === 'respondent') return parentBName;
    return role;
  };

  // Load all data
  useEffect(() => {
    loadData();
  }, [childId, familyFileId, period]);

  const loadData = async () => {
    setLoading(true);
    const days = periodToDays(period);
    const { startDate, endDate } = periodToDateRange(period);

    const results = await Promise.allSettled([
      custodyTimeAPI.getTimeline(childId, days),
      custodyTimeAPI.getChildStats(childId, period, startDate, endDate),
      exchangeComplianceAPI.getCompliance(familyFileId, startDate, endDate),
      exchangeComplianceAPI.getDetails(familyFileId, startDate, endDate, false),
      eventsAPI.listForCase(familyFileId, startDate, endDate),
    ]);

    if (results[0].status === 'fulfilled') setTimelineData(results[0].value);
    if (results[1].status === 'fulfilled') setChildStats(results[1].value);
    if (results[2].status === 'fulfilled') setComplianceData(results[2].value);
    if (results[3].status === 'fulfilled') setExchangeDetails(results[3].value);
    if (results[4].status === 'fulfilled') {
      const swaps = results[4].value.filter((e: EventV2) => e.event_type === 'swap_request');
      setSwapEvents(swaps);
    }

    setLoading(false);
  };

  // Derived data
  const currentSession = timelineData?.sessions.find(s => s.is_current);
  const stats = timelineData?.stats;

  const currentDurationText = useMemo(() => {
    if (!currentSession) return '';
    const start = parseISO(currentSession.start_time);
    const diffMinutes = (now.getTime() - start.getTime()) / (1000 * 60);
    return formatDuration(diffMinutes);
  }, [currentSession, now]);

  const swapCounts = useMemo(() => {
    const approved = swapEvents.filter(e => e.status === 'approved').length;
    const denied = swapEvents.filter(e => e.status === 'denied' || e.status === 'rejected').length;
    const pending = swapEvents.filter(e => e.status === 'pending' || e.status === 'pending_approval').length;
    return { total: swapEvents.length, approved, denied, pending };
  }, [swapEvents]);

  if (loading) {
    return <CustodyDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              period === p.value
                ? 'bg-cg-sage text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Current Session */}
      {currentSession && stats && (
        <div className="bg-muted p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Session</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-card p-2 rounded-full shadow-sm">
              <Clock className="h-5 w-5 text-cg-sage" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">
                With {getParentName(currentSession.parent_id)}
                <span className="ml-2 text-cg-sage font-mono">{currentDurationText}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Since {format(parseISO(currentSession.start_time), 'MMM d, h:mm a')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Agreement Alignment */}
      {childStats && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cg-sage" />
            <span className="text-sm font-semibold text-foreground">Agreement Alignment</span>
          </div>

          {childStats.agreed_schedule.pattern && (
            <p className="text-xs text-muted-foreground">
              Schedule: {formatSchedulePattern(childStats.agreed_schedule.pattern)} ({childStats.agreed_schedule.parent_a_percentage}/{childStats.agreed_schedule.parent_b_percentage})
            </p>
          )}

          {/* Compliance Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <span className="text-xs font-medium text-muted-foreground">{parentAName}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-foreground">{childStats.parent_a.percentage}%</span>
                  <span className={`text-xs font-medium ${childStats.variance.parent_a >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {childStats.variance.parent_a >= 0 ? '+' : ''}{childStats.variance.parent_a}%
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-muted-foreground">{parentBName}</span>
                <div className="flex items-baseline gap-1.5 justify-end">
                  <span className={`text-xs font-medium ${childStats.variance.parent_b >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {childStats.variance.parent_b >= 0 ? '+' : ''}{childStats.variance.parent_b}%
                  </span>
                  <span className="text-xl font-bold text-foreground">{childStats.parent_b.percentage}%</span>
                </div>
              </div>
            </div>

            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-indigo-500 dark:bg-indigo-400 h-full transition-all duration-700"
                style={{ width: `${childStats.parent_a.percentage}%` }}
              />
              <div
                className="bg-sky-400 dark:bg-sky-300 h-full transition-all duration-700"
                style={{ width: `${childStats.parent_b.percentage}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Target: {childStats.agreed_schedule.parent_a_percentage}%</span>
              <span>Target: {childStats.agreed_schedule.parent_b_percentage}%</span>
            </div>
          </div>

          {childStats.comparison_summary && (
            <p className="text-xs text-muted-foreground italic">{childStats.comparison_summary}</p>
          )}

          {/* Days breakdown */}
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{parentAName}: <span className="font-medium text-foreground">{childStats.parent_a.days} days</span></span>
            <span>{parentBName}: <span className="font-medium text-foreground">{childStats.parent_b.days} days</span></span>
            {childStats.unknown_days > 0 && (
              <span>Untracked: <span className="font-medium text-foreground">{childStats.unknown_days} days</span></span>
            )}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {complianceData && complianceData.metrics.total_exchanges > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cg-sage" />
            <span className="text-sm font-semibold text-foreground">Exchange Metrics</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <MetricCard label="Total" value={complianceData.metrics.total_exchanges} icon={<Repeat className="h-3.5 w-3.5" />} />
            <MetricCard label="Completed" value={complianceData.metrics.completed} icon={<CheckCircle2 className="h-3.5 w-3.5" />} color="emerald" />
            <MetricCard label="Missed" value={complianceData.metrics.missed} icon={<XCircle className="h-3.5 w-3.5" />} color="red" />
            <MetricCard label="Disputed" value={complianceData.metrics.disputed} icon={<AlertCircle className="h-3.5 w-3.5" />} color="amber" />
            <MetricCard label="GPS Verified" value={`${Math.round(complianceData.metrics.gps_verified_rate * 100)}%`} icon={<Navigation className="h-3.5 w-3.5" />} />
            <MetricCard label="On-Time" value={`${Math.round(complianceData.metrics.on_time_rate * 100)}%`} icon={<Timer className="h-3.5 w-3.5" />} />
          </div>
        </div>
      )}

      {/* Swap Requests */}
      {swapCounts.total > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-cg-sage" />
            <span className="text-sm font-semibold text-foreground">Swap Requests</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              Total: {swapCounts.total}
            </Badge>
            {swapCounts.approved > 0 && (
              <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-0">
                Approved: {swapCounts.approved}
              </Badge>
            )}
            {swapCounts.denied > 0 && (
              <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-0">
                Denied: {swapCounts.denied}
              </Badge>
            )}
            {swapCounts.pending > 0 && (
              <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-0">
                Pending: {swapCounts.pending}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Exchange History */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-cg-sage" />
          <span className="text-sm font-semibold text-foreground">Exchange History</span>
        </div>

        {exchangeDetails.length === 0 ? (
          <div className="text-center py-6">
            <MapPin className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No exchanges recorded yet</p>
            <p className="text-xs text-muted-foreground mt-1">Completed exchanges will appear here</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {exchangeDetails.map((exchange) => (
              <ExchangeRow
                key={exchange.id}
                exchange={exchange}
                getRoleName={getRoleName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color?: 'emerald' | 'red' | 'amber';
}) {
  const colorClass = color === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : color === 'red'
      ? 'text-red-600 dark:text-red-400'
      : color === 'amber'
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-foreground';

  return (
    <div className="bg-muted rounded-xl p-3 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-lg font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}

function ExchangeRow({
  exchange,
  getRoleName,
}: {
  exchange: ExchangeDetail;
  getRoleName: (role: string) => string;
}) {
  const fromName = getRoleName(exchange.from_parent.role);
  const toName = getRoleName(exchange.to_parent.role);
  const scheduledDate = parseISO(exchange.scheduled_time);
  const bothGpsVerified = exchange.from_parent.gps?.in_geofence && exchange.to_parent.gps?.in_geofence;
  const anyGpsData = exchange.from_parent.gps || exchange.to_parent.gps;

  return (
    <div className="bg-muted/50 rounded-lg p-3 border border-border/50 hover:bg-muted transition-colors">
      {/* Top row: date, direction, outcome */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {format(scheduledDate, 'MMM d')}
          </span>
          <span className="text-sm font-medium text-foreground truncate">
            {fromName}
          </span>
          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {toName}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${outcomeColor(exchange.outcome || exchange.status)}`}>
          {outcomeLabel(exchange.outcome || exchange.status)}
        </span>
      </div>

      {/* Bottom row: time, location, GPS */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>{format(scheduledDate, 'h:mm a')}</span>
        {exchange.location.address && (
          <span className="flex items-center gap-1 truncate max-w-[180px]">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            {exchange.location.address}
          </span>
        )}
        {exchange.silent_handoff_enabled && anyGpsData && (
          <span className={`flex items-center gap-1 ${bothGpsVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            <Navigation className="h-3 w-3" />
            {bothGpsVerified ? 'GPS Verified' : 'GPS Partial'}
          </span>
        )}
        {exchange.qr_confirmation.required && exchange.qr_confirmation.confirmed_at && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            QR Confirmed
          </span>
        )}
      </div>
    </div>
  );
}

function CustodyDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-20 rounded-full" />)}
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <div className="flex justify-between">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    </div>
  );
}
