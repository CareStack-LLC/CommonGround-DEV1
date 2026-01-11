'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  FileText,
  Settings,
  Calendar,
  MessageSquare,
  DollarSign,
  FileBarChart,
  MapPin,
  Shield,
  MessageCircle,
  Bot,
  ChevronRight,
  Eye,
  AlertTriangle,
  Lock,
  Smartphone,
  Search,
  Package,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Scale,
  UserPlus,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Zap,
  Download,
  ExternalLink,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useCourtAuth } from '../../layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CourtCase {
  id: string;
  case_name: string;
  case_number?: string;
  state: string;
  county?: string;
  status: string;
}

interface CourtSettings {
  gps_checkins_required: boolean;
  supervised_exchange_required: boolean;
  in_app_communication_only: boolean;
  aria_enforcement_locked: boolean;
  agreement_edits_locked: boolean;
  investigation_mode: boolean;
  disable_delete_messages: boolean;
  require_read_receipts: boolean;
}

interface CategoryCompliance {
  status: string;
  score: number;
  metrics: Record<string, number>;
  issues: string[];
}

interface ComplianceSnapshot {
  case_id: string;
  generated_at: string;
  overall_status: string;
  overall_score: number;
  schedule_compliance: CategoryCompliance;
  communication_compliance: CategoryCompliance;
  financial_compliance: CategoryCompliance;
  item_compliance: CategoryCompliance;
  days_monitored: number;
  total_exchanges: number;
  on_time_rate: number;
  flagged_messages_count: number;
  overdue_obligations: number;
  disputed_items: number;
  trend?: string;
}

