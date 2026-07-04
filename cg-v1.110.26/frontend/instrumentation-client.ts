// Sentry client-side initialization for @sentry/nextjs v10+
// This file replaces the legacy sentry.client.config.ts convention.
// Next.js automatically loads this file in the browser runtime.

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
  release: `commonground-frontend@${process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}`,

  // Performance: sample 20% in prod, 100% in dev
  tracesSampleRate: isProduction ? 0.2 : 1.0,

  // Session replay: capture 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only the lightweight page-load tracing loads eagerly. Session Replay is
  // the heaviest client integration (it continuously records the DOM) — it
  // was adding ~seconds of main-thread blocking (TBT) that also delayed LCP
  // on the marketing pages. It's added after the browser goes idle instead
  // (see below): error capture and tracing work immediately; replay attaches
  // a moment later with no UX loss. The Feedback widget was removed entirely.
  integrations: [
    Sentry.browserTracingIntegration(),
  ],

  // Filter noise
  beforeSend(event) {
    // Don't send ResizeObserver loop errors (browser noise)
    if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
      return null;
    }
    return event;
  },

  // Ignore common non-actionable errors
  ignoreErrors: [
    "ResizeObserver loop",
    "ResizeObserver loop completed with undelivered notifications",
    "Non-Error promise rejection captured",
    "AbortError",
    "Network request failed",
    "Load failed",
    "Failed to fetch",
    // Chrome extension errors
    /^chrome-extension:\/\//,
  ],

  // Enable in all environments — error tracking only sends when DSN is configured.
  enabled: true,
});

// Defer the heavy Session Replay integration until the browser is idle, so it
// doesn't block hydration / delay LCP on first paint. Replay still samples 10%
// of sessions and 100% of error sessions — it just attaches a beat after the
// page is interactive.
function addDeferredSentryIntegrations() {
  try {
    Sentry.addIntegration(
      Sentry.replayIntegration({ maskAllText: true, blockAllMedia: false })
    );
  } catch {
    /* non-fatal: monitoring enrichment only */
  }
}

if (typeof window !== "undefined") {
  const schedule = (cb: () => void) => {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(cb, { timeout: 5000 });
    } else {
      window.setTimeout(cb, 2500);
    }
  };
  if (document.readyState === "complete") {
    schedule(addDeferredSentryIntegrations);
  } else {
    window.addEventListener("load", () => schedule(addDeferredSentryIntegrations), {
      once: true,
    });
  }
}

// Required by @sentry/nextjs v10 to instrument client-side navigations
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
