import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withCache } from "@/lib/cache";

const STATS_TTL = 300; // 5 minutes

interface AdminStats {
  total_businesses:         number;
  active_businesses:        number;
  pending_verification:     number;
  total_users:              number;
  new_users_today:          number;
  new_users_7d:             number;
  open_disputes:            number;
  pending_kyc:              number;
  gmv_today:                number;
  gmv_mtd:                  number;
  total_transactions_today: number;
  total_revenue_mtd:        number;
  mrr_ghs:                  number;
  arr_ghs:                  number;
  kenux_in_circulation:     number;
  kenux_total_earned:       number;
  kenux_total_spent:        number;
  total_wallet_balance_ghs: number;
  active_loans:             number;
  total_loan_book_ghs:      number;
  // Role-specific counts
  total_customers:          number;
  total_freelancers:        number;
  total_suppliers:          number;
  total_job_seekers:        number;
  total_financial_partners: number;
  total_delivery_riders:    number;
  total_recruiters:         number;
  total_business_owners:    number;
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

  if (!profile || !["super_admin", "country_admin"].includes(
    (profile as { role?: string } | null)?.role ?? ""
  )) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO    = today.toISOString();
  const weekAgoISO  = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthStart  = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
  const cacheKey    = `admin:stats:${todayISO.slice(0, 10)}`;

  const stats = await withCache<AdminStats>(cacheKey, STATS_TTL, async () => {
    const [
      bizRes,
      usersRes,
      newUsersRes,
      newUsers7dRes,
      disputesRes,
      kycRes,
      salesTodayRes,
      salesMtdRes,
      revenueRes,
      revenueSubs,
      kenuxRes,
      kenuxEarned,
      kenuxSpent,
      walletsRes,
      loansRes,
      customersRes,
      freelancersRes,
      suppliersRes,
      jobSeekersRes,
      financialPartnersRes,
      deliveryRidersRes,
      recruitersRes,
      businessOwnersRes,
    ] = await Promise.all([
      supabase.from("businesses").select("id, status, verification_status"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("created_at", weekAgoISO),
      supabase.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("kyc_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("sales").select("total").gte("created_at", todayISO),
      supabase.from("sales").select("total").gte("created_at", monthStart),
      supabase.from("platform_revenue").select("amount").gte("created_at", monthStart),
      supabase.from("platform_revenue").select("amount").eq("revenue_type", "subscription").gte("created_at", monthStart),
      supabase.from("rewards_accounts").select("points"),
      supabase.from("kenux_ledger").select("points").eq("entry_type", "earn"),
      supabase.from("kenux_ledger").select("points").eq("entry_type", "spend"),
      supabase.from("wallets").select("balance").eq("status", "active"),
      supabase.from("loan_applications").select("amount, status"),
      // Role-specific counts
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "freelancer"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "supplier"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "job_seeker"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "financial_partner"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "delivery_rider"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "recruiter"),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role", "business_owner"),
    ]);

    const bizData = bizRes.data ?? [];
    const salesToday = salesTodayRes.data ?? [];
    const salesMtd   = salesMtdRes.data ?? [];
    const revenue    = revenueRes.data ?? [];
    const revSubs    = revenueSubs.data ?? [];
    const loans      = loansRes.data ?? [];

    const kenuxCirc   = (kenuxRes.data ?? []).reduce((s, r) => s + ((r as { points: number }).points), 0);
    const kenuxEarnSum = (kenuxEarned.data ?? []).reduce((s, r) => s + ((r as { points: number }).points), 0);
    const kenuxSpentSum = (kenuxSpent.data ?? []).reduce((s, r) => s + ((r as { points: number }).points), 0);
    const walletTotal  = (walletsRes.data ?? []).reduce((s, r) => s + ((r as { balance: number }).balance), 0);

    const revenueTotal = revenue.reduce((s, r) => s + ((r as { amount: number }).amount), 0);
    const mrr          = revSubs.reduce((s, r) => s + ((r as { amount: number }).amount), 0);

    const activeLoans    = loans.filter((l) => (l as { status: string }).status === "active");
    const loanBookTotal  = activeLoans.reduce((s, l) => s + ((l as { amount: number }).amount), 0);

    return {
      total_businesses:         bizData.length,
      active_businesses:        bizData.filter((b) => (b as { status: string }).status === "active").length,
      pending_verification:     bizData.filter((b) => (b as { verification_status: string }).verification_status === "pending").length,
      total_users:              usersRes.count ?? 0,
      new_users_today:          newUsersRes.count ?? 0,
      new_users_7d:             newUsers7dRes.count ?? 0,
      open_disputes:            disputesRes.count ?? 0,
      pending_kyc:              kycRes.count ?? 0,
      gmv_today:                salesToday.reduce((s, r) => s + ((r as { total: number }).total ?? 0), 0),
      gmv_mtd:                  salesMtd.reduce((s, r) => s + ((r as { total: number }).total ?? 0), 0),
      total_transactions_today: salesToday.length,
      total_revenue_mtd:        revenueTotal,
      mrr_ghs:                  mrr,
      arr_ghs:                  mrr * 12,
      kenux_in_circulation:     kenuxCirc,
      kenux_total_earned:       kenuxEarnSum,
      kenux_total_spent:        kenuxSpentSum,
      total_wallet_balance_ghs: walletTotal,
      active_loans:             activeLoans.length,
      total_loan_book_ghs:      loanBookTotal,
      total_customers:          customersRes.count          ?? 0,
      total_freelancers:        freelancersRes.count        ?? 0,
      total_suppliers:          suppliersRes.count          ?? 0,
      total_job_seekers:        jobSeekersRes.count         ?? 0,
      total_financial_partners: financialPartnersRes.count  ?? 0,
      total_delivery_riders:    deliveryRidersRes.count     ?? 0,
      total_recruiters:         recruitersRes.count         ?? 0,
      total_business_owners:    businessOwnersRes.count     ?? 0,
    };
  });

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": `public, s-maxage=${STATS_TTL}, stale-while-revalidate=60`,
    },
  });
}
