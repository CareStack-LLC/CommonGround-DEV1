import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
  release: `commonground-frontend@${process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}`,

  // Performance: sample 20% in prod, 100% in dev
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Session replay: capture 10% of sessions, 100% of error sessions
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
    Sentry.browserTracingIntegration(),
    Sentry.feedbackIntegration({
      colorScheme: "system",
      showBranding: false,
      buttonLabel: "Report a Bug",
      submitButtonLabel: "Send Report",
      formTitle: "Report a Bug",
      messagePlaceholder: "What happened? What did you expect?",
    }),
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

  // Don't send from local development
  enabled: process.env.NODE_ENV === "production",
});
