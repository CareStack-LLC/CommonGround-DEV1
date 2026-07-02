import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.daily.co https://unpkg.com https://cdnjs.cloudflare.com https://www.youtube.com https://s.ytimg.com https://js.stripe.com https://www.googletagmanager.com blob:",  // Next.js + Daily.co SDK + PDF.js + YouTube + Stripe + GA (unsafe-eval removed)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // Tailwind + Google Fonts
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",  // Google Fonts
      "connect-src 'self' http://localhost:8000 ws://localhost:8000 wss://*.daily.co https://*.daily.co https://commonground-api-a0fr.onrender.com https://*.onrender.com wss://*.onrender.com https://unpkg.com https://cdnjs.cloudflare.com https://*.stripe.com https://*.supabase.co wss://*.supabase.co https://*.mapbox.com https://api.mapbox.com https://events.mapbox.com https://*.ingest.us.sentry.io https://*.google-analytics.com https://*.analytics.google.com https://analytics.google.com https://www.googletagmanager.com https://www.google.com https://stats.g.doubleclick.net",  // Backend API + Daily.co + CDNs + Stripe + Supabase + WebSocket + Mapbox + Sentry + GA (including GA4 collection endpoints + bare domain)
      "frame-src 'self' https://*.daily.co https://www.youtube.com https://www.youtube-nocookie.com https://js.stripe.com https://*.stripe.com",  // Allow Daily.co video iframe + YouTube + Stripe 3D Secure
      "media-src 'self' https://*.daily.co blob:",  // Allow media from Daily.co
      "worker-src 'self' blob:",  // PDF.js worker
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self "https://*.daily.co"), microphone=(self "https://*.daily.co"), geolocation=()'  // Allow camera/mic for Daily.co
  }
];

const nextConfig: NextConfig = {
  compiler: {
    // Strip console.log from production bundles; keep error/warn for real diagnostics.
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async redirects() {
    return [
      { source: '/superadmin/activity-log', destination: '/superadmin/users?tab=activity', permanent: true },
      { source: '/superadmin/performance', destination: '/superadmin/system-health?tab=api', permanent: true },
      { source: '/superadmin/status', destination: '/superadmin/system-health', permanent: true },
      { source: '/superadmin/kidspace', destination: '/superadmin/growth?tab=kidspace', permanent: true },
      { source: '/superadmin/kidspace/media', destination: '/superadmin/media-library', permanent: true },
      { source: '/superadmin/reports', destination: '/superadmin/billing?tab=reports', permanent: true },
      { source: '/superadmin/leads/analytics', destination: '/superadmin/leads?tab=analytics', permanent: true },
      {
        source: '/demo/walkthrough',
        destination: '/walkthrough',
        permanent: true,
      },
      // /team and /press were placeholder pages removed 2026-06; both were
      // in the sitemap, so redirect permanently until real content exists.
      { source: '/team', destination: '/about', permanent: true },
      { source: '/press', destination: '/about', permanent: true },
      // /testimonials hidden 2026-06 — temporary redirect so it's easy to
      // restore (page content is kept in the repo, just unreachable).
      { source: '/testimonials', destination: '/', permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  /* ── Performance: tree-shake barrel imports ──────────────────────── */
  experimental: {
    optimizePackageImports: [
      'lucide-react',       // Icon library — only bundle icons actually used
      '@supabase/supabase-js',
    ],
  },
  images: {
    /* Serve modern formats (AVIF > WebP) to reduce image payload */
    formats: ['image/avif', 'image/webp'],
    /* Size hints for responsive images — matches common breakpoints */
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    /* Increase quality for hero images while keeping compression */
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        port: '',
        pathname: '/storage/v1/object/public/**',
      }
    ],
  },
  // Turbopack config (Next.js 16+ default)
  turbopack: {
    resolveAlias: {
      // Handle PDF.js canvas dependency
      canvas: { browser: '' },
      // Force React resolution to local instance to avoid duplicates from parent directory
      react: './node_modules/react',
      'react-dom': './node_modules/react-dom',
    },
  },
  // Keep webpack config for fallback
  webpack: (config) => {
    config.resolve.alias.canvas = false;

    // Force React to resolve to local instance
    const path = require('path');
    config.resolve.alias['react'] = path.resolve(__dirname, 'node_modules/react');
    config.resolve.alias['react-dom'] = path.resolve(__dirname, 'node_modules/react-dom');

    return config;
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload warnings in CI
  silent: true,
  // Disable source map upload (no auth token configured yet)
  sourcemaps: {
    disable: true,
  },
});
