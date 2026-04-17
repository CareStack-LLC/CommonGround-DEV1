'use client';

/**
 * Superadmin geospatial page.
 *
 * Three views, one endpoint:
 *   - Users: bubble map of UserProfile.state aggregation
 *   - Professionals: bubble map of ProfessionalProfile.state aggregation
 *   - Exchanges: scatter of recent CustodyExchangeInstance GPS check-ins
 *
 * Data source: GET /admin/stats/geo.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Globe, Users as UsersIcon, Briefcase, MapPin, RefreshCw,
} from 'lucide-react';
import { adminAPI } from '@/lib/admin-api';
import {
  PageHeader, ErrorState, TabBar, useTabState,
  StateBubbleMap, PointMap,
} from '@/components/superadmin';

interface GeoStats {
  users_by_state: Record<string, number>;
  users_unknown_state_count: number;
  total_users_geotagged: number;
  professionals_by_state: Record<string, number>;
  professionals_unknown_state_count: number;
  total_professionals_geotagged: number;
  exchange_points: Array<{ lat: number; lng: number; status: string; at: string | null }>;
  exchange_point_count: number;
  exchange_window_days: number;
  generated_at: string;
}

export default function GeoPage() {
  const [tab, setTab] = useTabState('users');
  const [exchangeDays, setExchangeDays] = useState(30);
  const [data, setData] = useState<GeoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await adminAPI.getGeoStats(exchangeDays, 1000);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load geo stats');
    } finally {
      setLoading(false);
    }
  }, [exchangeDays]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geospatial Overview"
        subtitle="Users, professionals, and exchange activity by location."
        onRefresh={fetchData}
        loading={loading}
      />

      <TabBar
        tabs={[
          { key: 'users', label: 'Users by State', icon: UsersIcon },
          { key: 'professionals', label: 'Professionals', icon: Briefcase },
          { key: 'exchanges', label: 'Exchange Check-ins', icon: MapPin },
        ]}
        activeTab={tab}
        onTabChange={setTab}
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {!error && (
        <>
          {tab === 'users' && (
            <div className="space-y-4">
              <StateBubbleMap
                counts={data?.users_by_state ?? {}}
                label="users"
                color="#3DAA8A"
                height={520}
                footerNote={
                  (data?.users_unknown_state_count ?? 0) > 0
                    ? `${data?.users_unknown_state_count} users without recognized state`
                    : undefined
                }
              />
              <TopStatesTable
                counts={data?.users_by_state ?? {}}
                label="users"
                color="#3DAA8A"
              />
            </div>
          )}

          {tab === 'professionals' && (
            <div className="space-y-4">
              <StateBubbleMap
                counts={data?.professionals_by_state ?? {}}
                label="professionals"
                color="#4BA8C8"
                height={520}
                footerNote={
                  (data?.professionals_unknown_state_count ?? 0) > 0
                    ? `${data?.professionals_unknown_state_count} without recognized state`
                    : undefined
                }
              />
              <TopStatesTable
                counts={data?.professionals_by_state ?? {}}
                label="professionals"
                color="#4BA8C8"
              />
            </div>
          )}

          {tab === 'exchanges' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[#6B8A9A]">Window:</span>
                {[7, 14, 30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setExchangeDays(d)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                      exchangeDays === d
                        ? 'bg-[#3DAA8A] text-white'
                        : 'bg-[#1A3648]/60 text-[#8AACBC] hover:text-white border border-[#2D6A8F]/20'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <PointMap
                points={data?.exchange_points ?? []}
                label="check-ins"
                height={520}
              />
              <p className="text-[11px] text-[#6B8A9A]">
                Showing last {data?.exchange_window_days ?? exchangeDays} days of custody-exchange
                GPS check-ins. Silent handoffs and manual check-ins without coordinates
                aren&apos;t plotted.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Small helper — top 10 states table beneath the map. */
function TopStatesTable({
  counts, label, color,
}: { counts: Record<string, number>; label: string; color: string }) {
  const entries = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  const total = entries.reduce((s, [, c]) => s + c, 0);
  if (entries.length === 0) return null;

  return (
    <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[#D0E4EC] mb-3 flex items-center gap-2">
        <Globe className="w-3.5 h-3.5 text-[#6B8A9A]" />
        Top 10 states by {label}
      </h3>
      <div className="space-y-1.5">
        {entries.map(([state, count]) => {
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div key={state} className="flex items-center gap-3 text-xs">
              <span className="w-10 font-mono text-[#8AACBC]">{state}</span>
              <div className="flex-1 h-1.5 bg-[#0F2533] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <span className="w-20 text-right text-[#D0E4EC] font-medium">
                {count.toLocaleString()}
              </span>
              <span className="w-12 text-right text-[#6B8A9A]">
                {pct.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
