'use client';

/**
 * Alert rules management page.
 *
 * - Lists all alert rules with current state (ok/firing) + last value
 * - CRUD: create, edit, delete a rule
 * - Force-evaluate a single rule (debug / test notifications)
 * - Paginated firing history
 *
 * Backend: /admin/alerts/* + /admin/alerts/history, evaluator runs every 5m
 * via APScheduler (see backend/app/services/scheduler.py).
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Bell, Plus, AlertTriangle, CheckCircle2, Clock, Loader2,
  Trash2, Edit3, Play, RefreshCw, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';
import {
  MetricCard, PageHeader, TabBar, useTabState,
  SkeletonCards, ErrorState, InfoTooltip,
} from '@/components/superadmin';

interface MetricEntry {
  path: string;
  description: string;
  units: string;
}

interface Rule {
  id: string;
  name: string;
  description: string | null;
  metric_path: string;
  comparison: string;
  threshold_value: number;
  check_interval_minutes: number;
  stability_factor: number;
  notify_emails: string[];
  notify_push: boolean;
  runbook_id: string | null;
  enabled: boolean;
  last_evaluated_at: string | null;
  last_value: number | null;
  current_state: string;
  created_at: string | null;
}

interface HistoryItem {
  id: string;
  rule_id: string;
  rule_name: string;
  metric_path: string;
  fired_at: string | null;
  fired_value: number;
  threshold_value: number;
  comparison: string;
  resolved_at: string | null;
  resolved_value: number | null;
  duration_seconds: number | null;
}

const COMPARISON_LABELS: Record<string, string> = {
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  eq: '=',
};

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatValue(v: number, units: string): string {
  if (units === 'usd') return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (units === 'percent') return `${v.toFixed(1)}%`;
  return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function AlertsPage() {
  const [tab, setTab] = useTabState('rules');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alert Rules"
        subtitle="Define thresholds on platform metrics — fires email + push when breached."
      />
      <TabBar
        tabs={[
          { key: 'rules', label: 'Rules', icon: Bell },
          { key: 'history', label: 'History', icon: Clock },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {tab === 'rules' && <RulesTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}

/* ── Rules tab ──────────────────────────────────────────────────── */

