'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  FileText, Plus, Clock, CheckCircle, AlertTriangle,
  Loader2, Download, RefreshCw, Calendar,
  FileJson, FileSpreadsheet,
} from 'lucide-react';
import { adminAPI, type ReportRequest } from '@/lib/admin-api';

const REPORT_TYPES = [
  { value: 'user_export', label: 'User Export', description: 'Full user list with subscription data and activity metrics', icon: '👥' },
  { value: 'billing_summary', label: 'Billing Summary', description: 'Revenue trends, MRR analysis, and subscription lifecycle', icon: '💰' },
  { value: 'engagement', label: 'Engagement Report', description: 'Platform usage, ARIA metrics, and feature adoption', icon: '📊' },
  { value: 'compliance', label: 'Compliance Report', description: 'Audit trail summary and administrative actions', icon: '🔒' },
  { value: 'growth', label: 'Growth Analytics', description: 'Detailed user acquisition and retention analysis', icon: '📈' },
];

const STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/15' },
  processing: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  completed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  failed: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/15' },
  success: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function ReportsPage() {
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Reports</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Request and download admin reports</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Report
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-sm text-emerald-300">{successMessage}</span>
        </div>
      )}

      {/* Create Report Modal */}
      {showCreate && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Request New Report</h2>
            <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300 text-sm">Cancel</button>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Report Type</label>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {REPORT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedType === type.value
                      ? 'border-violet-500/40 bg-violet-500/10'
                      : 'border-zinc-800/60 bg-zinc-800/20 hover:border-zinc-700/60'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{type.icon}</span>
                    <span className="text-sm font-medium text-zinc-200">{type.label}</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{type.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-2">Date Range</label>
              <div className="flex gap-2">
                {[7, 14, 30, 60, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => setDateRange(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      dateRange === d
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800/60 border border-transparent'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-medium block mb-2">Notes (optional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional context..."
                className="w-full px-3 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
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
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800/60 border border-transparent'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Reports List */}
      <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-zinc-800/60 rounded-lg h-16" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No reports found</p>
            <p className="text-xs text-zinc-600 mt-1">Request your first report to get started</p>
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
                <div key={report.id} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/20 transition-colors">
                  <div className={`w-10 h-10 rounded-lg ${statusCfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${statusCfg.color} ${report.status === 'processing' ? 'animate-spin' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-200">{typeInfo?.label || reportType}</span>
                      {metadata?.date_range_days != null && (
                        <span className="text-[11px] text-zinc-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {String(metadata.date_range_days)}d
                        </span>
                      )}
                      {rowCount != null && (
                        <span className="text-[11px] text-zinc-600">{rowCount} rows</span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5 truncate">
                      {report.description || 'No description'}
                    </div>
                  </div>

                  {/* Download buttons for completed reports */}
                  {isCompleted && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(report.id, 'csv')}
                        disabled={downloading === `${report.id}-csv`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
                        title="Download CSV"
                      >
                        {downloading === `${report.id}-csv` ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3" />}
                        CSV
                      </button>
                      <button
                        onClick={() => handleDownload(report.id, 'json')}
                        disabled={downloading === `${report.id}-json`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
                        title="Download JSON"
                      >
                        {downloading === `${report.id}-json` ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileJson className="w-3 h-3" />}
                        JSON
                      </button>
                    </div>
                  )}

                  <div className="text-right flex-shrink-0">
                    <span className={`text-xs font-medium capitalize ${statusCfg.color}`}>{report.status}</span>
                    <div className="text-[11px] text-zinc-600 mt-0.5">{formatDate(report.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {total > reports.length && (
          <div className="px-5 py-3 border-t border-zinc-800/60 text-center">
            <span className="text-xs text-zinc-500">Showing {reports.length} of {total} reports</span>
          </div>
        )}
      </div>
    </div>
  );
}
