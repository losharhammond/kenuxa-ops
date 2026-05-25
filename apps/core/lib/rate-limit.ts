import { NextRequest } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(request: NextRequest, limit = 120, windowMs = 60_000) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }
  bucket.count += 1;
  return { limited: bucket.count > limit, remaining: Math.max(limit - bucket.count, 0) };
}
