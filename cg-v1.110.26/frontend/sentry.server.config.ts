import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || "development",
  release: `commonground-frontend@${process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0"}`,

  // Performance: sample 20% in prod
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Don't send from local development
  enabled: process.env.NODE_ENV === "production",
});
