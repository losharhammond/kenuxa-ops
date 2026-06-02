"use client";
/**
 * KENUXA — Global Error Boundary
 * Catches React rendering errors in the App Router and reports to Sentry.
 * Required for Sentry to capture RSC render errors in production.
 */
import * as Sentry from "@sentry/nextjs";
import NextError from "next/error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        {/* Render the default Next.js error page for consistent error UX */}
        <NextError statusCode={0} />
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0d0f1a",
            border: "1px solid rgba(255,101,36,0.3)",
            borderRadius: 12,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "#94a3b8", fontSize: 13 }}>Something went wrong.</span>
          <button
            onClick={reset}
            style={{
              background: "linear-gradient(to right, #FF6524, #F59E0B)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
