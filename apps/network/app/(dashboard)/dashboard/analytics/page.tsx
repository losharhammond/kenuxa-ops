"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import { createClient } from "@/lib/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, ShoppingBag, BarChart2, TrendingUp, Download } from "lucide-react";

interface SaleRow {
  total: number;
  payment_method: string;
  created_at: string;
  items: unknown;
}

interface TooltipProps { active?: boolean; payload?: Array<{ value: number }>; label?: string; }
const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#111624] border border-white/10 rounded-lg p-3 text-xs">
      <p className="text-[#64748b] mb-1">{label}</p>
      <p className="text-[#f1f5f9] font-semibold">{formatCurrency(payload[0]?.value ?? 0)}</p>
    </div>
  );
};

const PAYMENT_COLORS: Record<string, string> = {
  cash: "#10b981",
  mtn_momo: "#F59E0B",
  telecel_cash: "#f97316",
  at_money: "#8B5CF6",
  visa: "#3B82F6",
  mastercard: "#ef4444",
  bank_transfer: "#a78bfa",
  wallet: "#FF8B5E",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  at_money: "AT Money",
  visa: "Visa",
  mastercard: "Mastercard",
  bank_transfer: "Bank Transfer",
  wallet: "KENUXA Wallet",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AnalyticsPage() {
  const { profile } = useAuth();
  useRoleGuard("analytics.view");
  const supabase = createClient();
  const [range, setRange] = useState("30");
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.business_id) return;
    setLoading(true);
    try {
      const daysAgo = parseInt(range, 10);
      const since = new Date(Date.now() - daysAgo * 86400_000).toISOString();
      const { data } = await supabase
        .from("sales")
        .select("total, payment_method, created_at, items")
        .eq("business_id", profile.business_id)
        .gte("created_at", since)
        .order("created_at");
      setSales(data ?? []);
    } finally {
      setLoading(false);
    }
  }, [profile?.business_id, range]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Aggregate monthly revenue
  const monthlyMap: Record<string, number> = {};
  sales.forEach((s) => {
    const d = new Date(s.created_at);
    const key = MONTH_NAMES[d.getMonth()] ?? "";
    if (key) monthlyMap[key] = (monthlyMap[key] ?? 0) + s.total;
  });
  const revenueData = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue }));

  // Daily sales by day of week
  const dailyMap: Record<number, number> = {};
  sales.forEach((s) => {
    const d = new Date(s.created_at).getDay();
    dailyMap[d] = (dailyMap[d] ?? 0) + s.total;
  });
  const dailyData = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    day: DAY_NAMES[d],
    sales: dailyMap[d] ?? 0,
  }));

  // Payment mix
  const paymentMap: Record<string, number> = {};
  sales.forEach((s) => {
    const m = s.payment_method ?? "cash";
    paymentMap[m] = (paymentMap[m] ?? 0) + s.total;
  });
  const totalPayments = Object.values(paymentMap).reduce((a, b) => a + b, 0) || 1;
  const paymentMix = Object.entries(paymentMap)
    .map(([name, value]) => ({
      name: PAYMENT_LABELS[name] ?? name,
      value: Math.round((value / totalPayments) * 100),
      color: PAYMENT_COLORS[name] ?? "#64748b",
    }))
    .sort((a, b) => b.value - a.value);

  // Top products
  const productMap: Record<string, { sold: number; revenue: number }> = {};
  sales.forEach((s) => {
    const items = Array.isArray(s.items) ? s.items : [];
    items.forEach((it: { name?: string; qty?: number; total?: number }) => {
      if (!it.name) return;
      const entry = productMap[it.name];
      if (!entry) { productMap[it.name] = { sold: it.qty ?? 1, revenue: it.total ?? 0 }; return; }
      entry.sold += it.qty ?? 1;
      entry.revenue += it.total ?? 0;
    });
  });
  const topProducts = Object.entries(productMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const totalRevenue = sales.reduce((s, r) => s + r.total, 0);
  const orderCount = sales.length;
  const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

  return (
    <div className="animate-fade-in">
      <Header
        title="Analytics"
        subtitle="Business intelligence & insights"
        actions={
          <div className="flex gap-2">
            <select
              className="bg-[#111624] border border-white/7 rounded-lg text-sm px-3 h-9 text-[#f1f5f9]"
              value={range}
              onChange={(e) => setRange(e.target.value)}
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">This year</option>
            </select>
            <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* KPIs */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Revenue"   value={totalRevenue} format="currency" color="orange" icon={<DollarSign size={16} />} />
            <StatCard title="Transactions"    value={orderCount}   format="number"   color="blue"   icon={<ShoppingBag size={16} />} />
            <StatCard title="Avg Order Value" value={avgOrder}     format="currency" color="green"  icon={<BarChart2 size={16} />} />
            <StatCard title="Top Day Revenue" value={Math.max(...Object.values(dailyMap), 0)} format="currency" color="amber" icon={<TrendingUp size={16} />} />
          </div>
        )}

        {!loading && sales.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-16 text-center">
            <BarChart2 size={36} className="text-[#374151] mx-auto mb-4" />
            <p className="text-[#f1f5f9] font-semibold mb-1">No sales data for this period</p>
            <p className="text-sm text-[#64748b]">Start making sales in POS to see analytics here.</p>
          </div>
        ) : (
          <>
            {/* Revenue trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Revenue by Month (GHS)</CardTitle></CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-52" /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={revenueData} barSize={32}>
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="revenue" fill="#FF6524" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Payment Mix</CardTitle></CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-52" /> : paymentMix.length === 0 ? (
                    <p className="text-sm text-[#64748b] text-center py-8">No data</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie data={paymentMix} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                            {paymentMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                          </Pie>
                          <Tooltip formatter={(value) => [`${value}%`, ""]} contentStyle={{ background: "#111624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {paymentMix.map((p) => (
                          <div key={p.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                              <span className="text-[#64748b]">{p.name}</span>
                            </div>
                            <span className="text-[#f1f5f9] font-medium">{p.value}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Daily + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Sales by Day of Week</CardTitle></CardHeader>
                <CardContent>
                  {loading ? <Skeleton className="h-52" /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dailyData} barSize={28}>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="sales" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Top Products by Revenue</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {loading ? (
                    [...Array(5)].map((_, i) => <Skeleton key={i} className="h-8" />)
                  ) : topProducts.length === 0 ? (
                    <p className="text-sm text-[#64748b] text-center py-8">No product data available.</p>
                  ) : (
                    topProducts.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-3">
                        <span className="w-5 text-xs text-[#374151] text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-[#f1f5f9] truncate">{p.name}</span>
                            <span className="text-sm font-semibold text-[#f1f5f9] ml-2 flex-shrink-0">{formatCurrency(p.revenue)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-[#111624] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#FF6524] rounded-full"
                                style={{ width: `${(p.revenue / (topProducts[0]?.revenue ?? 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-[#64748b] flex-shrink-0">{p.sold} sold</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
