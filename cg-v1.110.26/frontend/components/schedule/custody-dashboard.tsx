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
  ExchangeDataGap,
  eventsAPI,
  EventV2,
  FamilyFileDetail,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Render a rate/percentage value that arrives on the wire in [0, 100].
 * See ADR-001 (docs/architecture/ADR-001-percentage-contract.md).
 *
 * Clamps to [0, 100] as a silent defense: if any upstream service ever
 * slips back to 0–1 math we render 100% at worst, never 4000%.
 */
const pct = (v: number | null | undefined, decimals = 0): string => {
  if (v == null || Number.isNaN(v)) return '—';
  const clamped = Math.max(0, Math.min(100, v));
  return `${clamped.toFixed(decimals)}%`;
};

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
    case 'completed': return 'bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/30 dark:text-[#5BC4A0]';
    case 'missed': return 'bg-[#FEE2E2] text-[#9B2C2C] dark:bg-[#7A2222]/30 dark:text-[#E06B6B]';
    case 'one_party_present': return 'bg-[#FEF7ED] text-[#E09520] dark:bg-[#1E3A4A]/30 dark:text-[#F5A623]';
    case 'disputed': return 'bg-[#FEE2E2] text-[#9B2C2C] dark:bg-[#7A2222]/30 dark:text-[#E06B6B]';
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
  const [errors, setErrors] = useState<string[]>([]);

  // Data states
  const [timelineData, setTimelineData] = useState<CustodyTimelineResponse | null>(null);
  const [childStats, setChildStats] = useState<ChildCustodyStats | null>(null);
  const [complianceData, setComplianceData] = useState<ExchangeComplianceResponse | null>(null);
  const [exchangeDetails, setExchangeDetails] = useState<ExchangeDetail[]>([]);
  const [exchangeDataGaps, setExchangeDataGaps] = useState<ExchangeDataGap[]>([]);
  const [swapEvents, setSwapEvents] = useState<EventV2[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  const getRoleName = (role: string | null | undefined): string => {
    // Defensive: map null, empty, or unknown roles to 'Unassigned' so we
    // never render raw "null → null" or "unassigned → unassigned" rows.
    // The backend already filters NULL-parent rows into data_gaps, but
    // pre-migration rows and transient states still surface here.
    if (!role) return 'Unassigned';
    if (role === 'petitioner') return parentAName;
    if (role === 'respondent') return parentBName;
    return 'Unassigned';
  };

  // Load all data
  useEffect(() => {
    loadData();
  }, [childId, familyFileId, period]);

  const loadData = async () => {
    setLoading(true);
    setErrors([]);
    const days = periodToDays(period);
    const { startDate, endDate } = periodToDateRange(period);

    const results = await Promise.allSettled([
      custodyTimeAPI.getTimeline(childId, days),
      custodyTimeAPI.getChildStats(childId, period, startDate, endDate),
      exchangeComplianceAPI.getCompliance(familyFileId, startDate, endDate),
      exchangeComplianceAPI.getDetails(familyFileId, startDate, endDate, false),
      eventsAPI.listForCase(familyFileId, startDate, endDate),
    ]);

    const loadErrors: string[] = [];
    if (results[0].status === 'fulfilled') setTimelineData(results[0].value);
    else loadErrors.push('Custody timeline unavailable');
    if (results[1].status === 'fulfilled') setChildStats(results[1].value);
    else loadErrors.push('Custody stats unavailable');
    if (results[2].status === 'fulfilled') setComplianceData(results[2].value);
    else loadErrors.push('Compliance data unavailable');
    if (results[3].status === 'fulfilled') {
      // getDetails now returns {exchanges, data_gaps} — see ADR-001.
      setExchangeDetails(results[3].value.exchanges);
      setExchangeDataGaps(results[3].value.data_gaps);
    } else {
      loadErrors.push('Exchange history unavailable');
    }
    if (results[4].status === 'fulfilled') {
      const swaps = results[4].value.filter((e: EventV2) => e.event_type === 'swap_request');
      setSwapEvents(swaps);
    }

    setErrors(loadErrors);
    setLastUpdated(new Date());
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

  // Compliance status determination
  const complianceStatus = useMemo(() => {
    if (!childStats) return null;
    const maxVariance = Math.max(
      Math.abs(childStats.variance?.parent_a || 0),
      Math.abs(childStats.variance?.parent_b || 0)
    );
    if (maxVariance <= 5) return { label: 'Compliant', color: 'emerald', desc: 'Custody time matches the agreement' };
    if (maxVariance <= 10) return { label: 'Minor Deviation', color: 'amber', desc: `${maxVariance.toFixed(1)}% deviation from agreed schedule` };
    return { label: 'Significant Deviation', color: 'red', desc: `${maxVariance.toFixed(1)}% deviation — review recommended` };
  }, [childStats]);

  // Data quality score + grade for the court-readiness banner at the top.
  // See ADR-001. The backend computes this from the ratio of high-confidence
  // days (exchange completions, check-ins, manual overrides, or record
  // confidence >= 90) to total days in the period.
  //
  // NOTE: this useMemo MUST stay above the `if (loading) return ...` early
  // return below. Moving it below would break the Rules of Hooks — on the
  // loading render it wouldn't execute, on the next render it would, and
  // React would throw "rendered more hooks than during the previous render".
  const qualityScore = timelineData?.quality_score ?? null;
  const qualityBand = useMemo(() => {
    if (qualityScore == null) return null;
    if (qualityScore >= 90) return { label: 'Court-grade', color: 'emerald', desc: 'High confidence across this period' };
    if (qualityScore >= 70) return { label: 'Acceptable with gaps', color: 'amber', desc: 'Enough evidence to read trends; some days lack hard proof' };
    return { label: 'Insufficient evidence', color: 'red', desc: 'Too many days without check-ins or completed exchanges to trust totals' };
  }, [qualityScore]);

  if (loading) {
    return <CustodyDashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Data Quality Score — the first thing the user sees. Speaks in
          plain language so a non-technical reader (judge, GAL, co-parent)
          knows whether to trust the numbers below it. */}
      {qualityScore != null && qualityBand && (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          qualityBand.color === 'emerald' ? 'bg-[#E8F4F0] border-[#E8F4F0] dark:bg-[#1E3A4A]/20 dark:border-[#1E3A4A]' :
          qualityBand.color === 'amber' ? 'bg-[#FEF7ED] border-[#FEF7ED] dark:bg-[#1E3A4A]/20 dark:border-[#E09520]' :
          'bg-[#FEE2E2] border-[#FEE2E2] dark:bg-[#7A2222]/20 dark:border-[#9B2C2C]'
        }`}>
          <div className="flex items-center gap-3">
            <Shield className={`h-5 w-5 ${
              qualityBand.color === 'emerald' ? 'text-[#2D8A70] dark:text-[#5BC4A0]' :
              qualityBand.color === 'amber' ? 'text-[#E09520] dark:text-[#F5A623]' :
              'text-[#C53030] dark:text-[#E06B6B]'
            }`} />
            <div>
              <p className={`text-sm font-semibold ${
                qualityBand.color === 'emerald' ? 'text-[#1E3A4A] dark:text-[#5BC4A0]' :
                qualityBand.color === 'amber' ? 'text-[#E09520] dark:text-[#F5A623]' :
                'text-[#9B2C2C] dark:text-[#FCA5A5]'
              }`}>
                Data Quality: {qualityBand.label}
              </p>
              <p className="text-xs text-muted-foreground">{qualityBand.desc}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            qualityBand.color === 'emerald' ? 'bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/50 dark:text-[#5BC4A0]' :
            qualityBand.color === 'amber' ? 'bg-[#FEF7ED] text-[#E09520] dark:bg-[#1E3A4A]/50 dark:text-[#F5A623]' :
            'bg-[#FEE2E2] text-[#9B2C2C] dark:bg-[#7A2222]/50 dark:text-[#FCA5A5]'
          }`}>{qualityScore}/100</span>
        </div>
      )}

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

      {/* Error Banner */}
      {errors.length > 0 && (
        <div className="bg-[#FEF7ED] dark:bg-[#1E3A4A]/20 border border-[#FEF7ED] dark:border-[#E09520] rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[#E09520] dark:text-[#F5A623] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#E09520] dark:text-[#F5A623]">Some data could not be loaded</p>
              <ul className="text-xs text-[#E09520] dark:text-[#F5A623] mt-1 space-y-0.5">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Status Badge */}
      {complianceStatus && (
        <div className={`flex items-center justify-between p-3 rounded-xl border ${
          complianceStatus.color === 'emerald' ? 'bg-[#E8F4F0] border-[#E8F4F0] dark:bg-[#1E3A4A]/20 dark:border-[#1E3A4A]' :
          complianceStatus.color === 'amber' ? 'bg-[#FEF7ED] border-[#FEF7ED] dark:bg-[#1E3A4A]/20 dark:border-[#E09520]' :
          'bg-[#FEE2E2] border-[#FEE2E2] dark:bg-[#7A2222]/20 dark:border-[#9B2C2C]'
        }`}>
          <div className="flex items-center gap-2">
            {complianceStatus.color === 'emerald' ? (
              <CheckCircle2 className="h-4 w-4 text-[#2D8A70] dark:text-[#5BC4A0]" />
            ) : (
              <AlertCircle className="h-4 w-4 text-[#E09520] dark:text-[#F5A623]" />
            )}
            <div>
              <span className={`text-sm font-semibold ${
                complianceStatus.color === 'emerald' ? 'text-[#1E3A4A] dark:text-[#5BC4A0]' :
                complianceStatus.color === 'amber' ? 'text-[#E09520] dark:text-[#F5A623]' :
                'text-[#9B2C2C] dark:text-[#FCA5A5]'
              }`}>{complianceStatus.label}</span>
              <p className="text-xs text-muted-foreground">{complianceStatus.desc}</p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            complianceStatus.color === 'emerald' ? 'bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/50 dark:text-[#5BC4A0]' :
            complianceStatus.color === 'amber' ? 'bg-[#FEF7ED] text-[#E09520] dark:bg-[#1E3A4A]/50 dark:text-[#F5A623]' :
            'bg-[#FEE2E2] text-[#9B2C2C] dark:bg-[#7A2222]/50 dark:text-[#FCA5A5]'
          }`}>Agreement Check</span>
        </div>
      )}

      {/* Days Without Signal — replaces the legacy "untracked days" banner
          with a concrete explanation. Uses timeline.data_gaps so the user
          sees WHY the timeline has gaps, not just that gaps exist. */}
      {timelineData?.data_gaps && timelineData.data_gaps.length > 0 && (
        <div className="bg-[#FEF7ED] dark:bg-[#1E3A4A]/20 border border-[#FEF7ED] dark:border-[#E09520] rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[#E09520] dark:text-[#F5A623] mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#E09520] dark:text-[#F5A623]">
                {timelineData.data_gaps.length} day{timelineData.data_gaps.length !== 1 ? 's' : ''} without signal in this period
              </p>
              <p className="text-xs text-[#E09520] dark:text-[#F5A623] mt-0.5">
                No check-in, completed exchange, or schedule projection on{' '}
                {timelineData.data_gaps.length <= 3
                  ? timelineData.data_gaps.map(g => format(parseISO(g.date), 'MMM d')).join(', ')
                  : `${format(parseISO(timelineData.data_gaps[0].date), 'MMM d')}–${format(parseISO(timelineData.data_gaps[timelineData.data_gaps.length - 1].date), 'MMM d')}`
                }
                . Add silent-handoff geofences, QR-code check-ins, or daily &quot;With Me&quot; taps to close the gap.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current Session */}
      {currentSession && stats && (
        <div className="bg-muted p-4 rounded-xl border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Session</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/30 dark:text-[#5BC4A0]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DAA8A] animate-pulse" />
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

          {/* Compliance Bar — show actual % as the hero number, variance
              as a small explicitly-labeled line below so the two don't
              read as "two adjacent percentages" like they did before. */}
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-medium text-muted-foreground">{parentAName}</span>
                <div className="text-xl font-bold text-foreground leading-tight">
                  {childStats.parent_a.percentage}%
                </div>
                <div className={`text-[11px] font-medium ${childStats.variance.parent_a >= 0 ? 'text-[#2D8A70] dark:text-[#5BC4A0]' : 'text-[#C53030] dark:text-[#E06B6B]'}`}>
                  {childStats.variance.parent_a >= 0 ? '+' : ''}{childStats.variance.parent_a}% vs target
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-medium text-muted-foreground">{parentBName}</span>
                <div className="text-xl font-bold text-foreground leading-tight">
                  {childStats.parent_b.percentage}%
                </div>
                <div className={`text-[11px] font-medium ${childStats.variance.parent_b >= 0 ? 'text-[#2D8A70] dark:text-[#5BC4A0]' : 'text-[#C53030] dark:text-[#E06B6B]'}`}>
                  {childStats.variance.parent_b >= 0 ? '+' : ''}{childStats.variance.parent_b}% vs target
                </div>
              </div>
            </div>

            <div className="h-3 w-full bg-muted rounded-full overflow-hidden flex">
              <div
                className="bg-[#2D6A8F] dark:bg-[#4BA8C8] h-full transition-all duration-700"
                style={{ width: `${childStats.parent_a.percentage}%` }}
              />
              <div
                className="bg-[#4BA8C8] dark:bg-[#4BA8C8] h-full transition-all duration-700"
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

      {/* Data Reliability — Determination Methods */}
      {childStats && (childStats as any).determination_methods && Object.keys((childStats as any).determination_methods).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-cg-sage" />
            <span className="text-sm font-semibold text-foreground">Data Reliability</span>
            {(childStats as any).avg_confidence_score > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                Confidence: <span className="font-medium text-foreground">{(childStats as any).avg_confidence_score}%</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries((childStats as any).determination_methods as Record<string, number>).map(([method, count]) => {
              const labels: Record<string, string> = {
                scheduled: 'From Schedule',
                check_in: 'Check-In Verified',
                exchange_completed: 'Exchange Verified',
                manual_override: 'Manual Override',
                backfilled: 'Backfilled',
              };
              const colors: Record<string, string> = {
                check_in: 'bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/30 dark:text-[#5BC4A0]',
                exchange_completed: 'bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/30 dark:text-[#5BC4A0]',
                scheduled: 'bg-[#E0EFF8] text-[#1E4E6B] dark:bg-[#1E3A4A]/30 dark:text-[#4BA8C8]',
                backfilled: 'bg-[#FEF7ED] text-[#E09520] dark:bg-[#1E3A4A]/30 dark:text-[#F5A623]',
                manual_override: 'bg-[#E0EFF8] text-[#1E4E6B] dark:bg-[#1E3A4A]/30 dark:text-[#4BA8C8]',
              };
              return (
                <span key={method} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[method] || 'bg-muted text-muted-foreground'}`}>
                  {labels[method] || method}: {count as number}
                </span>
              );
            })}
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
            <MetricCard label="GPS Verified" value={pct(complianceData.metrics.gps_verified_rate)} icon={<Navigation className="h-3.5 w-3.5" />} />
            <MetricCard label="On-Time" value={pct(complianceData.metrics.on_time_rate)} icon={<Timer className="h-3.5 w-3.5" />} />
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
              <Badge className="text-xs bg-[#E8F4F0] text-[#2D8A70] dark:bg-[#1E3A4A]/30 dark:text-[#5BC4A0] border-0">
                Approved: {swapCounts.approved}
              </Badge>
            )}
            {swapCounts.denied > 0 && (
              <Badge className="text-xs bg-[#FEE2E2] text-[#9B2C2C] dark:bg-[#7A2222]/30 dark:text-[#E06B6B] border-0">
                Denied: {swapCounts.denied}
              </Badge>
            )}
            {swapCounts.pending > 0 && (
              <Badge className="text-xs bg-[#FEF7ED] text-[#E09520] dark:bg-[#1E3A4A]/30 dark:text-[#F5A623] border-0">
                Pending: {swapCounts.pending}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Excluded exchanges (data gaps) — shown before the history so users
          see what couldn't be counted and why. These rows are NOT included
          in the Exchange Metrics totals above. */}
      {exchangeDataGaps.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#E09520] dark:text-[#F5A623]" />
            <span className="text-sm font-semibold text-[#E09520] dark:text-[#F5A623]">
              {exchangeDataGaps.length} exchange{exchangeDataGaps.length !== 1 ? 's' : ''} excluded from totals
            </span>
          </div>
          <div className="bg-[#FEF7ED] dark:bg-[#1E3A4A]/20 border border-[#FEF7ED] dark:border-[#1E3A4A]/40 rounded-xl p-3 space-y-2">
            <p className="text-xs text-[#E09520] dark:text-[#F5A623]">
              These exchanges couldn&apos;t be counted toward compliance because they&apos;re missing required evidence. Fixing them improves the data quality of your court record.
            </p>
            {exchangeDataGaps.slice(0, 5).map((gap) => (
              <div
                key={gap.instance_id}
                className="text-xs flex items-start gap-2 pt-2 border-t border-[#FEF7ED]/70 dark:border-[#1E3A4A]/40 first:border-t-0 first:pt-0"
              >
                <span className="text-muted-foreground whitespace-nowrap">
                  {format(parseISO(gap.scheduled_time), 'MMM d')}
                </span>
                <span className="text-[#E09520] dark:text-[#F5A623]">
                  {gap.description}
                </span>
              </div>
            ))}
            {exchangeDataGaps.length > 5 && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-[#FEF7ED]/70 dark:border-[#1E3A4A]/40">
                +{exchangeDataGaps.length - 5} more — see court export for the full list.
              </p>
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

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Data as of {format(lastUpdated, 'MMM d, yyyy h:mm a')} &middot; All records SHA-256 verified
        </p>
      )}
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
    ? 'text-[#2D8A70] dark:text-[#5BC4A0]'
    : color === 'red'
      ? 'text-[#C53030] dark:text-[#E06B6B]'
      : color === 'amber'
        ? 'text-[#E09520] dark:text-[#F5A623]'
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

// Display label for an evidence source. Keep in sync with
// backend/app/services/custody_exchange.py::VALID_CHECK_IN_SOURCES
// and the CustodyExchangeInstance *_check_in_source columns.
const SOURCE_LABELS: Record<string, string> = {
  gps: 'GPS',
  qr: 'QR scan',
  manual: 'Manual tap',
  silent_geofence: 'Silent handoff',
  coparent_confirm: 'Co-parent confirm',
};

function sourceLabel(source: string | null | undefined): string {
  if (!source) return 'No evidence';
  return SOURCE_LABELS[source] ?? source;
}

function ExchangeRow({
  exchange,
  getRoleName,
}: {
  exchange: ExchangeDetail;
  getRoleName: (role: string | null | undefined) => string;
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

      {/* Middle row: evidence source per parent — one-glance court story */}
      {(exchange.from_parent.check_in_source || exchange.to_parent.check_in_source) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[11px]">
          {exchange.from_parent.check_in_source && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
              <span className="font-semibold text-foreground/70">From:</span>
              {sourceLabel(exchange.from_parent.check_in_source)}
            </span>
          )}
          {exchange.to_parent.check_in_source && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/60">
              <span className="font-semibold text-foreground/70">To:</span>
              {sourceLabel(exchange.to_parent.check_in_source)}
            </span>
          )}
        </div>
      )}

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
          <span className={`flex items-center gap-1 ${bothGpsVerified ? 'text-[#2D8A70] dark:text-[#5BC4A0]' : 'text-[#E09520] dark:text-[#F5A623]'}`}>
            <Navigation className="h-3 w-3" />
            {bothGpsVerified ? 'GPS Verified' : 'GPS Partial'}
          </span>
        )}
        {exchange.qr_confirmation.required && exchange.qr_confirmation.confirmed_at && (
          <span className="flex items-center gap-1 text-[#2D8A70] dark:text-[#5BC4A0]">
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
