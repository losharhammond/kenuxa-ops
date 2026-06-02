import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const isDocker = process.env.DOCKER_BUILD === "1";

// ── Security Headers ────────────────────────────────────────────────────────
const securityHeaders = [
  { key: "X-Content-Type-Options",        value: "nosniff" },
  { key: "X-Frame-Options",               value: "SAMEORIGIN" },
  { key: "Strict-Transport-Security",     value: "max-age=31536000; includeSubDomains; preload" },
  { key: "X-DNS-Prefetch-Control",        value: "on" },
  { key: "Referrer-Policy",               value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=(self)",
      "interest-cohort=()",
      "payment=(self)",
    ].join(", "),
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Paystack checkout script + Sentry reporting
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co https://checkout.paystack.com https://browser.sentry-cdn.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://avatars.githubusercontent.com https://flagcdn.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in https://api.paystack.co https://checkout.paystack.com https://api.groq.com https://openexchangerates.org https://api.exchangerate-api.com https://*.ingest.sentry.io",
      "frame-src 'self' https://checkout.paystack.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
  experimental: {
    typedRoutes: false,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  ...(isDocker ? { output: "standalone" } : {}),
};

// Sentry configuration — only active in production or when DSN is set
const sentryWebpackPluginOptions = {
  org:     process.env.SENTRY_ORG     ?? "kenuxa",
  project: process.env.SENTRY_PROJECT ?? "kenuxa-network",
  silent:  true, // suppress logs during builds
  // Upload source maps in production only
  widenClientFileUpload: true,
  transpileClientSDK:    true,
  tunnelRoute:           "/monitoring",
  hideSourceMaps:        true,
  disableLogger:         true,
  automaticVercelMonitors: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
