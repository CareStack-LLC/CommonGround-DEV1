'use client';

import { useState } from 'react';
import {
  Users, DollarSign, TrendingUp, MessageSquare, Bug,
  ArrowUpRight, ArrowDownRight, RefreshCw, Send,
  AlertTriangle, FileBarChart, Activity, Shield,
} from 'lucide-react';
import { adminAPI, type WeeklyReport } from '@/lib/admin-api';

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null || value === undefined) return <span className="text-xs text-zinc-600">N/A</span>;
  const positive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${positive ? 'text-emerald-400' : 'text-red-400'}`}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export default function WeeklyReportPage() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const generateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const data = await adminAPI.getWeeklyReport();
      setReport(data);
      setSuccess('Report generated successfully');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    try {
      setSending(true);
      setError(null);
      setSuccess(null);
      const result = await adminAPI.sendWeeklyReport();
      if (result.sent) {
        setSuccess('Weekly report email sent successfully');
        setReport(result.report);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send report email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Weekly Platform Report</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {report ? `Period: ${new Date(report.period.start).toLocaleDateString()} - ${new Date(report.period.end).toLocaleDateString()}` : 'Generate a report to view metrics'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateReport}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Generate Now
          </button>
          <button
            onClick={sendEmail}
            disabled={sending || !report}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
            Send Email
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <p className="text-sm text-emerald-300">{success}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && !report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      )}

      {/* Report Content */}
      {report && (
        <>
          {/* Primary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              icon={Users} label="Total Users" value={formatNumber(report.users.total)}
              sub={`${report.users.new_this_week} new this week`}
              growth={report.users.growth_pct} color="violet"
            />
            <MetricCard
              icon={DollarSign} label="Est. MRR" value={formatCurrency(report.revenue.estimated_mrr)}
              sub={`${report.revenue.paying_users} paying users`}
              color="blue"
            />
            <MetricCard
              icon={Users} label="New Users" value={formatNumber(report.users.new_this_week)}
              growth={report.users.growth_pct} color="emerald"
            />
            <MetricCard
              icon={MessageSquare} label="Messages" value={formatNumber(report.engagement.messages_this_week)}
              growth={report.engagement.message_growth_pct} color="amber"
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <Activity className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <div>
                <div className="text-lg font-semibold text-white">{formatNumber(report.users.active_30d)}</div>
                <div className="text-[11px] text-zinc-500">Active (30d)</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <Bug className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <div>
                <div className="text-lg font-semibold text-white">{report.bugs.open_sentry_issues}</div>
                <div className="text-[11px] text-zinc-500">Open Bugs</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <FileBarChart className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <div>
                <div className="text-lg font-semibold text-white">{report.platform.active_family_files}</div>
                <div className="text-[11px] text-zinc-500">Active Family Files</div>
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3 flex items-center gap-3">
              <Shield className="w-4 h-4 text-zinc-500 flex-shrink-0" />
              <div>
                <div className="text-lg font-semibold text-white">{report.platform.total_professionals}</div>
                <div className="text-[11px] text-zinc-500">Professionals</div>
              </div>
            </div>
          </div>

          {/* Engagement Section */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Engagement Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-zinc-800/60 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">Messages This Week</div>
                <div className="text-2xl font-bold text-white">{formatNumber(report.engagement.messages_this_week)}</div>
                <GrowthBadge value={report.engagement.message_growth_pct} />
              </div>
              <div className="border border-zinc-800/60 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">ARIA Flags</div>
                <div className="text-2xl font-bold text-white">{report.engagement.aria_flags_this_week}</div>
                <span className="text-xs text-zinc-600">interventions triggered</span>
              </div>
              <div className="border border-zinc-800/60 rounded-lg p-4">
                <div className="text-xs text-zinc-500 mb-1">Revenue Breakdown</div>
                <div className="space-y-1.5 mt-2">
                  {Object.entries(report.revenue?.tier_breakdown || {}).map(([tier, count]) => (
                    <div key={tier} className="flex justify-between text-xs">
                      <span className="text-zinc-400 capitalize">{tier.replace('_', ' ')}</span>
                      <span className="text-zinc-300 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-xs text-zinc-600 text-right">
            Generated at {new Date(report.generated_at).toLocaleString()}
          </div>
        </>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <FileBarChart className="w-12 h-12 text-zinc-700 mb-4" />
          <p className="text-zinc-500 text-sm mb-1">No report generated yet</p>
          <p className="text-zinc-600 text-xs">Click &ldquo;Generate Now&rdquo; to create the weekly platform report</p>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, sub, growth, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  growth?: number | null; color: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'from-violet-600/20 to-violet-600/5 border-violet-500/20',
    emerald: 'from-emerald-600/20 to-emerald-600/5 border-emerald-500/20',
    blue: 'from-blue-600/20 to-blue-600/5 border-blue-500/20',
    amber: 'from-amber-600/20 to-amber-600/5 border-amber-500/20',
  };
  const iconColorMap: Record<string, string> = {
    violet: 'text-violet-400', emerald: 'text-emerald-400',
    blue: 'text-blue-400', amber: 'text-amber-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-5 h-5 ${iconColorMap[color]} mb-2`} />
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-zinc-500">{label}</span>
        {growth !== undefined && growth !== null && growth !== 0 && <GrowthBadge value={growth} />}
      </div>
      {sub && <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}
