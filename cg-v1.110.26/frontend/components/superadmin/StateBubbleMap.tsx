'use client';

/**
 * US state bubble map — one circle per state, scaled by count.
 *
 * Uses react-map-gl (Mapbox) — requires NEXT_PUBLIC_MAPBOX_TOKEN in env.
 * Centroids from `_us-states.ts`; no GeoJSON shipped (keeps bundle small).
 *
 * Empty state: when no data, renders a hint + instruction.
 */

import { useMemo } from 'react';
import Map, { Marker, NavigationControl, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertTriangle } from 'lucide-react';
import { US_CENTER, US_STATE_CENTROIDS } from './_us-states';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11';

interface Props {
  /** Map of 2-letter state code → count. States not present render no bubble. */
  counts: Record<string, number>;
  /** Label shown in the popup / legend ("users", "professionals", etc.) */
  label?: string;
  /** Fill color for bubbles (default sage). */
  color?: string;
  height?: number;
  /** Optional extra stat shown in the top-left overlay, e.g. "unknown: 42". */
  footerNote?: string;
}

export function StateBubbleMap({
  counts,
  label = 'entries',
  color = 'var(--cg-sage)',
  height = 480,
  footerNote,
}: Props) {
  const max = useMemo(
    () => Math.max(0, ...Object.values(counts)),
    [counts],
  );
  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
        style={{ height }}
      >
        <AlertTriangle className="w-6 h-6 text-amber-400" />
        <div className="text-sm text-[#D0E4EC] font-medium">Mapbox token not configured</div>
        <p className="text-xs text-[#8AACBC] max-w-md">
          Set <code className="text-cg-sage-light">NEXT_PUBLIC_MAPBOX_TOKEN</code> in the frontend env
          and redeploy to enable maps.
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div
        className="bg-[#1A3648]/60 border border-cg-slate/20 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-3"
        style={{ height }}
      >
        <MapPin className="w-6 h-6 text-muted-foreground opacity-60" />
        <div className="text-sm text-[#D0E4EC] font-medium">No {label} mapped yet</div>
        <p className="text-xs text-[#8AACBC] max-w-md">
          {label} without a recognized state code don&apos;t appear on the map.
        </p>
      </div>
    );
  }

  return (
    <div
      className="relative bg-[#0F2533] border border-cg-slate/20 rounded-xl overflow-hidden"
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
        {US_STATE_CENTROIDS.map((s) => {
          const count = counts[s.code] ?? 0;
          if (count === 0) return null;
          // Radius: sqrt-scaled from 8 → 32 px across [1, max]
          const t = Math.sqrt(count / Math.max(max, 1));
          const radius = 8 + t * 24;
          return (
            <Marker
              key={s.code}
              longitude={s.lng}
              latitude={s.lat}
              anchor="center"
            >
              <div
                className="group relative cursor-pointer"
                title={`${s.name}: ${count} ${label}`}
              >
                <div
                  className="rounded-full border-2 transition-transform group-hover:scale-125"
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    backgroundColor: color + '55',
                    borderColor: color,
                  }}
                />
                <div className="absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap bg-[#0F2533]/95 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded border border-cg-slate/30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {s.name}: {count.toLocaleString()}
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Overlay stats */}
      <div className="absolute top-3 left-3 bg-[#0F2533]/85 backdrop-blur-md border border-cg-slate/30 rounded-lg px-3 py-2 text-[11px]">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[#D0E4EC] font-medium">
            {total.toLocaleString()} {label}
          </span>
        </div>
        <div className="text-muted-foreground">
          across {Object.values(counts).filter((c) => c > 0).length} states
        </div>
        {footerNote && (
          <div className="text-muted-foreground mt-1 pt-1 border-t border-cg-slate/20">
            {footerNote}
          </div>
        )}
      </div>
    </div>
  );
}
