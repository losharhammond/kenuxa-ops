import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "30d";

  // Resolve business_id: from query param OR from the user's profile
  let businessId = searchParams.get("business_id");
  if (!businessId) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();
    businessId = profile?.business_id ?? null;
  }
  if (!businessId) return NextResponse.json({ error: "No business found" }, { status: 404 });

  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 };
  const days = daysMap[period] ?? 30;
  const from = new Date(Date.now() - days * 86400000).toISOString();

  const [salesRes, customersRes] = await Promise.all([
    supabase
      .from("sales")
      .select("total, created_at, payment_method")
      .eq("business_id", businessId)
      .gte("created_at", from)
      .order("created_at"),
    supabase
      .from("crm_customers")
      .select("id, created_at, lifetime_value")
      .eq("business_id", businessId)
      .gte("created_at", from),
  ]);

  const sales = salesRes.data ?? [];
  const customers = customersRes.data ?? [];

  const totalRevenue  = sales.reduce((s, r) => s + (r.total ?? 0), 0);
  const totalOrders   = sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  for (const sale of sales) {
    const day = (sale.created_at as string).slice(0, 10);
    revenueByDay[day] = (revenueByDay[day] ?? 0) + (sale.total ?? 0);
  }

  // Payment mix
  const paymentMix: Record<string, number> = {};
  for (const sale of sales) {
    const m = (sale.payment_method as string) ?? "cash";
    paymentMix[m] = (paymentMix[m] ?? 0) + (sale.total ?? 0);
  }

  // Today's revenue
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const revenueToday = sales
    .filter((s) => (s.created_at as string) >= todayStart.toISOString())
    .reduce((s, r) => s + (r.total ?? 0), 0);

  // Pending invoices + low stock
  const [{ count: pendingInvoices }, { count: lowStockCount }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("status", "sent"),
    supabase
      .from("inventory_items")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .filter("stock_qty", "lte", "low_stock_threshold"),
  ]);

  return NextResponse.json({
    data: {
      revenue_today:    revenueToday,
      revenue_month:    totalRevenue,
      total_orders:     totalOrders,
      total_customers:  customers.length,
      low_stock_count:  lowStockCount ?? 0,
      pending_invoices: pendingInvoices ?? 0,
    },
    summary: { totalRevenue, totalOrders, avgOrderValue, totalCustomers: customers.length },
    revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
    paymentMix: Object.entries(paymentMix).map(([method, amount]) => ({ method, amount })),
  });
}