interface TimelineEvent {
  id: string;
  type: 'exchange' | 'message' | 'payment' | 'event' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function StatCard({
  label,
  value,
  icon,
  status = 'neutral',
  subtext,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'neutral';
  subtext?: string;
}) {
  const statusColors = {
    success: 'text-cg-success',
    warning: 'text-cg-amber',
    error: 'text-cg-error',
    neutral: 'text-foreground',
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
        <div>
          <p className={`text-xl font-mono font-bold ${statusColors[status]}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
          {subtext && <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function ComplianceGauge({ score, status }: { score: number; status: string }) {
  const statusConfig = {
    green: { color: 'bg-cg-success', label: 'Good Standing', bg: 'bg-cg-success-subtle' },
    amber: { color: 'bg-cg-amber', label: 'Needs Attention', bg: 'bg-cg-amber-subtle' },
    red: { color: 'bg-cg-error', label: 'Issues Found', bg: 'bg-cg-error-subtle' },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.amber;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Overall Compliance</span>
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${
          status === 'green' ? 'text-cg-success' :
          status === 'amber' ? 'text-cg-amber' :
          'text-cg-error'
        }`}>
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${config.color} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className="font-mono font-bold text-lg">{score.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function ComplianceCategory({
  title,
  status,
  score,
  metric,
  issues,
  icon,
}: {
  title: string;
  status: string;
  score: number;
  metric: string;
  issues: string[];
  icon: React.ReactNode;
}) {
  const statusColors = {
    green: { border: 'border-cg-success', bg: 'bg-cg-success-subtle/50', icon: 'text-cg-success' },
    amber: { border: 'border-cg-amber', bg: 'bg-cg-amber-subtle/50', icon: 'text-cg-amber' },
    red: { border: 'border-cg-error', bg: 'bg-cg-error-subtle/50', icon: 'text-cg-error' },
  };

  const config = statusColors[status as keyof typeof statusColors] || statusColors.amber;

  return (
    <div className={`p-3 rounded-lg border-l-4 ${config.border} ${config.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={config.icon}>{icon}</span>
          <span className="text-sm font-medium text-foreground">{title}</span>
        </div>
        <span className="font-mono text-sm font-bold">{score.toFixed(0)}</span>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{metric}</p>
      {issues.length > 0 && (
        <div className="space-y-1">
          {issues.slice(0, 2).map((issue, idx) => (
            <p key={idx} className="text-xs text-muted-foreground flex items-start gap-1">
              <span className="text-cg-warning">•</span>
              {issue}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ControlBadge({ label, enabled, icon }: { label: string; enabled: boolean; icon: React.ReactNode }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
      enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
    }`}>
      {icon}
      <span>{label}</span>
      {enabled && <CheckCircle className="h-3 w-3" />}
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const typeConfig = {
    exchange: { icon: <MapPin className="h-3.5 w-3.5" />, color: 'bg-blue-100 text-blue-600' },
    message: { icon: <MessageSquare className="h-3.5 w-3.5" />, color: 'bg-purple-100 text-purple-600' },
    payment: { icon: <DollarSign className="h-3.5 w-3.5" />, color: 'bg-emerald-100 text-emerald-600' },
    event: { icon: <Calendar className="h-3.5 w-3.5" />, color: 'bg-indigo-100 text-indigo-600' },
    alert: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'bg-amber-100 text-amber-600' },
  };

  const statusColors = {
    success: 'border-l-cg-success',
    warning: 'border-l-cg-amber',
    error: 'border-l-cg-error',
    info: 'border-l-slate-300',
  };

  const config = typeConfig[event.type];

  return (
    <div className={`flex gap-3 py-2.5 border-l-2 pl-3 ${statusColors[event.status]}`}>
      <div className={`p-1 rounded-md flex-shrink-0 ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium text-foreground">{event.title}</p>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
            {event.timestamp}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">{event.description}</p>
      </div>
    </div>
  );
}

function NavPill({ href, active, icon, children }: { href: string; active?: boolean; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function ActionCard({ title, description, href, icon }: { title: string; description: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  );
}

/* =============================================================================
   MAIN COMPONENT
   ============================================================================= */

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { professional, token, activeGrant, isLoading } = useCourtAuth();
  const caseId = params.id as string;

  const [caseInfo, setCaseInfo] = useState<CourtCase | null>(null);
  const [settings, setSettings] = useState<CourtSettings | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSnapshot | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push('/court-portal/login');
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional && caseId) {
      loadCaseData();
    }
  }, [professional, caseId]);

  const loadCaseData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);

      const [casesResponse, settingsResponse, complianceResponse] = await Promise.all([
        fetch(`${API_BASE}/court/cases`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/court/settings/case/${caseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${API_BASE}/court/compliance/snapshot/${caseId}?days=30`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (casesResponse.ok) {
        const cases = await casesResponse.json();
        const foundCase = cases.find((c: CourtCase) => c.id === caseId);
        if (foundCase) {
          setCaseInfo(foundCase);
        }
      }

      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        setSettings(settingsData);
      }

      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json();
        setCompliance(complianceData);
      }

      // Mock timeline events
      setTimeline([
        { id: '1', type: 'exchange', title: 'Exchange Completed', description: 'On time at Main St. Park', timestamp: '2h ago', status: 'success' },
        { id: '2', type: 'message', title: 'Message Flagged', description: 'ARIA detected hostile tone', timestamp: '5h ago', status: 'warning' },
        { id: '3', type: 'payment', title: 'Payment Confirmed', description: '$450 child support received', timestamp: '1d ago', status: 'success' },
        { id: '4', type: 'exchange', title: 'Exchange Late', description: '15 min delay documented', timestamp: '2d ago', status: 'warning' },
        { id: '5', type: 'event', title: 'Hearing Scheduled', description: 'Status conference Jan 15', timestamp: '3d ago', status: 'info' },
      ]);
    } catch (err) {
      console.error('Failed to load case data:', err);
      setError('Failed to load case data');
    } finally {
      setIsLoadingData(false);
    }
  };

  if (isLoading || !professional) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading case data...</p>
        </div>
      </div>
    );
  }

