import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const start = Date.now();
  const checks: Record<string, { status: "ok" | "error"; latency_ms?: number | undefined; detail?: string | undefined }> = {};

  // ── Database ping ────────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await supabase.from("user_profiles").select("id", { count: "exact", head: true });
    checks.database = { status: "ok", latency_ms: Date.now() - dbStart };
  } catch (e) {
    checks.database = { status: "error", detail: String(e), latency_ms: Date.now() - dbStart };
  }

  // ── Exchange rates freshness ─────────────────────────────────
  try {
    const { data } = await supabase
      .from("exchange_rates")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();
    const ageHours = data
      ? (Date.now() - new Date(data.fetched_at).getTime()) / 3600000
      : 999;
    checks.exchange_rates = {
      status: ageHours < 3 ? "ok" : "error",
      detail: ageHours < 3 ? `${ageHours.toFixed(1)}h ago` : `Stale: ${ageHours.toFixed(1)}h ago`,
    };
  } catch {
    checks.exchange_rates = { status: "error", detail: "Table not found" };
  }

  // ── Environment config ───────────────────────────────────────
  checks.config = {
    status:
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.PAYSTACK_SECRET_KEY
        ? "ok"
        : "error",
    detail: !process.env.PAYSTACK_SECRET_KEY ? "PAYSTACK_SECRET_KEY missing" : undefined,
  };

  const allOk = Object.values(checks).every((c) => c.status === "ok");
  const httpStatus = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status:      allOk ? "healthy" : "degraded",
      service:     "kenuxa-network",
      version:     process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
      environment: process.env.NODE_ENV,
      timestamp:   new Date().toISOString(),
      latency_ms:  Date.now() - start,
      checks,
    },
    { status: httpStatus }
  );
}
