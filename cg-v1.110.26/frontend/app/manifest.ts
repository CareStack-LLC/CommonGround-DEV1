import type { MetadataRoute } from 'next';

/**
 * Web app manifest — makes CommonGround installable as a standalone app
 * (Add to Home Screen) with a native feel. Served at /manifest.webmanifest.
 *
 * iOS uses the apple-touch-icon (app/apple-icon.png) for the home-screen icon
 * and the apple-mobile-web-app-* meta (set in layout via appleWebApp); Android/
 * Chrome use the icons + theme here.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CommonGround — Calm Co-Parenting',
    short_name: 'CommonGround',
    description:
      'Calm co-parenting: AI-guided messaging, a shared custody calendar, expense tracking, and safe kid communication — all in one place.',
    id: '/',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: 'var(--background)',
    theme_color: 'var(--foreground)',
    categories: ['lifestyle', 'productivity', 'parenting', 'social'],
    icons: [
      // Scalable brand mark — Chrome/Android render SVG at any size.
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      // Raster fallback (also the iOS home-screen icon).
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
