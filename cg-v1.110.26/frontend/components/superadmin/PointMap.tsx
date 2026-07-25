'use client';

/**
 * Scatter map of lat/lng points with status-coded colors.
 *
 * Used by the superadmin geo page to visualize custody exchange check-in
 * locations. Keeps rendering simple — no clustering layer, relies on
 * Mapbox's native performance for up to ~5k markers.
 */

import { useMemo } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertTriangle } from 'lucide-react';
import { US_CENTER } from './_us-states';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

interface Point {
  lat: number;
  lng: number;
  status?: string;
  at?: string | null;
}

interface Props {
  points: Point[];
  height?: number;
  /** Pre-computed color-by-status map (e.g. {completed: 'var(--cg-sage)', disputed: 'var(--cg-error)'}). */
  statusColors?: Record<string, string>;
  label?: string;
}

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  completed: 'var(--cg-sage)',
  disputed: 'var(--cg-error)',
  scheduled: 'var(--cg-slate-light)',
  cancelled: 'var(--muted-foreground)',
  unknown: 'var(--cg-slate-muted)',
};

export function PointMap({
  points,
  height = 480,
  statusColors,
  label = 'points',
}: Props) {
  const colors = useMemo(
    () => ({ ...DEFAULT_STATUS_COLORS, ...(statusColors || {}) }),
    [statusColors],
  );

  const byStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of points) {
      const s = p.status || 'unknown';
      map[s] = (map[s] || 0) + 1;
    }
    return map;
  }, [points]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
        style={{ height }}
      >
        <AlertTriangle className="w-6 h-6 text-amber-400" />
        <div className="text-sm text-cg-slate-tint font-medium">Mapbox token not configured</div>
        <p className="text-xs text-cg-slate-muted max-w-md">
          Set <code className="text-cg-sage-light">NEXT_PUBLIC_MAPBOX_TOKEN</code> in the frontend env
          to enable maps.
        </p>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div
        className="bg-cg-slate-deep/60 border border-cg-slate/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
        style={{ height }}
      >
        <MapPin className="w-6 h-6 text-muted-foreground opacity-60" />
        <div className="text-sm text-cg-slate-tint font-medium">No {label} recorded in this window</div>
        <p className="text-xs text-cg-slate-muted max-w-md">
          Check-ins without GPS coordinates (silent handoff, manual entry) aren&apos;t plotted here.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative bg-cg-ink border border-cg-slate/20 rounded-xl overflow-hidden"
      style={{ height }}
    >
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: US_CENTER.lng,
          latitude: US_CENTER.lat,
          zoom: US_CENTER.zoom,
        }}
        mapStyle={MAPBOX_STYLE}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        {points.map((p, i) => {
          const color = colors[p.status || 'unknown'] || colors.unknown;
          return (
            <Marker key={i} longitude={p.lng} latitude={p.lat} anchor="center">
              <div
                className="group relative cursor-pointer"
                title={`${p.status || 'unknown'}${p.at ? ` — ${new Date(p.at).toLocaleDateString()}` : ''}`}
              >
                <div
                  className="rounded-full border transition-transform group-hover:scale-150"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: color + 'bb',
                    borderColor: color,
                  }}
                />
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Legend overlay */}
      <div className="absolute top-3 left-3 bg-cg-ink/85 backdrop-blur-md border border-cg-slate/30 rounded-lg px-3 py-2 text-[11px]">
        <div className="text-cg-slate-tint font-medium mb-1">
          {points.length.toLocaleString()} {label}
        </div>
        <div className="space-y-0.5">
          {Object.entries(byStatus)
            .sort(([, a], [, b]) => b - a)
            .map(([status, count]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: colors[status] || colors.unknown }}
                />
                <span className="text-cg-slate-muted capitalize">{status.replace(/_/g, ' ')}:</span>
                <span className="text-cg-slate-tint font-medium">{count.toLocaleString()}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
