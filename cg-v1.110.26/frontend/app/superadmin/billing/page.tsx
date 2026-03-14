'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, AlertTriangle,
  Users, Percent, ExternalLink, RefreshCw, UserPlus,
  UserMinus, Clock,
} from 'lucide-react';
import { adminAPI, type BillingOverview } from '@/lib/admin-api';

const TIER_PRICES: Record<string, number> = {
  essential: 0, starter: 0, plus: 12, family_plus: 25,
  solo: 99, small_firm: 299, mid_size: 799,
};

const TIER_LABELS: Record<string, string> = {
  essential: 'Essential', starter: 'Starter', plus: 'Plus',
  family_plus: 'Family Plus', solo: 'Solo',
  small_firm: 'Small Firm', mid_size: 'Mid Size',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400', trial: 'text-blue-400',
  past_due: 'text-amber-400', cancelled: 'text-red-400',
  none: 'text-zinc-500',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

export default function BillingPage() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getBillingOverview();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-zinc-400 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  // Calculate totals
  const totalConsumers = data ? Object.values(data.consumer_subscriptions).reduce((a, b) => a + b.total, 0) : 0;
  const paidConsumers = data ? Object.entries(data.consumer_subscriptions)
    .filter(([tier]) => TIER_PRICES[tier] > 0)
    .reduce((a, [, b]) => a + (b.statuses?.active || 0), 0) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Billing & Revenue</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Subscription metrics and revenue analysis</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-zinc-800/60 rounded-xl h-24" />)
        ) : data && (
          <>
            <div className="bg-gradient-to-b from-violet-600/20 to-violet-600/5 border border-violet-500/20 rounded-xl p-4">
              <DollarSign className="w-5 h-5 text-violet-400 mb-2" />
              <div className="text-2xl font-bold text-white">{formatCurrency(data.total_mrr)}</div>
              <div className="text-xs text-zinc-500">Est. MRR</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <Users className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{totalConsumers.toLocaleString()}</div>
              <div className="text-xs text-zinc-500">Total Subscribers</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <UserPlus className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-2xl font-bold text-white">{data.new_paid_30d}</div>
              <div className="text-xs text-zinc-500">New Paid (30d)</div>
            </div>
            <div className={`bg-zinc-900/50 border rounded-xl p-4 ${data.past_due_count > 0 ? 'border-amber-500/30' : 'border-zinc-800/60'}`}>
              <AlertTriangle className={`w-5 h-5 mb-2 ${data.past_due_count > 0 ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div className={`text-2xl font-bold ${data.past_due_count > 0 ? 'text-amber-400' : 'text-white'}`}>{data.past_due_count}</div>
              <div className="text-xs text-zinc-500">Past Due</div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-4">
              <UserMinus className="w-5 h-5 text-red-400 mb-2" />
              <div className="text-2xl font-bold text-white">{data.cancelled_30d}</div>
              <div className="text-xs text-zinc-500">Cancelled (30d)</div>
            </div>
          </>
        )}
      </div>

      {/* MRR by Tier */}
      {data && (
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Revenue by Tier</h2>
          <div className="space-y-3">
            {Object.entries(data.mrr_by_tier)
              .filter(([, v]) => v.price > 0)
              .sort(([, a], [, b]) => b.mrr - a.mrr)
              .map(([tier, info]) => {
                const pctOfMrr = data.total_mrr > 0 ? Math.round((info.mrr / data.total_mrr) * 100) : 0;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-zinc-300 font-medium capitalize w-28">{TIER_LABELS[tier] || tier}</span>
                        <span className="text-xs text-zinc-500">${info.price}/mo × {info.count} active</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-white">{formatCurrency(info.mrr)}</span>
                        <span className="text-xs text-zinc-500 w-12 text-right">{pctOfMrr}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-500"
                        style={{ width: `${pctOfMrr}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/60">
            <span className="text-sm text-zinc-400 font-medium">Total MRR</span>
            <span className="text-lg font-bold text-white">{formatCurrency(data.total_mrr)}</span>
          </div>
        </div>
      )}

      {/* Consumer Subscriptions Detail */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tier Breakdown */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Consumer Tiers</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-zinc-800/60 rounded h-12" />)}</div>
          ) : data && (
            <div className="space-y-3">
              {Object.entries(data.consumer_subscriptions)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([tier, info]) => (
                  <div key={tier} className="bg-zinc-800/30 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-200 capitalize font-medium">{TIER_LABELS[tier] || tier}</span>
                        <span className="text-xs text-zinc-600">${TIER_PRICES[tier] || 0}/mo</span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-300">{info.total}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(info.statuses).map(([status, count]) => (
                        <span key={status} className={`text-[11px] ${STATUS_COLORS[status] || 'text-zinc-500'}`}>
                          {count} {status}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Professional Subscriptions & Actions */}
        <div className="space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Professional Tiers</h2>
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="animate-pulse bg-zinc-800/60 rounded h-10" />)}</div>
            ) : data && (
              <div className="space-y-2">
                {Object.entries(data.professional_subscriptions).map(([tier, count]) => (
                  <div key={tier} className="flex items-center justify-between px-4 py-2.5 bg-zinc-800/30 rounded-lg">
                    <span className="text-sm text-zinc-300 capitalize">{TIER_LABELS[tier] || tier}</span>
                    <span className="text-sm font-semibold text-zinc-200">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Key Metrics</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-zinc-400">Trial Users</span>
                </div>
                <span className="text-sm font-medium text-blue-400">{data?.trial_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-zinc-400">Paid Conversion</span>
                </div>
                <span className="text-sm font-medium text-emerald-400">
                  {totalConsumers > 0 ? Math.round((paidConsumers / totalConsumers) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-violet-400" />
                  <span className="text-xs text-zinc-400">ARPU (paid)</span>
                </div>
                <span className="text-sm font-medium text-violet-400">
                  {paidConsumers > 0 ? formatCurrency(data ? data.total_mrr / paidConsumers : 0) : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Stripe Link */}
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-sm text-zinc-400 hover:text-zinc-200 hover:border-zinc-700/60 transition-all group"
          >
            <CreditCard className="w-4 h-4 group-hover:text-violet-400 transition-colors" />
            Open Stripe Dashboard
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