function RulesTab() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [comparisons, setComparisons] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [creating, setCreating] = useState(false);
  const [forcingId, setForcingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [rulesResp, metricsResp] = await Promise.all([
        adminAPI.listAlertRules(),
        adminAPI.listAlertMetrics(),
      ]);
      setRules(rulesResp);
      setMetrics(metricsResp.metrics);
      setComparisons(metricsResp.comparisons);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleForceEvaluate = async (ruleId: string) => {
    setForcingId(ruleId);
    try {
      const result = await adminAPI.forceEvaluateRule(ruleId);
      alert(
        `Evaluation complete.\n\n` +
          `State: ${result.rule.current_state}\n` +
          `Value: ${result.rule.last_value}\n` +
          (result.transitioned ? `Transitioned from ${result.previous_state} → ${result.rule.current_state}` : 'No state change.'),
      );
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Force-evaluate failed');
    } finally {
      setForcingId(null);
    }
  };

  const handleDelete = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Delete rule "${ruleName}"?\n\nFiring history is preserved but the rule stops evaluating.`)) return;
    try {
      await adminAPI.deleteAlertRule(ruleId);
      await fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  if (loading) return <SkeletonCards count={4} />;
  if (error) return <ErrorState message={error} onRetry={fetchData} />;

  const firingCount = rules.filter((r) => r.current_state === 'firing').length;
  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard icon={Bell} label="Rules" value={rules.length.toString()} color="sky" />
        <MetricCard icon={CheckCircle2} label="Enabled" value={enabledCount.toString()} color="sage" />
        <MetricCard
          icon={AlertTriangle}
          label="Currently Firing"
          value={firingCount.toString()}
          color={firingCount > 0 ? 'sky' : 'sage'}
        />
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          onClick={() => { setCreating(true); setEditing(null); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Rule
        </button>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white border border-cg-slate/30 hover:border-cg-slate/60 rounded-lg transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>

      {/* Rules table */}
      <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-cg-slate/20">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">State</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Condition</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Value</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Last Checked</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cg-slate/10">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No alert rules yet. Click "New Rule" to create one.
                </td>
              </tr>
            ) : rules.map((r) => {
              const metric = metrics.find((m) => m.path === r.metric_path);
              return (
                <tr key={r.id} className={r.current_state === 'firing' ? 'bg-red-500/5' : ''}>
                  <td className="px-4 py-3">
                    {!r.enabled ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-700/40 text-[#8AACBC]">
                        Disabled
                      </span>
                    ) : r.current_state === 'firing' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                        <AlertTriangle className="w-3 h-3" />
                        Firing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{r.name}</div>
                    {r.description && (
                      <div className="text-[11px] text-muted-foreground mt-0.5 max-w-xs truncate">{r.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#D0E4EC] text-xs font-mono">
                    {r.metric_path} <span className="text-muted-foreground">{COMPARISON_LABELS[r.comparison] || r.comparison}</span> {formatValue(r.threshold_value, metric?.units || 'count')}
                  </td>
                  <td className="px-4 py-3 text-[#D0E4EC] text-xs">
                    {r.last_value != null ? formatValue(r.last_value, metric?.units || 'count') : '—'}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{formatTime(r.last_evaluated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button aria-label="Play"
                        onClick={() => handleForceEvaluate(r.id)}
                        disabled={forcingId === r.id}
                        title="Force evaluation now"
                        className="p-1.5 rounded text-[#8AACBC] hover:bg-cg-slate/30 hover:text-white transition-colors disabled:opacity-50"
                      >
                        {forcingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                      <button aria-label="Edit"
                        onClick={() => setEditing(r)}
                        title="Edit"
                        className="p-1.5 rounded text-[#8AACBC] hover:bg-cg-slate/30 hover:text-white transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button aria-label="Delete"
                        onClick={() => handleDelete(r.id, r.name)}
                        title="Delete"
                        className="p-1.5 rounded text-red-300 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create / edit modal */}
      {(creating || editing) && (
        <RuleModal
          rule={editing}
          metrics={metrics}
          comparisons={comparisons}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); fetchData(); }}
        />
      )}
    </div>
  );
}

function RuleModal({
  rule,
  metrics,
  comparisons,
  onClose,
  onSaved,
}: {
  rule: Rule | null;
  metrics: MetricEntry[];
  comparisons: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  const [metricPath, setMetricPath] = useState(rule?.metric_path || metrics[0]?.path || '');
  const [comparison, setComparison] = useState(rule?.comparison || 'gt');
  const [thresholdValue, setThresholdValue] = useState(rule?.threshold_value ?? 0);
  const [emailsText, setEmailsText] = useState((rule?.notify_emails || []).join(', '));
  const [notifyPush, setNotifyPush] = useState(rule?.notify_push ?? true);
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const currentMetric = metrics.find((m) => m.path === metricPath);

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const notify_emails = emailsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const payload = {
        name,
        description: description || undefined,
        metric_path: metricPath,
        comparison,
        threshold_value: Number(thresholdValue),
        notify_emails,
        notify_push: notifyPush,
        enabled,
      };
      if (rule) {
        await adminAPI.updateAlertRule(rule.id, payload);
      } else {
        await adminAPI.createAlertRule(payload);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-[#0F2533] border border-cg-slate/30 rounded-xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-semibold text-white">
            {rule ? 'Edit Alert Rule' : 'New Alert Rule'}
          </h3>
          <button aria-label="Close" onClick={onClose} className="p-1 text-[#8AACBC] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Error rate spike"
              className="w-full bg-[#1A3648]/80 border border-cg-slate/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-cg-sage"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Why does this rule exist? What should happen when it fires?"
              className="w-full bg-[#1A3648]/80 border border-cg-slate/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-cg-sage resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">
              Metric
              <InfoTooltip text="Dot-path identifying which live platform metric this rule watches." />
            </label>
            <select
              value={metricPath}
              onChange={(e) => setMetricPath(e.target.value)}
              className="w-full bg-[#1A3648]/80 border border-cg-slate/30 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cg-sage"
            >
              {metrics.map((m) => (
                <option key={m.path} value={m.path}>
                  {m.path} ({m.units})
                </option>
              ))}
            </select>
            {currentMetric && (
              <p className="text-[11px] text-muted-foreground mt-1">{currentMetric.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#8AACBC] mb-1">Comparison</label>
              <select
                value={comparison}
                onChange={(e) => setComparison(e.target.value)}
                className="w-full bg-[#1A3648]/80 border border-cg-slate/30 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cg-sage"
              >
                {comparisons.map((c) => (
                  <option key={c} value={c}>{c} ({COMPARISON_LABELS[c] || c})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#8AACBC] mb-1">Threshold</label>
              <input
                type="number"
                step="any"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="w-full bg-[#1A3648]/80 border border-cg-slate/30 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-cg-sage"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8AACBC] mb-1">Notify emails (comma-separated)</label>
            <input
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              placeholder="oncall@commonground.family, tj@..."
              className="w-full bg-[#1A3648]/80 border border-cg-slate/30 rounded px-3 py-2 text-sm text-white placeholder:text-[#4A6E7F] focus:outline-none focus:border-cg-sage"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyPush}
                onChange={(e) => setNotifyPush(e.target.checked)}
                className="rounded border-cg-slate/40 bg-zinc-900/80 text-cg-sage focus:ring-cg-sage/30"
              />
              <span className="text-sm text-[#D0E4EC]">Push admin devices</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-cg-slate/40 bg-zinc-900/80 text-cg-sage focus:ring-cg-sage/30"
              />
              <span className="text-sm text-[#D0E4EC]">Enabled</span>
            </label>
          </div>

          {err && (
            <div className="px-3 py-2 rounded text-xs bg-red-500/10 border border-red-500/30 text-red-300">
              {err}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded text-sm font-medium text-[#8AACBC] hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-4 py-2 rounded bg-cg-sage hover:bg-cg-sage-light text-white text-sm font-medium transition-colors disabled:opacity-50 inline-flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {rule ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── History tab ──────────────────────────────────────────────────── */

function HistoryTab() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [openOnly, setOpenOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 50;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.listAlertHistory({ page, page_size: pageSize, open_only: openOnly });
      setItems(result.items);
      setTotal(result.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page, openOnly]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={openOnly}
            onChange={(e) => { setOpenOnly(e.target.checked); setPage(1); }}
            className="rounded border-cg-slate/40 bg-zinc-900/80 text-cg-sage focus:ring-cg-sage/30"
          />
          <span className="text-sm text-[#D0E4EC]">Only unresolved</span>
        </label>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white border border-cg-slate/30 hover:border-cg-slate/60 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {!error && (
        <div className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cg-slate/20">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Rule</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Fired</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolved</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cg-slate/10">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="animate-pulse bg-cg-slate/20 rounded h-8" />
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    {openOnly ? 'No unresolved alerts.' : 'No alert firings yet.'}
                  </td>
                </tr>
              ) : items.map((h) => {
                const open = !h.resolved_at;
                return (
                  <tr key={h.id} className={open ? 'bg-red-500/5' : ''}>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{h.rule_name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">{h.metric_path}</div>
                    </td>
                    <td className="px-4 py-3 text-[#8AACBC] text-xs">{formatTime(h.fired_at)}</td>
                    <td className="px-4 py-3 text-red-300 text-xs font-medium">
                      {h.fired_value.toLocaleString()} {COMPARISON_LABELS[h.comparison] || h.comparison} {h.threshold_value.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[#8AACBC] text-xs">
                      {open ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-500/15 text-red-300 border border-red-500/30">
                          Still firing
                        </span>
                      ) : (
                        formatTime(h.resolved_at)
                      )}
                    </td>
                    <td className="px-4 py-3 text-[#D0E4EC] text-xs">
                      {h.duration_seconds != null
                        ? h.duration_seconds < 60
                          ? `${h.duration_seconds}s`
                          : `${Math.floor(h.duration_seconds / 60)}m ${h.duration_seconds % 60}s`
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {total > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-cg-slate/20">
              <span className="text-xs text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
              </span>
              <div className="flex items-center gap-1">
                <button aria-label="Previous"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded text-[#8AACBC] hover:text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-[#D0E4EC] px-2">{page} / {totalPages}</span>
                <button aria-label="Next"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded text-[#8AACBC] hover:text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
