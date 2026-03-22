'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign, TrendingUp, CreditCard, AlertTriangle,
  Users, Percent, ExternalLink, RefreshCw, UserPlus,
  UserMinus, Clock, CheckCircle, XCircle, Zap, ArrowUpDown,
} from 'lucide-react';
import { adminAPI, type BillingOverview, type SyncResult } from '@/lib/admin-api';

const TIER_LABELS: Record<string, string> = {
  web_starter: 'Web Starter',
  plus: 'Plus', complete: 'Complete',
  professional_starter: 'Starter (Pro)',
  solo: 'Solo (Pro)', small_firm: 'Small Firm (Pro)', mid_size: 'Mid Size (Pro)',
};

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400', trial: 'text-blue-400',
  past_due: 'text-amber-400', cancelled: 'text-red-400',
  none: 'text-[#6B8A9A]',
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function BillingContent() {
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

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

  const handleSync = async (type: 'customers' | 'subscriptions') => {
    try {
      setSyncing(type);
      setSyncResult(null);
      const result = type === 'customers'
        ? await adminAPI.syncStripeCustomers()
        : await adminAPI.syncStripeSubscriptions();
      setSyncResult(result);
      // Refresh billing data
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
        <p className="text-[#8AACBC] mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-[#3DAA8A] hover:bg-[#5BC4A0] text-white text-sm font-medium">Retry</button>
      </div>
    );
  }

  // Calculate totals from MRR data (uses correct prices from API)
  const totalConsumers = data ? Object.values(data.consumer_subscriptions || {}).reduce((a, b) => a + b.total, 0) : 0;
  const paidConsumers = data ? Object.entries(data.mrr_by_tier || {})
    .filter(([, v]) => v.price > 0)
    .reduce((a, [, v]) => a + v.count, 0) : 0;

  const stripeLive = data?.stripe_live;
  const stripeAvailable = stripeLive?.stripe_available === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Billing & Revenue</h1>
          <p className="text-sm text-[#6B8A9A] mt-0.5">Subscription metrics and revenue analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {stripeAvailable && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-[#3DAA8A]/20 text-[11px] text-emerald-400 font-medium">
              <Zap className="w-3 h-3" />
              Live from Stripe
            </span>
          )}
          {stripeLive && !stripeAvailable && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-[#F5A623]/20 text-[11px] text-amber-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              Stripe Unavailable
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D6A8F]/20 hover:bg-[#2D6A8F]/30 text-[#8AACBC] hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-[#2D6A8F]/20 rounded-xl h-24" />)
        ) : data && (
          <>
            <div className="bg-gradient-to-b from-[#3DAA8A]/20 to-[#3DAA8A]/5 border border-[#3DAA8A]/20 rounded-xl p-4">
              <DollarSign className="w-5 h-5 text-[#3DAA8A] mb-2" />
              <div className="text-2xl font-bold text-white">
                {stripeAvailable && stripeLive?.total_mrr != null
                  ? formatCurrency(stripeLive.total_mrr)
                  : formatCurrency(data.total_mrr)}
              </div>
              <div className="text-xs text-[#6B8A9A]">{stripeAvailable ? 'Live MRR' : 'Est. MRR'}</div>
            </div>
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
              <Users className="w-5 h-5 text-blue-400 mb-2" />
              <div className="text-2xl font-bold text-white">{totalConsumers.toLocaleString()}</div>
              <div className="text-xs text-[#6B8A9A]">Total Subscribers</div>
            </div>
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
              <UserPlus className="w-5 h-5 text-emerald-400 mb-2" />
              <div className="text-2xl font-bold text-white">{data.new_paid_30d}</div>
              <div className="text-xs text-[#6B8A9A]">New Paid (30d)</div>
            </div>
            <div className={`bg-[#1A3648]/60 border rounded-xl p-4 ${data.past_due_count > 0 ? 'border-amber-500/30' : 'border-[#2D6A8F]/20'}`}>
              <AlertTriangle className={`w-5 h-5 mb-2 ${data.past_due_count > 0 ? 'text-amber-400' : 'text-[#6B8A9A]'}`} />
              <div className={`text-2xl font-bold ${data.past_due_count > 0 ? 'text-amber-400' : 'text-white'}`}>{data.past_due_count}</div>
              <div className="text-xs text-[#6B8A9A]">Past Due</div>
            </div>
            <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
              <UserMinus className="w-5 h-5 text-red-400 mb-2" />
              <div className="text-2xl font-bold text-white">{data.cancelled_30d}</div>
              <div className="text-xs text-[#6B8A9A]">Cancelled (30d)</div>
            </div>
          </>
        )}
      </div>

      {/* MRR by Tier */}
      {data && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Revenue by Tier</h2>
          <div className="space-y-3">
            {Object.entries(data.mrr_by_tier || {})
              .filter(([, v]) => v.price > 0)
              .sort(([, a], [, b]) => b.mrr - a.mrr)
              .map(([tier, info]) => {
                const pctOfMrr = data.total_mrr > 0 ? Math.round((info.mrr / data.total_mrr) * 100) : 0;
                return (
                  <div key={tier}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-[#D0E4EC] font-medium capitalize w-28">{TIER_LABELS[tier] || tier}</span>
                        <span className="text-xs text-[#6B8A9A]">${info.price}/mo x {info.count} active</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-white">{formatCurrency(info.mrr)}</span>
                        <span className="text-xs text-[#6B8A9A] w-12 text-right">{pctOfMrr}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#3DAA8A] to-[#5BC4A0] transition-all duration-500"
                        style={{ width: `${Math.max(pctOfMrr, 2)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2D6A8F]/20">
            <span className="text-sm text-[#8AACBC] font-medium">Total MRR</span>
            <span className="text-lg font-bold text-white">{formatCurrency(data.total_mrr)}</span>
          </div>
        </div>
      )}

      {/* Recent Payments from Stripe */}
      {stripeAvailable && stripeLive?.recent_payments && stripeLive.recent_payments.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Recent Payments (Stripe)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-[#6B8A9A] border-b border-[#2D6A8F]/20">
                  <th className="text-left pb-2 font-medium">Customer</th>
                  <th className="text-left pb-2 font-medium">Amount</th>
                  <th className="text-left pb-2 font-medium hidden sm:table-cell">Description</th>
                  <th className="text-left pb-2 font-medium">Date</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {stripeLive.recent_payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[#2D6A8F]/10 last:border-0">
                    <td className="py-2.5 text-sm text-[#D0E4EC]">{payment.customer_email || payment.customer}</td>
                    <td className="py-2.5 text-sm text-white font-medium">{formatCurrency(payment.amount)}</td>
                    <td className="py-2.5 text-xs text-[#6B8A9A] hidden sm:table-cell max-w-48 truncate">{payment.description || '—'}</td>
                    <td className="py-2.5 text-xs text-[#6B8A9A]">{formatDate(payment.created)}</td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subscription Breakdown by Category */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Grouped Tier Breakdown */}
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Subscriptions by Category</h2>
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="animate-pulse bg-[#2D6A8F]/20 rounded h-12" />)}</div>
          ) : data && (() => {
            const TIER_GROUPS: { label: string; color: string; tiers: string[] }[] = [
              { label: 'Standard Plans', color: 'text-[#3DAA8A]', tiers: ['plus', 'complete'] },
              { label: 'Professional Plans', color: 'text-indigo-400', tiers: ['professional_starter', 'solo', 'small_firm', 'mid_size'] },
              { label: 'Free / Starter', color: 'text-[#6B8A9A]', tiers: ['web_starter'] },
            ];

            return (
              <div className="space-y-5">
                {TIER_GROUPS.map((group) => {
                  const groupEntries = Object.entries(data.consumer_subscriptions || {})
                    .filter(([tier]) => group.tiers.includes(tier))
                    .sort(([, a], [, b]) => b.total - a.total);
                  // Also check professional subscriptions for professional tiers
                  const proEntries = Object.entries(data.professional_subscriptions || {})
                    .filter(([tier]) => group.tiers.includes(tier));
                  const allEntries = [...groupEntries.map(([t, info]) => ({ tier: t, total: info.total, statuses: info.statuses })),
                    ...proEntries.map(([t, count]) => ({ tier: t, total: count, statuses: {} as Record<string, number> }))];
                  if (allEntries.length === 0) return null;
                  const groupTotal = allEntries.reduce((s, e) => s + e.total, 0);
                  return (
                    <div key={group.label}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[11px] uppercase tracking-wider font-semibold ${group.color}`}>{group.label}</span>
                        <span className="text-xs text-[#6B8A9A]">{groupTotal} total</span>
                      </div>
                      <div className="space-y-2">
                        {allEntries.map(({ tier, total, statuses }) => {
                          const tierPrice = data.mrr_by_tier[tier]?.price ?? 0;
                          return (
                            <div key={tier} className="bg-[#2D6A8F]/10 rounded-lg px-4 py-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-white font-medium">{TIER_LABELS[tier] || tier}</span>
                                  {tierPrice > 0 && <span className="text-xs text-[#4A6E7F]">${tierPrice}/mo</span>}
                                </div>
                                <span className="text-sm font-semibold text-[#D0E4EC]">{total}</span>
                              </div>
                              {Object.keys(statuses).length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {Object.entries(statuses).map(([status, count]) => (
                                    <span key={status} className={`text-[11px] ${STATUS_COLORS[status] || 'text-[#6B8A9A]'}`}>
                                      {count} {status}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* Key Metrics & Actions */}
        <div className="space-y-4">

          {/* Key Metrics */}
          <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Key Metrics</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-[#8AACBC]">Trial Users</span>
                </div>
                <span className="text-sm font-medium text-blue-400">{data?.trial_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-[#8AACBC]">Paid Conversion</span>
                </div>
                <span className="text-sm font-medium text-emerald-400">
                  {totalConsumers > 0 ? Math.round((paidConsumers / totalConsumers) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-[#3DAA8A]" />
                  <span className="text-xs text-[#8AACBC]">ARPU (paid)</span>
                </div>
                <span className="text-sm font-medium text-[#3DAA8A]">
                  {paidConsumers > 0 ? formatCurrency(data ? data.total_mrr / paidConsumers : 0) : '—'}
                </span>
              </div>
              {stripeAvailable && stripeLive?.total_customers != null && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs text-[#8AACBC]">Stripe Customers</span>
                  </div>
                  <span className="text-sm font-medium text-indigo-400">{stripeLive.total_customers}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stripe Sync & Links */}
          <div className="space-y-2">
            <button
              onClick={() => handleSync('customers')}
              disabled={syncing !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl text-sm text-[#8AACBC] hover:text-white hover:border-violet-500/30 transition-all disabled:opacity-50"
            >
              <ArrowUpDown className={`w-4 h-4 ${syncing === 'customers' ? 'animate-spin' : ''}`} />
              {syncing === 'customers' ? 'Syncing Customers...' : 'Sync Stripe Customers'}
            </button>
            <button
              onClick={() => handleSync('subscriptions')}
              disabled={syncing !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl text-sm text-[#8AACBC] hover:text-white hover:border-violet-500/30 transition-all disabled:opacity-50"
            >
              <ArrowUpDown className={`w-4 h-4 ${syncing === 'subscriptions' ? 'animate-spin' : ''}`} />
              {syncing === 'subscriptions' ? 'Syncing Subscriptions...' : 'Sync Stripe Subscriptions'}
            </button>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl text-sm text-[#8AACBC] hover:text-white hover:border-zinc-700/60 transition-all group"
            >
              <CreditCard className="w-4 h-4 group-hover:text-[#3DAA8A] transition-colors" />
              Open Stripe Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Sync Result */}
          {syncResult && (
            <div className="bg-[#2D6A8F]/15 border border-zinc-700/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-[#D0E4EC] font-medium">Sync Complete</span>
              </div>
              <div className="text-xs text-[#8AACBC] space-y-1">
                {syncResult.synced != null && <div>Synced: <span className="text-emerald-400">{syncResult.synced}</span></div>}
                {syncResult.updated != null && <div>Updated: <span className="text-blue-400">{syncResult.updated}</span></div>}
                {syncResult.failed > 0 && <div>Failed: <span className="text-red-400">{syncResult.failed}</span></div>}
                {syncResult.already_synced != null && syncResult.already_synced > 0 && <div>Already synced: {syncResult.already_synced}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Valuation Metrics (live computed) */}
      {data?.valuation && Object.keys(data.valuation).length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#3DAA8A]" />
            <h2 className="text-sm font-semibold text-[#D0E4EC]">Valuation Metrics</h2>
            <span className="text-[11px] text-emerald-500/70 ml-auto">Live from data</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <ValuationCard label="LTV" value={formatCurrency(data.valuation.ltv || 0)} sub={`${data.valuation.avg_lifetime_months || 0} mo avg lifetime`} />
            <ValuationCard label="ARPU" value={formatCurrency(data.valuation.arpu || 0)} sub="monthly per user" />
            <ValuationCard label="Retention" value={`${data.valuation.retention_rate_pct || 0}%`} sub={`${data.valuation.monthly_churn_pct || 0}% monthly churn`} highlight={data.valuation.retention_rate_pct >= 90} />
            <ValuationCard label="LTV:CAC" value={`${data.valuation.ltv_cac_ratio || 0}x`} sub={data.valuation.ltv_cac_ratio >= 3 ? 'Healthy (>3x target)' : 'Below 3x target'} highlight={data.valuation.ltv_cac_ratio >= 3} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-[#2D6A8F]/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{formatCurrency(data.valuation.arr || 0)}</div>
              <div className="text-[11px] text-[#6B8A9A]">ARR</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{data.valuation.active_paying || 0}</div>
              <div className="text-[11px] text-[#6B8A9A]">Paying Users</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-white">{(data.valuation.total_users || 0).toLocaleString()}</div>
              <div className="text-[11px] text-[#6B8A9A]">Total Users</div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Projections */}
      {data && data.total_mrr > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-[#D0E4EC]">Revenue Projections</h2>
          </div>
          {(() => {
            const mrr = stripeAvailable && stripeLive?.total_mrr != null ? stripeLive.total_mrr : data.total_mrr;
            const monthlyGrowth = 0.05;
            const projections = [
              { label: '1 Year', months: 12 },
              { label: '3 Years', months: 36 },
              { label: '5 Years', months: 60 },
            ].map(({ label, months }) => {
              const factor = ((Math.pow(1 + monthlyGrowth, months) - 1) / monthlyGrowth);
              const totalRevenue = mrr * factor;
              const endingMrr = mrr * Math.pow(1 + monthlyGrowth, months);
              return { label, totalRevenue, endingMrr, arr: endingMrr * 12 };
            });

            return (
              <div className="grid grid-cols-3 gap-3">
                {projections.map((p) => (
                  <div key={p.label} className="bg-[#2D6A8F]/10 rounded-lg p-4 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-[#6B8A9A] font-semibold mb-2">{p.label}</div>
                    <div className="text-lg font-bold text-white mb-1">{formatCurrency(p.totalRevenue)}</div>
                    <div className="text-xs text-[#6B8A9A]">cumulative revenue</div>
                    <div className="mt-2 pt-2 border-t border-zinc-700/40">
                      <div className="text-sm font-semibold text-emerald-400">{formatCurrency(p.arr)}</div>
                      <div className="text-[11px] text-[#4A6E7F]">projected ARR</div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          <p className="text-[11px] text-[#4A6E7F] mt-3">
            Based on current MRR of {formatCurrency(stripeAvailable && stripeLive?.total_mrr != null ? stripeLive.total_mrr : data.total_mrr)} with 5% assumed monthly growth.
          </p>
        </div>
      )}

      {/* Refunds & Disputes */}
      {data?.refunds && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-[#D0E4EC]">Refunds &amp; Disputes</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-[#2D6A8F]/10 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${data.refunds.refund_count_30d > 0 ? 'text-amber-400' : 'text-white'}`}>
                {data.refunds.refund_count_30d}
              </div>
              <div className="text-[11px] text-[#6B8A9A]">Refunds (30d)</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${data.refunds.total_refunded_30d > 0 ? 'text-amber-400' : 'text-white'}`}>
                {formatCurrency(data.refunds.total_refunded_30d)}
              </div>
              <div className="text-[11px] text-[#6B8A9A]">Refunded Amount</div>
            </div>
            <div className="bg-[#2D6A8F]/10 rounded-lg p-3 text-center">
              <div className={`text-lg font-bold ${data.refunds.dispute_count > 0 ? 'text-red-400' : 'text-white'}`}>
                {data.refunds.dispute_count}
              </div>
              <div className="text-[11px] text-[#6B8A9A]">Open Disputes</div>
            </div>
          </div>

          {data.refunds.recent_refunds?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-[#6B8A9A] border-b border-[#2D6A8F]/20">
                    <th className="text-left pb-2 font-medium">Amount</th>
                    <th className="text-left pb-2 font-medium">Reason</th>
                    <th className="text-left pb-2 font-medium">Status</th>
                    <th className="text-left pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.refunds.recent_refunds.map((r: { id: string; amount: number; reason: string | null; status: string; created: string }) => (
                    <tr key={r.id} className="border-b border-[#2D6A8F]/10 last:border-0">
                      <td className="py-2 text-amber-400 font-medium">{formatCurrency(r.amount)}</td>
                      <td className="py-2 text-xs text-[#8AACBC] capitalize">{r.reason?.replace('_', ' ') || 'N/A'}</td>
                      <td className="py-2 text-xs text-[#8AACBC] capitalize">{r.status}</td>
                      <td className="py-2 text-xs text-[#6B8A9A]">{formatDate(r.created)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.refunds.recent_refunds?.length === 0 && data.refunds.dispute_count === 0 && (
            <p className="text-[#4A6E7F] text-sm text-center py-4">No refunds or disputes. Looking good!</p>
          )}
        </div>
      )}
    </div>
  );
}

function ValuationCard({ label, value, sub, highlight }: {
  label: string; value: string; sub: string; highlight?: boolean;
}) {
  return (
    <div className="bg-[#2D6A8F]/10 rounded-lg p-4">
      <div className="text-[11px] text-[#6B8A9A] uppercase tracking-wider font-medium mb-1">{label}</div>
      <div className={`text-xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      <div className="text-[11px] text-[#4A6E7F] mt-0.5">{sub}</div>
    </div>
  );
}
