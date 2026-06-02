/**
 * KENUXA — Sentry Server Configuration
 * Server-side error monitoring: API routes, server components, cron jobs.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  release:     process.env.NEXT_PUBLIC_APP_VERSION,

  // Lower sample rate on server — high volume
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  // Tag all server errors with context
  initialScope: {
    tags: {
      platform: "kenuxa-network",
      service:  "server",
    },
  },

  debug: false,
});
