import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.daily.co https://unpkg.com https://cdnjs.cloudflare.com https://www.youtube.com https://s.ytimg.com blob:",  // Next.js + Daily.co SDK + PDF.js + YouTube
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",  // Tailwind + Google Fonts
      "img-src 'self' data: https: blob:",
      "font-src 'self' https://fonts.gstatic.com",  // Google Fonts
      "connect-src 'self' http://localhost:8000 ws://localhost:8000 wss://*.daily.co https://*.daily.co https://commonground-api-gdxg.onrender.com https://*.onrender.com https://unpkg.com https://cdnjs.cloudflare.com",  // Backend API + Daily.co + CDNs
      "frame-src 'self' https://*.daily.co https://www.youtube.com https://www.youtube-nocookie.com",  // Allow Daily.co video iframe + YouTube
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
    key: 'Permissions-Policy',
    value: 'camera=(self "https://*.daily.co"), microphone=(self "https://*.daily.co"), geolocation=()'  // Allow camera/mic for Daily.co
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // Turbopack config (Next.js 16+ default)
  turbopack: {
    resolveAlias: {
      // Handle PDF.js canvas dependency
      canvas: { browser: '' },
    },
  },
  // Keep webpack config for fallback
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
