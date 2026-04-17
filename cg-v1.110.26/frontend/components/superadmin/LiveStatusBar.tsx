'use client';

/**
 * Sticky bottom status bar — live platform vitals for any /superadmin page.
 *
 * Polls:
 *   - getPlatformHealth() every 20s → active_sessions + errors_24h + status
 *   - listAlertHistory({open_only: true, page_size: 1}) every 60s → firing count
 *
 * Fields not surfaced by backend today (error_rate_5m, db_latency_ms) render
 * as "—" with clear hook-point comments so a future backend update drops in.
 *
 * 36px tall, fixed at the bottom. Pages should include pb-9 on their main
 * content to avoid being hidden behind it (the superadmin layout handles
 * this).
 */

import { useEffect, useState } from 'react';
import { Radio, AlertCircle, Activity, Database, Users as UsersIcon } from 'lucide-react';
import { adminAPI, type PlatformHealth } from '@/lib/admin-api';
import { timeAgo } from './helpers';

export function LiveStatusBar() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [firing, setFiring] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  // Platform health — 20s
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const h = await adminAPI.getPlatformHealth();
        if (!cancelled) {
          setHealth(h);
          setLastCheck(new Date().toISOString());
        }
      } catch {
        // transient network — keep previous values
      }
    };
    tick();
    const handle = setInterval(tick, 20_000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, []);

  // Firing alerts — 60s (lighter polling to keep request count low)
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await adminAPI.listAlertHistory({ open_only: true, page_size: 1 });
        if (!cancelled) setFiring(result.total);
      } catch {
        // alert endpoint might not exist pre-migration — no-op
      }
    };
    tick();
    const handle = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, []);

  // Color for the pulse dot matching the layout header's healthColor logic
  const healthColor =
    health?.status === 'healthy'
      ? 'bg-[#3DAA8A]'
      : health?.status === 'degraded'
        ? 'bg-[#F5A623]'
        : health?.status === 'critical'
          ? 'bg-red-500'
          : 'bg-[#4A6E7F]';

  const firingColor = (firing ?? 0) > 0 ? 'text-red-400' : 'text-[#D0E4EC]';

  // NOTE: PlatformHealth doesn't carry error_rate_5m or db_latency_ms today;
  // these render "—". Hook point: extend the backend's platform-health
  // endpoint to surface those and replace the "—" below.
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 h-9 bg-[#0F2533]/95 backdrop-blur-md border-t border-[#2D6A8F]/20 flex items-center px-4 text-xs">
      <div className="flex items-center gap-2 mr-4">
        <div className={`relative flex items-center justify-center w-2 h-2`}>
          <span className={`absolute inline-flex h-full w-full rounded-full ${healthColor} ${health?.status === 'healthy' ? 'animate-pulse' : ''} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${healthColor}`} />
        </div>
        <Radio className="w-3 h-3 text-[#5BC4A0]" />
        <span className="text-[#5BC4A0]/90 font-medium">Live</span>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 mr-4 text-[#8AACBC]">
        <UsersIcon className="w-3 h-3" />
        <span>Online admins:</span>
        <span className="text-white font-medium">
          {health?.active_sessions ?? '—'}
        </span>
      </div>

      <div className="hidden md:flex items-center gap-1.5 mr-4 text-[#8AACBC]">
        <Activity className="w-3 h-3" />
        <span>Error rate (5m):</span>
        <span className="text-white font-medium">—</span>
        {/* Hook point: once backend exposes error_rate_5m_pct on PlatformHealth, render it here. */}
      </div>

      <div className="flex items-center gap-1.5 mr-4">
        <AlertCircle className={`w-3 h-3 ${firingColor}`} />
        <span className="text-[#8AACBC]">Alerts firing:</span>
        <span className={`font-medium ${firingColor}`}>
          {firing ?? '—'}
        </span>
      </div>

      <div className="hidden lg:flex items-center gap-1.5 mr-4 text-[#8AACBC]">
        <Database className="w-3 h-3" />
        <span>DB latency:</span>
        <span className="text-white font-medium">—</span>
        {/* Hook point: once backend exposes db_latency_ms on PlatformHealth, render it here. */}
      </div>

      <div className="flex-1" />

      <div className="hidden sm:block text-[#6B8A9A]">
        Checked {timeAgo(lastCheck)}
      </div>
    </div>
  );
}
