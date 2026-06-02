/**
 * KENUXA — Next.js Instrumentation
 * Wires Sentry for both Node.js server and Edge runtime.
 * Called once when the Next.js server starts.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Capture errors from nested React Server Components.
 * Required for Sentry to report RSC render errors in production.
 */
export const onRequestError = Sentry.captureRequestError;
