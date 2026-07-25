'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart3, TrendingUp, Users, Globe, Mail, RefreshCw,
  ArrowRight, Eye, MousePointer, AlertTriangle, Loader2,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-cg-slate/20 rounded-lg ${className}`} />;
}

const SOURCE_COLORS: Record<string, string> = {
  newsletter: 'bg-blue-500/15 text-blue-400 border-cg-slate/20',
  blog: 'bg-emerald-500/15 text-emerald-400 border-cg-sage/20',
  contact_form: 'bg-amber-500/15 text-amber-400 border-cg-amber/20',
  import: 'bg-cg-sage/15 text-cg-sage border-cg-sage/20',
  manual: 'bg-zinc-700/50 text-cg-slate-muted border-zinc-700/40',
  landing_page: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  social: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  referral: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  event: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  paid: 'bg-red-500/15 text-red-400 border-red-500/20',
  early_adopter: 'bg-teal-500/15 text-teal-400 border-teal-500/20',
  organic: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
};

export default function AnalyticsContent() {
  const [pipeline, setPipeline] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [landingPages, setLandingPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [p, c, lp] = await Promise.all([
        adminAPI.getLeadPipeline().catch(() => null),
        adminAPI.getCampaigns().catch(() => []),
        adminAPI.getLandingPages().catch(() => []),
      ]);
      setPipeline(p);
      setCampaigns(Array.isArray(c) ? c : []);
      setLandingPages(Array.isArray(lp) ? lp : []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const funnel = pipeline?.funnel || { total: 0, contacted: 0, responded: 0, converted: 0 };
  const bySource = pipeline?.by_source || {};
  const totalLeads = funnel.total || 1; // avoid div by zero

  // Campaign stats aggregation
  const sentCampaigns = campaigns.filter(c => c.status === 'sent' || c.status === 'sending');
  const totalSent = sentCampaigns.length;
  const campaignsWithStats = sentCampaigns.filter(c => c.stats_json);

  // Landing page stats
  const publishedPages = landingPages.filter(lp => lp.status === 'published');
  const totalViews = landingPages.reduce((sum: number, lp: any) => sum + (lp.view_count || 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Marketing Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Cross-channel performance overview</p>
        </div>
        <button onClick={fetchAll} disabled={loading} className="p-2 rounded-lg bg-cg-slate/20 hover:bg-cg-slate/30 text-cg-slate-muted hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <>
          {/* Top-Level KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard icon={Users} label="Total Leads" value={funnel.total} color="violet" />
            <KpiCard icon={TrendingUp} label="Conversion Rate" value={`${pipeline?.conversion_rate || 0}%`} color="emerald" />
            <KpiCard icon={Mail} label="Campaigns Sent" value={totalSent} color="blue" />
            <KpiCard icon={Globe} label="Landing Page Views" value={totalViews} color="cyan" />
          </div>

          {/* Conversion Funnel */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-cg-sage" />
              <h2 className="text-sm font-semibold text-cg-slate-tint">Conversion Funnel</h2>
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: 'Total Leads', count: funnel.total, color: 'bg-violet-500' },
                { label: 'Contacted', count: funnel.contacted, color: 'bg-blue-500' },
                { label: 'Responded', count: funnel.responded, color: 'bg-amber-500' },
                { label: 'Converted', count: funnel.converted, color: 'bg-emerald-500' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-2 flex-1">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground mb-1">{step.label}</div>
                    <div className="text-2xl font-bold text-white">{step.count}</div>
                    <div className="mt-2 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${step.color}`}
                        style={{ width: `${Math.max(totalLeads > 0 ? (step.count / totalLeads) * 100 : 0, 2)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-cg-slate-strong mt-1">
                      {totalLeads > 0 ? `${((step.count / totalLeads) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  {i < 3 && <ArrowRight className="w-4 h-4 text-[#3A5A6A] flex-shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Source Attribution */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-cg-slate-tint">Lead Source Attribution</h2>
            </div>
            {Object.keys(bySource).length === 0 ? (
              <p className="text-sm text-cg-slate-strong text-center py-6">No source data yet. Import leads with a source tag to see attribution.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Object.entries(bySource)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .map(([source, count]: any) => {
                    const pct = totalLeads > 0 ? ((count / totalLeads) * 100).toFixed(1) : '0';
                    const colors = SOURCE_COLORS[source] || SOURCE_COLORS.manual;
                    return (
                      <div key={source} className={`rounded-lg border p-3 ${colors}`}>
                        <div className="text-lg font-bold">{count}</div>
                        <div className="text-xs capitalize">{source.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] opacity-70">{pct}% of total</div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Campaign Performance */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-cg-slate-tint">Campaign Performance</h2>
            </div>
            {sentCampaigns.length === 0 ? (
              <p className="text-sm text-cg-slate-strong text-center py-6">No campaigns sent yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-cg-slate/20">
                      <th className="text-left pb-2 font-medium">Campaign</th>
                      <th className="text-right pb-2 font-medium">Status</th>
                      <th className="text-right pb-2 font-medium">Sent</th>
                      <th className="text-right pb-2 font-medium">Open Rate</th>
                      <th className="text-right pb-2 font-medium">Click Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sentCampaigns.map(c => {
                      const stats = c.stats_json?.results?.[0]?.stats || {};
                      const delivered = stats.delivered || 0;
                      const opens = stats.unique_opens || stats.opens || 0;
                      const clicks = stats.unique_clicks || stats.clicks || 0;
                      const openRate = delivered > 0 ? ((opens / delivered) * 100).toFixed(1) : '—';
                      const clickRate = delivered > 0 ? ((clicks / delivered) * 100).toFixed(1) : '—';
                      return (
                        <tr key={c.id} className="border-b border-cg-slate/10 last:border-0">
                          <td className="py-2 text-white">{c.name}</td>
                          <td className="py-2 text-right">
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">{c.status}</span>
                          </td>
                          <td className="py-2 text-right text-cg-slate-muted">{c.sent_at ? new Date(c.sent_at).toLocaleDateString() : '—'}</td>
                          <td className="py-2 text-right text-cg-slate-tint font-medium">{openRate}{openRate !== '—' ? '%' : ''}</td>
                          <td className="py-2 text-right text-cg-slate-tint font-medium">{clickRate}{clickRate !== '—' ? '%' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Landing Page Performance */}
          <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-cg-slate-tint">Landing Page Performance</h2>
            </div>
            {landingPages.length === 0 ? (
              <p className="text-sm text-cg-slate-strong text-center py-6">No landing pages created yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground border-b border-cg-slate/20">
                      <th className="text-left pb-2 font-medium">Page</th>
                      <th className="text-left pb-2 font-medium">Audience</th>
                      <th className="text-left pb-2 font-medium">Status</th>
                      <th className="text-right pb-2 font-medium">Views</th>
                      <th className="text-right pb-2 font-medium">UTM Campaign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {landingPages.map(lp => (
                      <tr key={lp.id} className="border-b border-cg-slate/10 last:border-0">
                        <td className="py-2">
                          <div className="text-white">{lp.title}</div>
                          <div className="text-[11px] text-muted-foreground">/lp/{lp.slug}</div>
                        </td>
                        <td className="py-2 text-cg-slate-muted text-xs capitalize">{lp.target_audience}</td>
                        <td className="py-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            lp.status === 'published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-700/50 text-cg-slate-muted'
                          }`}>{lp.status}</span>
                        </td>
                        <td className="py-2 text-right text-cg-slate-tint font-medium">{(lp.view_count || 0).toLocaleString()}</td>
                        <td className="py-2 text-right text-xs text-muted-foreground">{lp.utm_campaign || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Conversions */}
          {pipeline?.recent_conversions?.length > 0 && (
            <div className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-cg-slate-tint">Recent Conversions</h2>
              </div>
              <div className="space-y-2">
                {pipeline.recent_conversions.map((conv: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <span className="text-white">{conv.email}</span>
                      <span className={`ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${SOURCE_COLORS[conv.source] || SOURCE_COLORS.manual}`}>
                        {conv.source}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {conv.converted_at ? new Date(conv.converted_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string;
}) {
  const colorMap: Record<string, string> = {
    violet: 'from-cg-sage/20 to-cg-sage/5 border-cg-sage/20',
    emerald: 'from-cg-sage/20 to-cg-sage/5 border-cg-sage/20',
    blue: 'from-cg-slate/20 to-cg-slate/5 border-cg-slate/20',
    cyan: 'from-cyan-600/20 to-cyan-600/5 border-cyan-500/20',
  };
  const iconMap: Record<string, string> = {
    violet: 'text-cg-sage', emerald: 'text-emerald-400',
    blue: 'text-blue-400', cyan: 'text-cyan-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colorMap[color]} border rounded-xl p-4`}>
      <Icon className={`w-5 h-5 ${iconMap[color]} mb-2`} />
      <div className="text-2xl font-bold text-white tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
