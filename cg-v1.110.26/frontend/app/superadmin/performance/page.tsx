'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, Clock, Brain, Zap, RefreshCw, AlertTriangle, Database, Globe,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

type PeriodDays = 1 | 7 | 14 | 30;

interface Transaction {
  name: string;
  count: number;
  p75_ms: number;
  p95_ms: number;
  failure_rate: number;
}

interface AICall {
  description: string;
  count: number;
  avg_duration_ms: number;
  total_tokens: number;
}

interface SlowQuery {
  query: string;
  count: number;
  avg_ms: number;
  p95_ms: number;
}

interface Summary {
  total_requests: number;
  total_ai_calls: number;
  total_tokens_used: number;
  avg_response_p75_ms: number;
  slow_queries_count: number;
}

interface PerformanceData {
  period_days: number;
  transactions: Transaction[];
  ai_calls: AICall[];
  slow_queries: SlowQuery[];
  summary: Summary;
  error?: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />;
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<PeriodDays>(7);

  const fetchData = useCallback(async (period: PeriodDays) => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getPerformanceOverview(period);
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(days);
  }, [days, fetchData]);

  const periodButtons: { label: string; value: PeriodDays }[] = [
    { label: '1d', value: 1 },
    { label: '7d', value: 7 },
    { label: '14d', value: 14 },
    { label: '30d', value: 30 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Performance &amp; AI Monitoring</h1>
          <p className="text-sm text-zinc-500 mt-1">
            API performance, database queries, and AI usage from Sentry
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900/50 border border-zinc-800 rounded-lg p-0.5">
            {periodButtons.map((btn) => (
              <button
                key={btn.value}
                onClick={() => setDays(btn.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  days === btn.value
                    ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchData(days)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error / Warning Banner */}
      {(error || data?.error) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-300">{error || data?.error}</p>
        </div>
      )}

      {/* Summary Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : data?.summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={Activity}
            label="Total Requests"
            value={formatNumber(data.summary.total_requests)}
          />
          <SummaryCard
            icon={Clock}
            label="Avg Response (p75)"
            value={`${formatNumber(data.summary.avg_response_p75_ms)} ms`}
          />
          <SummaryCard
            icon={Brain}
            label="AI Calls"
            value={formatNumber(data.summary.total_ai_calls)}
          />
          <SummaryCard
            icon={Zap}
            label="Tokens Used"
            value={formatTokens(data.summary.total_tokens_used)}
          />
        </div>
      ) : null}

      {/* Top API Endpoints */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Globe className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Top API Endpoints</h2>
        </div>
        {loading && !data ? (
          <div className="p-5 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : data?.transactions?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Endpoint</th>
                  <th className="text-right px-5 py-3 font-medium">Requests</th>
                  <th className="text-right px-5 py-3 font-medium">p75 (ms)</th>
                  <th className="text-right px-5 py-3 font-medium">p95 (ms)</th>
                  <th className="text-right px-5 py-3 font-medium">Failure Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 text-zinc-200 font-mono text-xs">{t?.name}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{formatNumber(t?.count ?? 0)}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{t?.p75_ms?.toFixed(0)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${
                      (t?.p95_ms ?? 0) > 2000 ? 'text-red-400' : (t?.p95_ms ?? 0) > 500 ? 'text-amber-400' : 'text-zinc-300'
                    }`}>
                      {t?.p95_ms?.toFixed(0)}
                    </td>
                    <td className={`px-5 py-3 text-right font-medium ${
                      (t?.failure_rate ?? 0) > 5 ? 'text-red-400' : (t?.failure_rate ?? 0) > 1 ? 'text-amber-400' : 'text-zinc-300'
                    }`}>
                      {t?.failure_rate?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            No performance data available for this period
          </div>
        )}
      </section>

      {/* AI Usage */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-200">AI Usage</h2>
        </div>
        {loading && !data ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : data?.ai_calls?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Model / Description</th>
                  <th className="text-right px-5 py-3 font-medium">Calls</th>
                  <th className="text-right px-5 py-3 font-medium">Avg Duration</th>
                  <th className="text-right px-5 py-3 font-medium">Total Tokens</th>
                </tr>
              </thead>
              <tbody>
                {data.ai_calls.map((a, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 text-zinc-200">{a?.description}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{formatNumber(a?.count ?? 0)}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{a?.avg_duration_ms?.toFixed(0)} ms</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{formatTokens(a?.total_tokens ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            No AI usage data available for this period
          </div>
        )}
      </section>

      {/* Slow Database Queries */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-2">
          <Database className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Slow Database Queries</h2>
        </div>
        {loading && !data ? (
          <div className="p-5 space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-8" />
            ))}
          </div>
        ) : data?.slow_queries?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Query</th>
                  <th className="text-right px-5 py-3 font-medium">Executions</th>
                  <th className="text-right px-5 py-3 font-medium">Avg (ms)</th>
                  <th className="text-right px-5 py-3 font-medium">p95 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {data.slow_queries.map((q, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-5 py-3 text-zinc-200 font-mono text-xs max-w-md" title={q?.query}>
                      {q?.query?.length > 120 ? `${q.query.slice(0, 120)}...` : q?.query}
                    </td>
                    <td className="px-5 py-3 text-right text-zinc-300">{formatNumber(q?.count ?? 0)}</td>
                    <td className="px-5 py-3 text-right text-zinc-300">{q?.avg_ms?.toFixed(0)}</td>
                    <td className={`px-5 py-3 text-right font-medium ${
                      (q?.p95_ms ?? 0) > 1000 ? 'text-red-400' : (q?.p95_ms ?? 0) > 500 ? 'text-amber-400' : 'text-zinc-300'
                    }`}>
                      {q?.p95_ms?.toFixed(0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-zinc-500 text-sm">
            No slow queries detected for this period
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-violet-400" />
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-zinc-100">{value}</div>
    </div>
  );
}
