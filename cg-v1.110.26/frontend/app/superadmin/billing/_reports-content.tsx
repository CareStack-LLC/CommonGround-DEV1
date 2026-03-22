'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText, Plus, Clock, CheckCircle, AlertTriangle,
  Loader2, Download, RefreshCw, Calendar,
  FileJson, FileSpreadsheet, TrendingUp, Target, DollarSign, Users,
  MessageSquare, Bug, ArrowUpRight, ArrowDownRight, Send,
  Activity, Shield, FileBarChart,
} from 'lucide-react';
import { adminAPI, type ReportRequest, type WeeklyReport } from '@/lib/admin-api';

type PageTab = 'reports' | 'weekly';

const REPORT_TYPES = [
  { value: 'user_export', label: 'User Export', description: 'Full user list with subscription data and activity metrics', icon: '👥' },
  { value: 'billing_summary', label: 'Billing Summary', description: 'Revenue trends, MRR analysis, and subscription lifecycle', icon: '💰' },
  { value: 'engagement', label: 'Engagement Report', description: 'Platform usage, ARIA metrics, and feature adoption', icon: '📊' },
  { value: 'compliance', label: 'Compliance Report', description: 'Audit trail summary and administrative actions', icon: '🔒' },
  { value: 'growth', label: 'Growth Analytics', description: 'Detailed user acquisition and retention analysis', icon: '📈' },
  { value: 'operational_efficiency', label: 'Operational Efficiency', description: 'Resolution rates, response times, platform uptime, and cost metrics', icon: '⚙️' },
  { value: 'valuation_metrics', label: 'Valuation Metrics', description: 'LTV, CAC, retention rates, churn, and unit economics for investors', icon: '🏦' },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  processing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  failed: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
};

