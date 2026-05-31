import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";

const STATS_TTL = 300; // 5 minutes

interface AdminStats {
  total_businesses: number;
  active_businesses: number;
  pending_verification: number;
  total_users: number;
  new_users_today: number;
  open_disputes: number;
  pending_kyc: number;
  gmv_today: number;
  total_transactions_today: number;
  total_revenue_mtd: number;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["super_admin", "country_admin", "platform_admin", "finance_admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cache key scoped to the current day so stats refresh daily even if cache
  // server is long-lived. Fine-grained invalidation via cacheDel("admin:stats")
  // can be triggered after any significant write (e.g. business approval).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();
  const cacheKey = `admin:stats:${todayISO.slice(0, 10)}`;

  const stats = await withCache<AdminStats>(cacheKey, STATS_TTL, async () => {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const [
      bizRes,
      usersRes,
      disputesRes,
      kycRes,
      newUsersRes,
      salesTodayRes,
      salesMtdRes,
    ] = await Promise.all([
      supabase.from("businesses").select("id, status"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }),
      supabase.from("business_disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("sales").select("total, id").gte("created_at", todayISO),
      supabase.from("sales").select("total").gte("created_at", monthStart),
    ]);

    const bizData = bizRes.data ?? [];
    const salesToday = salesTodayRes.data ?? [];

    return {
      total_businesses:        bizData.length,
      active_businesses:       bizData.filter((b) => b.status === "active").length,
      pending_verification:    bizData.filter((b) => b.status === "pending").length,
      total_users:             usersRes.count ?? 0,
      new_users_today:         newUsersRes.count ?? 0,
      open_disputes:           disputesRes.count ?? 0,
      pending_kyc:             kycRes.count ?? 0,
      gmv_today:               salesToday.reduce((s, r) => s + (r.total ?? 0), 0),
      total_transactions_today: salesToday.length,
      total_revenue_mtd:       (salesMtdRes.data ?? []).reduce((s, r) => s + (r.total ?? 0), 0),
    };
  });

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": `public, s-maxage=${STATS_TTL}, stale-while-revalidate=60`,
    },
  });
}
