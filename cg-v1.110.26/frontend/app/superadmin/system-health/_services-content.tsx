'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Database, Shield, Brain, MessageSquare, Video, Mail,
  CreditCard, MapPin, Bug, Globe, Zap, FileText, Layers,
} from 'lucide-react';
import { adminAPI, type SystemStatusResponse, type ServiceStatus } from '@/lib/admin-api';

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  ai: { label: 'AI & Intelligence', icon: Brain, color: 'text-violet-400' },
  communication: { label: 'Communication', icon: MessageSquare, color: 'text-blue-400' },
  infrastructure: { label: 'Infrastructure', icon: Database, color: 'text-emerald-400' },
  content: { label: 'Content', icon: FileText, color: 'text-amber-400' },
};

const SLUG_ICONS: Record<string, React.ElementType> = {
  database: Database,
  supabase_auth: Shield,
  claude: Brain,
  openai: Zap,
  stripe: CreditCard,
  daily: Video,
  sendgrid: Mail,
  mapbox: MapPin,
  sentry: Bug,
  gmail: Mail,
  websocket: Globe,
  blog: FileText,
  landing_pages: Layers,
};

const STATUS_CONFIG = {
  operational: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', label: 'Operational' },
  degraded: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', label: 'Degraded' },
  down: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/20', label: 'Down' },
};

function StatusDot({ status }: { status: 'operational' | 'degraded' | 'down' }) {
  const colors = {
    operational: 'bg-emerald-400',
    degraded: 'bg-amber-400',
    down: 'bg-red-400',
  };
  return (
    <span className="relative flex h-2.5 w-2.5">
      {status === 'operational' && (
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-40`} />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors[status]}`} />
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const cfg = STATUS_CONFIG[service.status];
  const StatusIcon = cfg.icon;
  const ServiceIcon = SLUG_ICONS[service.slug] || Activity;

  return (
    <div className={`bg-zinc-900/50 border ${cfg.border} rounded-xl p-4 transition-all hover:bg-zinc-900/70`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <ServiceIcon className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">{service.name}</span>
        </div>
        <StatusDot status={service.status} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
        {service.latency_ms > 0 && (
          <span className="text-[11px] text-zinc-600 ml-auto">{service.latency_ms}ms</span>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 leading-relaxed truncate" title={service.detail}>
        {service.detail}
      </p>
    </div>
  );
}

export default function ServicesContent() {
  const [data, setData] = useState<SystemStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getSystemStatus();
      setData(result);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000); // Auto-refresh every 60s
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallCfg = data ? STATUS_CONFIG[data.overall] : STATUS_CONFIG.operational;
  const OverallIcon = overallCfg.icon;

  // Group services by category
  const grouped: Record<string, ServiceStatus[]> = {};
  if (data) {
    for (const svc of data.services) {
      const cat = svc.category || 'other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(svc);
    }
  }

  const categoryOrder = ['ai', 'communication', 'infrastructure', 'content'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" />
            System Status
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {lastRefresh
              ? `Last checked ${lastRefresh.toLocaleTimeString()} \u00b7 Auto-refreshes every 60s`
              : 'Checking services...'}
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Overall Status Banner */}
      {data && (
        <div className={`${overallCfg.bg} border ${overallCfg.border} rounded-xl p-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <OverallIcon className={`w-6 h-6 ${overallCfg.color}`} />
              <div>
                <h2 className={`text-lg font-semibold ${overallCfg.color}`}>
                  {data.overall === 'operational'
                    ? 'All Systems Operational'
                    : data.overall === 'degraded'
                    ? 'Some Systems Degraded'
                    : 'Critical Systems Down'}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {data.operational} of {data.total} services operational
                  {data.down > 0 && ` \u00b7 ${data.down} down`}
                  {data.degraded > 0 && ` \u00b7 ${data.degraded} degraded`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{data.operational}</div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500">Up</div>
              </div>
              {data.degraded > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-amber-400">{data.degraded}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Degraded</div>
                </div>
              )}
              {data.down > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{data.down}</div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-500">Down</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data && (
        <div className="space-y-4">
          <div className="animate-pulse bg-zinc-800/40 rounded-xl h-24" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-zinc-800/40 rounded-xl h-28" />
            ))}
          </div>
        </div>
      )}

      {/* Service Grid by Category */}
      {data && categoryOrder.map(cat => {
        const services = grouped[cat];
        if (!services || services.length === 0) return null;
        const catCfg = CATEGORY_CONFIG[cat] || { label: cat, icon: Activity, color: 'text-zinc-400' };
        const CatIcon = catCfg.icon;

        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <CatIcon className={`w-4 h-4 ${catCfg.color}`} />
              <h3 className="text-sm font-semibold text-zinc-300">{catCfg.label}</h3>
              <span className="text-[11px] text-zinc-600">
                {services.filter(s => s.status === 'operational').length}/{services.length} operational
              </span>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {services.map(svc => (
                <ServiceCard key={svc.slug} service={svc} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