  const displayName = caseInfo?.case_name || activeGrant?.case_name || 'Case';
  const displayNumber = caseInfo?.case_number || activeGrant?.case_number;
  const displayState = caseInfo?.state || 'CA';
  const displayCounty = caseInfo?.county || '';

  const courtSettings = settings || {
    gps_checkins_required: false,
    supervised_exchange_required: false,
    in_app_communication_only: false,
    aria_enforcement_locked: false,
    agreement_edits_locked: false,
    investigation_mode: false,
    disable_delete_messages: false,
    require_read_receipts: false,
  };

  const activeControlsCount = [
    courtSettings.gps_checkins_required,
    courtSettings.supervised_exchange_required,
    courtSettings.in_app_communication_only,
    courtSettings.aria_enforcement_locked,
    courtSettings.agreement_edits_locked,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-cg-error-subtle border border-cg-error/20 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-cg-error" />
          <p className="text-sm text-cg-error">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
            {displayNumber && (
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-mono rounded">
                #{displayNumber}
              </span>
            )}
            {courtSettings.investigation_mode && (
              <span className="px-2 py-0.5 bg-cg-warning text-white text-xs font-medium rounded animate-pulse">
                Investigation Mode
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {displayCounty && `${displayCounty} County, `}{displayState}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            href={`/court-portal/cases/${caseId}/reports`}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <FileBarChart className="h-4 w-4" />
            Generate Report
          </Link>
        </div>
      </div>

      {/* Quick Nav */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <NavPill href={`/court-portal/cases/${caseId}`} active icon={<Eye className="h-3.5 w-3.5" />}>Overview</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/settings`} icon={<Settings className="h-3.5 w-3.5" />}>Settings</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/forms`} icon={<Scale className="h-3.5 w-3.5" />}>Court Forms</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/events`} icon={<Calendar className="h-3.5 w-3.5" />}>Hearings</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/exchanges`} icon={<MapPin className="h-3.5 w-3.5" />}>Exchanges</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/messages`} icon={<MessageSquare className="h-3.5 w-3.5" />}>Messages</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/payments`} icon={<DollarSign className="h-3.5 w-3.5" />}>Payments</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/items`} icon={<Package className="h-3.5 w-3.5" />}>Items</NavPill>
        <NavPill href={`/court-portal/cases/${caseId}/reports`} icon={<FileBarChart className="h-3.5 w-3.5" />}>Reports</NavPill>
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column - Compliance & Stats */}
        <div className="lg:col-span-4 space-y-4">
          {/* Compliance Snapshot */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                <h2 className="font-semibold text-foreground">Compliance Snapshot</h2>
              </div>
              {compliance && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last {compliance.days_monitored} days
                </p>
              )}
            </div>
            <div className="p-4 space-y-4">
              {compliance && (
                <>
                  <ComplianceGauge score={compliance.overall_score} status={compliance.overall_status} />
                  <div className="grid grid-cols-2 gap-3">
                    <ComplianceCategory
                      title="Schedule"
                      status={compliance.schedule_compliance.status}
                      score={compliance.schedule_compliance.score}
                      metric={`${compliance.on_time_rate.toFixed(0)}% on-time`}
                      issues={compliance.schedule_compliance.issues}
                      icon={<Calendar className="h-3.5 w-3.5" />}
                    />
                    <ComplianceCategory
                      title="Communication"
                      status={compliance.communication_compliance.status}
                      score={compliance.communication_compliance.score}
                      metric={`${compliance.flagged_messages_count} flagged`}
                      issues={compliance.communication_compliance.issues}
                      icon={<MessageSquare className="h-3.5 w-3.5" />}
                    />
                    <ComplianceCategory
                      title="Financial"
                      status={compliance.financial_compliance.status}
                      score={compliance.financial_compliance.score}
                      metric={`${compliance.overdue_obligations} overdue`}
                      issues={compliance.financial_compliance.issues}
                      icon={<DollarSign className="h-3.5 w-3.5" />}
                    />
                    <ComplianceCategory
                      title="Items"
                      status={compliance.item_compliance.status}
                      score={compliance.item_compliance.score}
                      metric={`${compliance.disputed_items} disputed`}
                      issues={compliance.item_compliance.issues}
                      icon={<Package className="h-3.5 w-3.5" />}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Exchanges"
              value={compliance?.total_exchanges || 0}
              icon={<MapPin className="h-4 w-4" />}
            />
            <StatCard
              label="Active Controls"
              value={activeControlsCount}
              icon={<Shield className="h-4 w-4" />}
              status={activeControlsCount >= 3 ? 'success' : 'neutral'}
            />
            <StatCard
              label="ARIA Status"
              value={courtSettings.aria_enforcement_locked ? 'Locked' : 'Optional'}
              icon={<Bot className="h-4 w-4" />}
              status={courtSettings.aria_enforcement_locked ? 'success' : 'neutral'}
            />
            <StatCard
              label="Monitoring"
              value={courtSettings.investigation_mode ? 'Active' : 'Normal'}
              icon={<Search className="h-4 w-4" />}
              status={courtSettings.investigation_mode ? 'warning' : 'neutral'}
            />
          </div>
        </div>

        {/* Center Column - Reality Ledger */}
        <div className="lg:col-span-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  <h2 className="font-semibold text-foreground">Reality Ledger</h2>
                </div>
                <Link
                  href={`/court-portal/cases/${caseId}/reports`}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  View Full History
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="p-4 space-y-1 max-h-[500px] overflow-y-auto">
              {timeline.map((event) => (
                <TimelineItem key={event.id} event={event} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Controls & Actions */}
        <div className="lg:col-span-3 space-y-4">
          {/* Court Controls */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                <h2 className="font-semibold text-foreground">Court Controls</h2>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <ControlBadge label="GPS Check-ins" enabled={courtSettings.gps_checkins_required} icon={<MapPin className="h-3 w-3" />} />
              <ControlBadge label="Supervised Exchanges" enabled={courtSettings.supervised_exchange_required} icon={<Eye className="h-3 w-3" />} />
              <ControlBadge label="ARIA Locked" enabled={courtSettings.aria_enforcement_locked} icon={<Bot className="h-3 w-3" />} />
              <ControlBadge label="In-App Only" enabled={courtSettings.in_app_communication_only} icon={<Smartphone className="h-3 w-3" />} />
              <ControlBadge label="Agreement Locked" enabled={courtSettings.agreement_edits_locked} icon={<Lock className="h-3 w-3" />} />
              <div className="pt-2">
                <Link
                  href={`/court-portal/cases/${caseId}/settings`}
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Manage Settings
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <h2 className="font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-3 space-y-2">
              <ActionCard
                title="ARIA Paralegal"
                description="Send legal intake request"
                href={`/court-portal/cases/${caseId}/intake`}
                icon={<UserPlus className="h-4 w-4" />}
              />
              <ActionCard
                title="Court Forms"
                description="Review FL-300, FL-311, FL-320"
                href={`/court-portal/cases/${caseId}/forms`}
                icon={<Scale className="h-4 w-4" />}
              />
              <ActionCard
                title="Communication Log"
                description="Review all messages"
                href={`/court-portal/cases/${caseId}/messages`}
                icon={<MessageCircle className="h-4 w-4" />}
              />
              <ActionCard
                title="Court Packet"
                description="Generate evidence package"
                href={`/court-portal/cases/${caseId}/reports`}
                icon={<FileText className="h-4 w-4" />}
              />
            </div>
          </div>

          {/* Info Notice */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-indigo-900 font-medium">Detailed Metrics</p>
                <p className="text-xs text-indigo-700 mt-1">
                  Navigate to specific sections for full compliance details, message history, and ARIA analytics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
