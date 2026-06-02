/**
 * GET /api/network/stats
 * Public-safe network stats for the landing page and discover hub.
 * No sensitive data — only aggregate counts.
 * Cached 5 minutes.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 300; // 5 min ISR cache

export async function GET() {
  const supabase = await createClient();

  const [
    bizRes,
    userRes,
    jobRes,
    productRes,
    freelancerRes,
    serviceRes,
    kenuxRes,
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("job_listings").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("inventory_items").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("freelancer_profiles").select("id", { count: "exact", head: true }),
    supabase.from("service_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("rewards_accounts").select("points"),
  ]);

  const kenuxCirculation = (kenuxRes.data ?? []).reduce(
    (s, r) => s + ((r as { points: number }).points ?? 0), 0
  );

  return NextResponse.json({
    total_businesses:  bizRes.count        ?? 0,
    total_users:       userRes.count       ?? 0,
    open_jobs:         jobRes.count        ?? 0,
    total_products:    productRes.count    ?? 0,
    total_freelancers: freelancerRes.count ?? 0,
    total_services:    serviceRes.count    ?? 0,
    kenux_circulation: kenuxCirculation,
    last_updated:      new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
    },
  });
}
