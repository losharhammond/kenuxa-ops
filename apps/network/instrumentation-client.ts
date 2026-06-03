/**
 * KENUXA — Sentry Client Configuration
 * Error monitoring and performance observability for production.
 */
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment tagging
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  release:     process.env.NEXT_PUBLIC_APP_VERSION,

  // Capture 10% of sessions for performance monitoring (Tracing)
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Replay: 1% all sessions, 100% sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out known noise
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "Network Error",
    "AbortError",
    /extensions\//i,
    /^chrome:\/\//i,
  ],

  // Never log to console in production
  debug: false,
});

// Required for Next.js navigation instrumentation
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