const PAGE_TABS: { id: PageTab; label: string; icon: React.ElementType }[] = [
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'weekly', label: 'Weekly Snapshot', icon: FileBarChart },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function GrowthBadge({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-xs text-[#4A6E7F]">N/A</span>;
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function WeeklyMetricCard({
  icon: Icon, label, value, sub, growth, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  growth?: number | null; color: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'from-[#3DAA8A]/20 to-[#3DAA8A]/5 border-[#3DAA8A]/20',
    emerald: 'from-[#3DAA8A]/20 to-[#3DAA8A]/5 border-[#3DAA8A]/20',
    blue: 'from-[#2D6A8F]/20 to-[#2D6A8F]/5 border-[#2D6A8F]/20',
    amber: 'from-[#F5A623]/20 to-[#F5A623]/5 border-[#F5A623]/20',
  };
  const iconColorMap: Record<string, string> = {
    violet: 'text-[#3DAA8A]', emerald: 'text-emerald-400',
    blue: 'text-blue-400', amber: 'text-amber-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-5 h-5 ${iconColorMap[color]} mb-2`} />
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-[#6B8A9A]">{label}</span>
        {growth !== undefined && growth !== null && growth !== 0 && <GrowthBadge value={growth} />}
      </div>
      {sub && <div className="text-[11px] text-[#4A6E7F] mt-0.5">{sub}</div>}
    </div>
  );
}

export default function ReportsContent() {
  const [activeTab, setActiveTab] = useState<PageTab>('reports');

  // --- Reports tab state ---
  const [reports, setReports] = useState<ReportRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState('user_export');
  const [dateRange, setDateRange] = useState(30);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // --- Weekly Snapshot tab state ---
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklySending, setWeeklySending] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [weeklySuccess, setWeeklySuccess] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const result = await adminAPI.getReports({
        status: statusFilter || undefined,
        limit: 50,
      });
      setReports(result.reports);
      setTotal(result.total);

      // Auto-poll if any reports are pending/processing
      const hasPending = result.reports.some(r => r.status === 'pending' || r.status === 'processing');
      if (hasPending && !pollRef.current) {
        pollRef.current = setInterval(async () => {
          try {
            const refreshed = await adminAPI.getReports({ status: statusFilter || undefined, limit: 50 });
            setReports(refreshed.reports);
            setTotal(refreshed.total);
            const stillPending = refreshed.reports.some(r => r.status === 'pending' || r.status === 'processing');
            if (!stillPending && pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          } catch { /* silent */ }
        }, 5000);
      } else if (!hasPending && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchReports]);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const result = await adminAPI.createReport(selectedType, dateRange, notes || undefined);
      setSuccessMessage(result.message);
      setShowCreate(false);
      setNotes('');
      setTimeout(() => setSuccessMessage(''), 5000);
      await fetchReports();
    } catch (err) {
      console.error('Failed to create report:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (reportId: string, format: 'json' | 'csv') => {
    try {
      setDownloading(`${reportId}-${format}`);
      const blob = await adminAPI.downloadReport(reportId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${reportId.slice(0, 8)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(null);
    }
  };

  const generateWeeklyReport = async () => {
    try {
      setWeeklyLoading(true);
      setWeeklyError(null);
      setWeeklySuccess(null);
      const data = await adminAPI.getWeeklyReport();
      setWeeklyReport(data);
      setWeeklySuccess('Report generated successfully');
    } catch (err: unknown) {
      setWeeklyError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setWeeklyLoading(false);
    }
  };

  const sendWeeklyEmail = async () => {
    try {
      setWeeklySending(true);
      setWeeklyError(null);
      setWeeklySuccess(null);
      const result = await adminAPI.sendWeeklyReport();
      if (result.sent) {
        setWeeklySuccess('Weekly report email sent successfully');
        setWeeklyReport(result.report);
      }
    } catch (err: unknown) {
      setWeeklyError(err instanceof Error ? err.message : 'Failed to send report email');
    } finally {
      setWeeklySending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-sm text-[#6B8A9A] mt-0.5">
            {activeTab === 'reports'
              ? 'Request and download admin reports'
              : weeklyReport
                ? `Period: ${new Date(weeklyReport.period?.start).toLocaleDateString()} - ${new Date(weeklyReport.period?.end).toLocaleDateString()}`
                : 'Generate a weekly snapshot to view platform metrics'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'reports' ? (
            <>
              <button
                onClick={fetchReports}
                disabled={loading}
                className="p-2 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Report
              </button>
            </>
          ) : (
            <>
              <button
                onClick={generateWeeklyReport}
                disabled={weeklyLoading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${weeklyLoading ? 'animate-spin' : ''}`} />
                Generate Now
              </button>
              <button
                onClick={sendWeeklyEmail}
                disabled={weeklySending || !weeklyReport}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Send className={`w-4 h-4 ${weeklySending ? 'animate-pulse' : ''}`} />
                Send Email
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-lg p-1">
        {PAGE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-[#3DAA8A]/15 text-[#5BC4A0]'
                : 'text-[#8AACBC] hover:text-white hover:bg-[#2D6A8F]/20'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============ REPORTS TAB ============ */}
      {activeTab === 'reports' && (
        <>
          {/* Success Message */}
          {successMessage && (
            <div className="bg-emerald-500/10 border border-[#3DAA8A]/20 rounded-xl px-4 py-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-300">{successMessage}</span>
            </div>
          )}

          {/* Create Report Modal */}
          {showCreate && (
            <div className="bg-zinc-900/80 border border-[#2D6A8F]/20 rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Request New Report</h2>
                <button onClick={() => setShowCreate(false)} className="text-[#6B8A9A] hover:text-[#D0E4EC] text-sm">Cancel</button>
              </div>

              {/* Report Type Selection */}
              <div className="space-y-2">
                <label className="text-xs text-[#6B8A9A] uppercase tracking-wider font-medium">Report Type</label>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {REPORT_TYPES.map(type => (
                    <button
                      key={type.value}
                      onClick={() => setSelectedType(type.value)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedType === type.value
                          ? 'border-violet-500/40 bg-violet-500/10'
                          : 'border-[#2D6A8F]/20 bg-[#2D6A8F]/10 hover:border-zinc-700/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-sm font-medium text-white">{type.label}</span>
                      </div>
                      <p className="text-[11px] text-[#6B8A9A] leading-relaxed">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs text-[#6B8A9A] uppercase tracking-wider font-medium block mb-2">Date Range</label>
                  <div className="flex gap-2">
                    {[7, 14, 30, 60, 90].map(d => (
                      <button
                        key={d}
                        onClick={() => setDateRange(d)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          dateRange === d
                            ? 'bg-violet-500/20 text-[#3DAA8A] border border-violet-500/30'
                            : 'bg-[#2D6A8F]/15 text-[#8AACBC] hover:bg-[#2D6A8F]/20 border border-transparent'
                        }`}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-[#6B8A9A] uppercase tracking-wider font-medium block mb-2">Notes (optional)</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any additional context..."
                    className="w-full px-3 py-2 bg-[#2D6A8F]/20 border border-zinc-700/60 rounded-lg text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  {creating ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2">
            {['', 'pending', 'completed', 'failed'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-violet-500/20 text-[#3DAA8A] border border-violet-500/30'
                    : 'bg-[#2D6A8F]/15 text-[#8AACBC] hover:bg-[#2D6A8F]/20 border border-transparent'
                }`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Valuation KPI Summary — live from billing API */}
          <ValuationKPIs />

          {/* Reports List */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-[#2D6A8F]/20 rounded-lg h-16" />)}
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-10 h-10 text-[#3A5A6A] mx-auto mb-3" />
                <p className="text-sm text-[#6B8A9A]">No reports found</p>
                <p className="text-xs text-[#4A6E7F] mt-1">Request your first report to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {reports.map((report) => {
                  const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const reportType = report.action.replace('admin:report_', '');
                  const typeInfo = REPORT_TYPES.find(t => t.value === reportType);
                  const metadata = report.metadata as Record<string, unknown> | null;
                  const rowCount = metadata?.row_count as number | undefined;
                  const isCompleted = report.status === 'completed' || report.status === 'success';

                  return (
                    <div key={report.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#2D6A8F]/10 transition-colors">
                      <div className={`w-10 h-10 rounded-lg ${statusCfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <StatusIcon className={`w-5 h-5 ${statusCfg.color} ${report.status === 'processing' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{typeInfo?.label || reportType}</span>
                          {metadata?.date_range_days != null && (
                            <span className="text-[11px] text-[#4A6E7F] flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {String(metadata.date_range_days)}d
                            </span>
                          )}
                          {rowCount != null && (
                            <span className="text-[11px] text-[#4A6E7F]">{rowCount} rows</span>
                          )}
                        </div>
                        <div className="text-xs text-[#6B8A9A] mt-0.5 truncate">
                          {report.description || 'No description'}
                        </div>
                      </div>

                      {/* Download buttons for completed reports */}
                      {isCompleted && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleDownload(report.id, 'csv')}
                            disabled={downloading === `${report.id}-csv`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-zinc-700/60 text-xs text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
                            title="Download CSV"
                          >
                            {downloading === `${report.id}-csv` ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                            CSV
                          </button>
                          <button
                            onClick={() => handleDownload(report.id, 'json')}
                            disabled={downloading === `${report.id}-json`}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-zinc-700/60 text-xs text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
                            title="Download JSON"
                          >
                            {downloading === `${report.id}-json` ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileJson className="w-3 h-3" />}
                            JSON
                          </button>
                        </div>
                      )}

                      <div className="text-right flex-shrink-0">
                        <span className={`text-xs font-medium capitalize ${statusCfg.color}`}>{report.status}</span>
                        <div className="text-[11px] text-[#4A6E7F] mt-0.5">{formatDate(report.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {total > reports.length && (
              <div className="px-5 py-3 border-t border-[#2D6A8F]/20 text-center">
                <span className="text-xs text-[#6B8A9A]">Showing {reports.length} of {total} reports</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ WEEKLY SNAPSHOT TAB ============ */}
      {activeTab === 'weekly' && (
        <>
          {/* Status Messages */}
          {weeklyError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">{weeklyError}</p>
            </div>
          )}
          {weeklySuccess && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm text-emerald-300">{weeklySuccess}</p>
            </div>
          )}

          {/* Loading State */}
          {weeklyLoading && !weeklyReport && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="animate-pulse bg-[#2D6A8F]/20 rounded-lg h-28" />)}
            </div>
          )}

          {/* Report Content */}
          {weeklyReport && (
            <>
              {/* Primary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <WeeklyMetricCard
                  icon={Users} label="Total Users" value={formatNumber(weeklyReport?.users?.total ?? 0)}
                  sub={`${weeklyReport?.users?.new_this_week ?? 0} new this week`}
                  growth={weeklyReport?.users?.growth_pct} color="violet"
                />
                <WeeklyMetricCard
                  icon={DollarSign} label="Est. MRR" value={formatCurrency(weeklyReport?.revenue?.estimated_mrr ?? 0)}
                  sub={`${weeklyReport?.revenue?.paying_users ?? 0} paying users`}
                  color="blue"
                />
                <WeeklyMetricCard
                  icon={Users} label="New Users" value={formatNumber(weeklyReport?.users?.new_this_week ?? 0)}
                  growth={weeklyReport?.users?.growth_pct} color="emerald"
                />
                <WeeklyMetricCard
                  icon={MessageSquare} label="Messages" value={formatNumber(weeklyReport?.engagement?.messages_this_week ?? 0)}
                  growth={weeklyReport?.engagement?.message_growth_pct} color="amber"
                />
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Activity className="w-4 h-4 text-[#6B8A9A] flex-shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-white">{formatNumber(weeklyReport?.users?.active_30d ?? 0)}</div>
                    <div className="text-[11px] text-[#6B8A9A]">Active (30d)</div>
                  </div>
                </div>
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Bug className="w-4 h-4 text-[#6B8A9A] flex-shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-white">{weeklyReport?.bugs?.open_sentry_issues ?? 0}</div>
                    <div className="text-[11px] text-[#6B8A9A]">Open Bugs</div>
                  </div>
                </div>
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                  <FileBarChart className="w-4 h-4 text-[#6B8A9A] flex-shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-white">{weeklyReport?.platform?.active_family_files ?? 0}</div>
                    <div className="text-[11px] text-[#6B8A9A]">Active Family Files</div>
                  </div>
                </div>
                <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl px-4 py-3 flex items-center gap-3">
                  <Shield className="w-4 h-4 text-[#6B8A9A] flex-shrink-0" />
                  <div>
                    <div className="text-lg font-semibold text-white">{weeklyReport?.platform?.total_professionals ?? 0}</div>
                    <div className="text-[11px] text-[#6B8A9A]">Professionals</div>
                  </div>
                </div>
              </div>

              {/* Engagement Section */}
              <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Engagement Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-[#2D6A8F]/20 rounded-lg p-4">
                    <div className="text-xs text-[#6B8A9A] mb-1">Messages This Week</div>
                    <div className="text-2xl font-bold text-white">{formatNumber(weeklyReport?.engagement?.messages_this_week ?? 0)}</div>
                    <GrowthBadge value={weeklyReport?.engagement?.message_growth_pct} />
                  </div>
                  <div className="border border-[#2D6A8F]/20 rounded-lg p-4">
                    <div className="text-xs text-[#6B8A9A] mb-1">ARIA Flags</div>
                    <div className="text-2xl font-bold text-white">{weeklyReport?.engagement?.aria_flags_this_week ?? 0}</div>
                    <span className="text-xs text-[#4A6E7F]">interventions triggered</span>
                  </div>
                  <div className="border border-[#2D6A8F]/20 rounded-lg p-4">
                    <div className="text-xs text-[#6B8A9A] mb-1">Revenue Breakdown</div>
                    <div className="space-y-1.5 mt-2">
                      {Object.entries(weeklyReport?.revenue?.tier_breakdown ?? {}).map(([tier, count]) => (
                        <div key={tier} className="flex justify-between text-xs">
                          <span className="text-[#8AACBC] capitalize">{tier.replace('_', ' ')}</span>
                          <span className="text-[#D0E4EC] font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-[#4A6E7F] text-right">
                Generated at {weeklyReport?.generated_at ? new Date(weeklyReport.generated_at).toLocaleString() : '—'}
              </div>
            </>
          )}

          {/* Empty State */}
          {!weeklyReport && !weeklyLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <FileBarChart className="w-12 h-12 text-[#3A5A6A] mb-4" />
              <p className="text-[#6B8A9A] text-sm mb-1">No report generated yet</p>
              <p className="text-[#4A6E7F] text-xs">Click &ldquo;Generate Now&rdquo; to create the weekly platform snapshot</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ValuationKPIs() {
  const [val, setVal] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminAPI.getBillingOverview();
        if (data?.valuation) setVal(data.valuation);
      } catch { /* silent — billing might not be connected */ }
    })();
  }, []);

  const fmtC = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-[#3DAA8A]" />
        <h2 className="text-sm font-semibold text-[#D0E4EC]">Key Valuation Metrics</h2>
        <span className="text-[11px] text-emerald-500/70 ml-auto">{val ? 'Live from data' : 'Loading...'}</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#2D6A8F]/10 rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] text-[#6B8A9A] uppercase tracking-wider font-medium">Est. LTV</span>
          </div>
          <div className="text-xl font-bold text-white">{val ? fmtC(val.ltv || 0) : '...'}</div>
          <div className="text-[11px] text-[#4A6E7F] mt-0.5">{val?.avg_lifetime_months ? `${val.avg_lifetime_months} mo avg lifetime` : 'avg lifetime value per user'}</div>
        </div>
        <div className="bg-[#2D6A8F]/10 rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-[#6B8A9A] uppercase tracking-wider font-medium">ARPU</span>
          </div>
          <div className="text-xl font-bold text-white">{val ? fmtC(val.arpu || 0) : '...'}</div>
          <div className="text-[11px] text-[#4A6E7F] mt-0.5">monthly per paying user</div>
        </div>
        <div className="bg-[#2D6A8F]/10 rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-[#3DAA8A]" />
            <span className="text-[11px] text-[#6B8A9A] uppercase tracking-wider font-medium">LTV:CAC</span>
          </div>
          <div className={`text-xl font-bold ${val && val.ltv_cac_ratio >= 3 ? 'text-emerald-400' : 'text-white'}`}>
            {val ? `${val.ltv_cac_ratio || 0}x` : '...'}
          </div>
          <div className="text-[11px] text-[#4A6E7F] mt-0.5">{val && val.ltv_cac_ratio >= 3 ? 'Healthy (>3x target)' : 'target: >3x'}</div>
        </div>
        <div className="bg-[#2D6A8F]/10 rounded-lg p-4">
          <div className="flex items-center gap-1.5 mb-1">
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-[#6B8A9A] uppercase tracking-wider font-medium">Retention</span>
          </div>
          <div className={`text-xl font-bold ${val && val.retention_rate_pct >= 90 ? 'text-emerald-400' : 'text-white'}`}>
            {val ? `${val.retention_rate_pct || 0}%` : '...'}
          </div>
          <div className="text-[11px] text-[#4A6E7F] mt-0.5">{val ? `${val.monthly_churn_pct || 0}% monthly churn` : '30-day retention rate'}</div>
        </div>
      </div>
      <p className="text-[11px] text-[#4A6E7F] mt-3">
        Computed live from subscription data. Generate a Valuation Metrics report for detailed breakdown.
      </p>
    </div>
  );
}
