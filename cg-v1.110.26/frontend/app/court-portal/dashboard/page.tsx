'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderOpen,
  Clock,
  Calendar,
  FileText,
  AlertTriangle,
  Bot,
  Lock,
  Stamp,
  ShieldOff,
  ChevronRight,
  MapPin,
  FileSearch,
  Activity,
  MessageSquare,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  XCircle,
  ArrowRight,
  Filter,
  Download,
  Bell,
  Eye,
  Shield,
  Users,
  BarChart3,
  Zap,
} from 'lucide-react';
import { useCourtAuth } from '../layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface CourtCase {
  id: string;
  case_name: string;
  case_number?: string;
  state: string;
  county?: string;
  status: string;
}

interface TimelineEvent {
  id: string;
  type: 'exchange' | 'message' | 'payment' | 'event' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  case_name?: string;
  case_id?: string;
}

interface DashboardStats {
  active_cases: number;
  pending_approvals: number;
  upcoming_events: number;
  recent_reports: number;
  access_expiring_soon: number;
  total_exchanges_today: number;
  flagged_messages_week: number;
  compliance_rate: number;
}

/* =============================================================================
   HELPER COMPONENTS
   ============================================================================= */

function MetricCard({
  label,
  value,
  change,
  trend,
  icon,
  status = 'neutral',
}: {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'error' | 'neutral';
}) {
  const statusColors = {
    success: 'text-cg-success',
    warning: 'text-cg-amber',
    error: 'text-cg-error',
    neutral: 'text-foreground',
  };

  const trendIcons = {
    up: <TrendingUp className="h-3 w-3" />,
    down: <TrendingDown className="h-3 w-3" />,
    neutral: <Minus className="h-3 w-3" />,
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {label}
          </p>
          <p className={`text-2xl font-mono font-bold ${statusColors[status]}`}>{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              trend === 'up' ? 'text-cg-success' :
              trend === 'down' ? 'text-cg-error' :
              'text-muted-foreground'
            }`}>
              {trend && trendIcons[trend]}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function CaseComplianceRow({
  caseData,
  complianceScore,
  status,
  onClick,
}: {
  caseData: CourtCase;
  complianceScore: number;
  status: 'green' | 'amber' | 'red';
  onClick: () => void;
}) {
  const statusConfig = {
    green: { bg: 'bg-cg-success', label: 'Good', labelBg: 'bg-cg-success-subtle text-cg-success' },
    amber: { bg: 'bg-cg-amber', label: 'Attention', labelBg: 'bg-cg-amber-subtle text-cg-amber' },
    red: { bg: 'bg-cg-error', label: 'Alert', labelBg: 'bg-cg-error-subtle text-cg-error' },
  };

  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200 group"
    >
      {/* Status Indicator */}
      <div className={`w-2 h-10 rounded-full ${config.bg}`} />

      {/* Case Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-foreground text-sm truncate">{caseData.case_name}</h4>
          {caseData.case_number && (
            <span className="text-xs text-muted-foreground font-mono">#{caseData.case_number}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {caseData.county && `${caseData.county}, `}{caseData.state}
        </p>
      </div>

      {/* Compliance Score */}
      <div className="text-right">
        <div className="font-mono font-bold text-sm">{complianceScore}%</div>
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${config.labelBg}`}>
          {config.label}
        </span>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const typeConfig = {
    exchange: { icon: <MapPin className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600' },
    message: { icon: <MessageSquare className="h-4 w-4" />, color: 'bg-purple-100 text-purple-600' },
    payment: { icon: <DollarSign className="h-4 w-4" />, color: 'bg-emerald-100 text-emerald-600' },
    event: { icon: <Calendar className="h-4 w-4" />, color: 'bg-indigo-100 text-indigo-600' },
    alert: { icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-amber-100 text-amber-600' },
  };

  const statusColors = {
    success: 'border-l-cg-success',
    warning: 'border-l-cg-amber',
    error: 'border-l-cg-error',
    info: 'border-l-slate-300',
  };

  const config = typeConfig[event.type];

  return (
    <div className={`flex gap-3 p-3 border-l-2 ${statusColors[event.status]} bg-card hover:bg-slate-50/50 transition-colors`}>
      <div className={`p-1.5 rounded-lg flex-shrink-0 ${config.color}`}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
          </div>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap font-mono">
            {event.timestamp}
          </span>
        </div>
        {event.case_name && (
          <Link
            href={`/court-portal/cases/${event.case_id}`}
            className="text-xs text-indigo-600 hover:underline mt-1 inline-block"
          >
            {event.case_name} →
          </Link>
        )}
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon,
  href,
  badge,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group">
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-200 transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-foreground">{title}</h4>
            {badge && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500 text-white rounded-full">
                {badge}
              </span>
            )}
          </div>
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

export default function CourtDashboardPage() {
  const router = useRouter();
  const { professional, token, setActiveGrant, isLoading } = useCourtAuth();
  const [cases, setCases] = useState<CourtCase[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    active_cases: 0,
    pending_approvals: 0,
    upcoming_events: 0,
    recent_reports: 0,
    access_expiring_soon: 0,
    total_exchanges_today: 0,
    flagged_messages_week: 0,
    compliance_rate: 0,
  });

  useEffect(() => {
    if (!isLoading && !professional) {
      router.push('/court-portal/login');
    }
  }, [professional, isLoading, router]);

  useEffect(() => {
    if (professional) {
      loadCases();
      loadTimelineEvents();
    }
  }, [professional]);

  const loadCases = async () => {
    try {
      setIsLoadingCases(true);
      const response = await fetch(`${API_BASE}/court/cases`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        setCases(data);
        setStats((prev) => ({
          ...prev,
          active_cases: data.length,
          compliance_rate: 87, // Mock data
          total_exchanges_today: 3,
          flagged_messages_week: 2,
          upcoming_events: 5,
        }));
      }
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setIsLoadingCases(false);
    }
  };

  const loadTimelineEvents = async () => {
    // Mock timeline events - in production this would come from the API
    setTimelineEvents([
      {
        id: '1',
        type: 'exchange',
        title: 'Exchange Completed',
        description: 'Dropoff at Main St. Park - On time',
        timestamp: '10:32 AM',
        status: 'success',
        case_name: 'Martinez v. Martinez',
        case_id: 'case-1',
      },
      {
        id: '2',
        type: 'alert',
        title: 'ARIA Intervention',
        description: 'Message flagged for hostile language',
        timestamp: '9:45 AM',
        status: 'warning',
        case_name: 'Johnson v. Smith',
        case_id: 'case-2',
      },
      {
        id: '3',
        type: 'payment',
        title: 'Payment Received',
        description: 'Child support - $1,250.00',
        timestamp: '9:00 AM',
        status: 'success',
        case_name: 'Davis Family',
        case_id: 'case-3',
      },
      {
        id: '4',
        type: 'exchange',
        title: 'Exchange Late',
        description: 'Pickup delayed by 23 minutes',
        timestamp: 'Yesterday',
        status: 'warning',
        case_name: 'Thompson v. Thompson',
        case_id: 'case-4',
      },
      {
        id: '5',
        type: 'event',
        title: 'Hearing Scheduled',
        description: 'Status conference - Courtroom 4B',
        timestamp: 'Yesterday',
        status: 'info',
        case_name: 'Williams v. Williams',
        case_id: 'case-5',
      },
    ]);
  };

  const handleSelectCase = (caseItem: CourtCase) => {
    setActiveGrant({
      case_id: caseItem.id,
      case_name: caseItem.case_name,
      case_number: caseItem.case_number,
      role: professional?.role,
      status: 'active',
      days_remaining: 90,
    });
    router.push(`/court-portal/cases/${caseItem.id}`);
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

  // Mock compliance scores for cases
  const getCaseCompliance = (index: number) => {
    const scores = [92, 78, 65, 88, 71];
    return scores[index % scores.length];
  };

  const getCaseStatus = (score: number): 'green' | 'amber' | 'red' => {
    if (score >= 85) return 'green';
    if (score >= 70) return 'amber';
    return 'red';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Command Center
          </h1>
          <p className="text-muted-foreground text-sm">
            Welcome back, {professional.full_name} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-slate-50 transition-colors">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm bg-card border border-border rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
          <Link
            href="/court-portal/aria"
            className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Bot className="h-4 w-4" />
            Ask ARIA
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Active Cases"
          value={stats.active_cases}
          icon={<FolderOpen className="h-5 w-5" />}
        />
        <MetricCard
          label="Compliance Rate"
          value={`${stats.compliance_rate}%`}
          change="+2% vs last week"
          trend="up"
          icon={<Activity className="h-5 w-5" />}
          status="success"
        />
        <MetricCard
          label="Exchanges Today"
          value={stats.total_exchanges_today}
          icon={<MapPin className="h-5 w-5" />}
        />
        <MetricCard
          label="Flagged Messages"
          value={stats.flagged_messages_week}
          change="Last 7 days"
          icon={<AlertTriangle className="h-5 w-5" />}
          status={stats.flagged_messages_week > 5 ? 'warning' : 'neutral'}
        />
        <MetricCard
          label="Upcoming Events"
          value={stats.upcoming_events}
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* 3-Column Layout */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left Column - Case Stats */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-indigo-600" />
                  Case Compliance
                </h2>
                <Link
                  href="/court-portal/cases"
                  className="text-xs text-indigo-600 hover:underline"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="divide-y divide-border">
              {isLoadingCases ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent mx-auto" />
                  <p className="mt-3 text-muted-foreground text-sm">Loading cases...</p>
                </div>
              ) : cases.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No active cases</p>
                </div>
              ) : (
                cases.slice(0, 6).map((caseItem, index) => {
                  const score = getCaseCompliance(index);
                  return (
                    <CaseComplianceRow
                      key={caseItem.id}
                      caseData={caseItem}
                      complianceScore={score}
                      status={getCaseStatus(score)}
                      onClick={() => handleSelectCase(caseItem)}
                    />
                  );
                })
              )}
            </div>
          </div>

          {/* Alerts Section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-amber-50/50">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-600" />
                Alerts & Flags
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {stats.access_expiring_soon > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">Access Expiring</p>
                    <p className="text-xs text-amber-700">{stats.access_expiring_soon} case(s) expiring within 7 days</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900">Missed Exchange</p>
                  <p className="text-xs text-red-700">Thompson v. Thompson - No check-in recorded</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-slate-500" />
                <p className="text-sm text-muted-foreground">All other items clear</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column - Reality Ledger */}
        <div className="lg:col-span-5">
          <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  Reality Ledger
                </h2>
                <span className="text-xs text-muted-foreground">Live feed</span>
              </div>
            </div>
            <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {timelineEvents.map((event) => (
                <TimelineItem key={event.id} event={event} />
              ))}
              {timelineEvents.length === 0 && (
                <div className="p-8 text-center">
                  <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Quick Actions & Metadata */}
        <div className="lg:col-span-3 space-y-4">
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <h2 className="font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-3 space-y-2">
              <QuickAction
                title="Form Queue"
                description="Review pending court forms"
                icon={<FileText className="h-5 w-5" />}
                href="/court-portal/forms-queue"
                badge="3"
              />
              <QuickAction
                title="Calendar"
                description="View upcoming hearings"
                icon={<Calendar className="h-5 w-5" />}
                href="/court-portal/calendar"
              />
              <QuickAction
                title="Request Access"
                description="Add a new case to your list"
                icon={<FileSearch className="h-5 w-5" />}
                href="/court-portal/request-access"
              />
              <QuickAction
                title="ARIA Assistant"
                description="Ask case-related questions"
                icon={<Bot className="h-5 w-5" />}
                href="/court-portal/aria"
              />
            </div>
          </div>

          {/* Access Guidelines */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-600" />
                Access Guidelines
              </h2>
            </div>
            <div className="p-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>All access is read-only and logged</span>
                </li>
                <li className="flex items-start gap-2">
                  <Stamp className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Exports are watermarked with your identity</span>
                </li>
                <li className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Access expires based on your role</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldOff className="h-4 w-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <span>Do not share access credentials</span>
                </li>
              </ul>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System Status</span>
              <span className="flex items-center gap-1.5 text-xs text-cg-success">
                <span className="w-2 h-2 bg-cg-success rounded-full animate-pulse" />
                All Systems Operational
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-lg">
                <Eye className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Read-only</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <Activity className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">Logged</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg">
                <Shield className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">SHA-256</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
