/**
 * GET /api/network/activity
 * Live economic activity feed — recent transactions, joins, jobs, reviews.
 * Authenticated users only. No financial amounts shown.
 */
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (items: any[]) => items.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  const [
    newBizRes,
    newUsersRes,
    newJobsRes,
    newSalesCountRes,
    newKenuxRes,
    recentActivityRes,
  ] = await Promise.all([
    // New businesses in last 24h
    adminSupabase.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", since),
    // New users in last 24h
    adminSupabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    // New jobs posted in last 24h
    adminSupabase.from("job_listings").select("id", { count: "exact", head: true }).gte("created_at", since),
    // Sales count in last 24h
    adminSupabase.from("sales").select("id", { count: "exact", head: true }).gte("created_at", since),
    // KENUX earned in last 24h
    adminSupabase.from("kenux_ledger").select("points").eq("entry_type", "earn").gte("created_at", since),
    // User's personal activity feed
    adminSupabase.from("activity_feed")
      .select("id, type, title, body, read, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const kenuxEarned = (newKenuxRes.data ?? []).reduce(
    (s, r) => s + ((r as { points: number }).points ?? 0), 0
  );

  return NextResponse.json({
    network_24h: {
      new_businesses:  newBizRes.count   ?? 0,
      new_users:       newUsersRes.count ?? 0,
      new_jobs:        newJobsRes.count  ?? 0,
      sales_count:     newSalesCountRes.count ?? 0,
      kenux_earned:    kenuxEarned,
    },
    my_activity: recentActivityRes.data ?? [],
    fetched_at:  new Date().toISOString(),
  });
}
