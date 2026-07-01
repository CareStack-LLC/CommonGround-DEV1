'use client';

import { useMemo, useCallback } from 'react';
import Map, { Source, Layer, Marker, NavigationControl } from 'react-map-gl/mapbox';
import type { FillLayer, LineLayer } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox public token from environment
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface ParentPosition {
  lat: number;
  lng: number;
  name: string;
  inGeofence: boolean;
}

interface GeofenceMapProps {
  center: { lat: number; lng: number };
  radiusMeters: number;
  parentPositions?: ParentPosition[];
  height?: string;
  interactive?: boolean;
}

/**
 * Generate a GeoJSON circle polygon from a center point and radius.
 * Uses the Haversine-derived offset to compute circle points at the given latitude.
 */
function createGeoJSONCircle(center: { lat: number; lng: number }, radiusMeters: number, points: number = 64) {
  const coords: [number, number][] = [];
  const earthRadius = 6371000; // meters
  const latRad = (center.lat * Math.PI) / 180;

  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dLat = (radiusMeters * Math.cos(angle)) / earthRadius;
    const dLng = (radiusMeters * Math.sin(angle)) / (earthRadius * Math.cos(latRad));

    coords.push([
      center.lng + (dLng * 180) / Math.PI,
      center.lat + (dLat * 180) / Math.PI,
    ]);
  }

  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [coords],
    },
    properties: {},
  };
}

/**
 * Calculate the appropriate zoom level based on geofence radius.
 */
function getZoomForRadius(radiusMeters: number): number {
  // Approximate zoom levels for different radii
  if (radiusMeters <= 50) return 17;
  if (radiusMeters <= 100) return 16.5;
  if (radiusMeters <= 200) return 16;
  if (radiusMeters <= 300) return 15.5;
  if (radiusMeters <= 500) return 15;
  return 14;
}

// Layer styles
const geofenceFillStyle: FillLayer = {
  id: 'geofence-fill',
  type: 'fill',
  source: 'geofence',
  paint: {
    'fill-color': '#3DAA8A',
    'fill-opacity': 0.1,
  },
};

const geofenceLineStyle: LineLayer = {
  id: 'geofence-line',
  type: 'line',
  source: 'geofence',
  paint: {
    'line-color': '#3DAA8A',
    'line-width': 2,
    'line-dasharray': [3, 2],
  },
};

/**
 * Interactive Mapbox map showing a geofence boundary and optional parent positions.
 * Used in the check-in modal and exchange form preview.
 */
export default function GeofenceMap({
  center,
  radiusMeters,
  parentPositions = [],
  height = '200px',
  interactive = false,
}: GeofenceMapProps) {
  const circleGeoJSON = useMemo(
    () => createGeoJSONCircle(center, radiusMeters),
    [center.lat, center.lng, radiusMeters]
  );

  const zoom = useMemo(() => getZoomForRadius(radiusMeters), [radiusMeters]);

  const initialViewState = useMemo(
    () => ({
      longitude: center.lng,
      latitude: center.lat,
      zoom,
    }),
    [center.lat, center.lng, zoom]
  );

  return (
    <div style={{ height, width: '100%' }} className="rounded-lg overflow-hidden border border-border">
      <Map
        initialViewState={initialViewState}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        interactive={interactive}
        scrollZoom={interactive}
        dragPan={interactive}
        dragRotate={false}
        pitchWithRotate={false}
        touchZoomRotate={interactive}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        {interactive && <NavigationControl position="top-right" showCompass={false} />}

        {/* Geofence circle */}
        <Source id="geofence" type="geojson" data={circleGeoJSON}>
          <Layer {...geofenceFillStyle} />
          <Layer {...geofenceLineStyle} />
        </Source>

        {/* Center marker (exchange location) */}
        <Marker longitude={center.lng} latitude={center.lat} anchor="center">
          <div className="flex items-center justify-center w-6 h-6">
            <div className="w-3 h-3 bg-[#2D6A8F] rounded-full border-2 border-white shadow-md" />
          </div>
        </Marker>

        {/* Parent position markers */}
        {parentPositions.map((parent, idx) => (
          <Marker key={idx} longitude={parent.lng} latitude={parent.lat} anchor="bottom">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${
                  parent.inGeofence
                    ? 'bg-[#3DAA8A] border-2 border-[#5BC4A0]'
                    : 'bg-[#F5A623] border-2 border-[#F5A623]'
                }`}
              >
                {parent.name.charAt(0).toUpperCase()}
              </div>
              <div
                className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap shadow-sm ${
                  parent.inGeofence
                    ? 'bg-[#E8F4F0] text-[#1E3A4A]'
                    : 'bg-[#FEF7ED] text-[#E09520]'
                }`}
              >
                {parent.name.split(' ')[0]}
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
}
