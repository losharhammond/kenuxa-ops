"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Building2, Users, CreditCard, TrendingUp, TrendingDown,
  AlertCircle, Activity, ArrowUpRight,
  CheckCircle2, XCircle, Clock, Zap, DollarSign, BarChart3, Landmark,
} from "lucide-react";
import { XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { createClient } from "@/lib/supabase/client";

interface PlatformStats {
  total_businesses: number;
  active_businesses: number;
  pending_verification: number;
  total_users: number;
  new_users_today: number;
  total_revenue_mtd: number;
  total_transactions_today: number;
  gmv_today: number;
  open_disputes: number;
  pending_kyc: number;
  kenux_in_circulation: number;
  mrr_ghs: number;
  arr_ghs: number;
  active_loans: number;
  total_loan_book_ghs: number;
}

interface RecentAction {
  id: string;
  subject: string;
  type: string;
  status: string;
  time: string;
}

interface RevenueTrend {
  month: string;
  revenue: number;
}

interface RegionData {
  region: string;
  businesses: number;
  revenue: number;
}

export default function AdminOverviewPage() {
  const supabase = createClient();
  const [stats, setStats] = useState<PlatformStats>({
    total_businesses: 0,
    active_businesses: 0,
    pending_verification: 0,
    total_users: 0,
    new_users_today: 0,
    total_revenue_mtd: 0,
    total_transactions_today: 0,
    gmv_today: 0,
    open_disputes: 0,
    pending_kyc: 0,
    kenux_in_circulation: 0,
    mrr_ghs: 0,
    arr_ghs: 0,
    active_loans: 0,
    total_loan_book_ghs: 0,
  });
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueTrend[]>([]);
  const [regionData, setRegionData] = useState<RegionData[]>([]);

  const load = useCallback(async () => {
    // Fetch platform stats from API
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d: Partial<PlatformStats>) => {
        if (d && typeof d === "object") setStats((prev) => ({ ...prev, ...d }));
      })
      .catch(() => {});

    // Recent audit log actions
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, action, category, severity, created_at, actor, target")
      .order("created_at", { ascending: false })
      .limit(5);

    if (logs) {
      setRecentActions(logs.map((l) => ({
        id: l.id,
        subject: l.target ?? l.actor ?? "—",
        type: l.category,
        status: l.severity === "error" ? "suspended" : l.severity === "warning" ? "open" : "approved",
        time: new Date(l.created_at).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" }),
      })));
    }

    // Revenue trend — last 7 months from sales
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const trend: RevenueTrend[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString().slice(0, 7) + "-01";
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
      const { data: sales } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("created_at", start)
        .lte("created_at", end + "T23:59:59");
      const rev = (sales ?? []).reduce((s: number, r: { total_amount: number }) => s + (r.total_amount ?? 0), 0);
      trend.push({ month: months[d.getMonth()] ?? "", revenue: rev });
    }
    setRevenueTrend(trend);

    // Regional breakdown from businesses table
    const regions = ["Greater Accra", "Ashanti", "Western", "Central", "Eastern"];
    const regionRows: RegionData[] = await Promise.all(
      regions.map(async (region) => {
        const { count } = await supabase
          .from("businesses")
          .select("*", { count: "exact", head: true })
          .ilike("region", `%${region}%`);
        return { region, businesses: count ?? 0, revenue: 0 };
      })
    );
    setRegionData(regionRows);

    // KENUX circulation
    const [kenuxRes, loansRes, subsRes] = await Promise.all([
      supabase.from("rewards_accounts").select("points.sum()").single(),
      supabase.from("loan_applications").select("amount.sum(), status").in("status", ["approved","disbursed","repaying"]),
      supabase.from("platform_revenue").select("amount.sum()").eq("source", "subscription").single(),
    ]);
    const kenuxCirc = (kenuxRes.data as { sum?: number } | null)?.sum ?? 0;
    const loanBook = ((loansRes.data ?? []) as unknown as { amount: number }[]).reduce((s, r) => s + (r.amount ?? 0), 0);
    const loanCount = (loansRes.data ?? []).length;
    const mrrRaw = (subsRes.data as { sum?: number } | null)?.sum ?? 0;

    setStats((prev) => ({
      ...prev,
      kenux_in_circulation: kenuxCirc,
      mrr_ghs: mrrRaw,
      arr_ghs: mrrRaw * 12,
      active_loans: loanCount,
      total_loan_book_ghs: loanBook,
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      {/* Top bar */}
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">Platform Overview</h1>
          <p className="text-xs text-[#64748b]">Real-time dashboard  -  KENUXA Network</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#34d399]">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse" />
            All systems operational
          </div>
          <Button size="sm" variant="secondary">
            <Activity size={13} />
            Live Mode
          </Button>
        </div>
      </div>

      <div className="p-8 space-y-8">

        {/* Alert banner */}
        {(stats.open_disputes > 0 || stats.pending_kyc > 0) && (
          <div className="flex items-center gap-4 bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.2)] rounded-xl px-5 py-3.5">
            <AlertCircle size={16} className="text-[#F59E0B] flex-shrink-0" />
            <p className="text-sm text-[#f1f5f9]">
              <span className="text-[#F59E0B] font-semibold">{stats.pending_kyc} KYC reviews</span> pending
              {stats.open_disputes > 0 && (
                <> and <span className="text-[#f87171] font-semibold">{stats.open_disputes} disputes</span> require attention</>
              )}
            </p>
            <Button size="sm" variant="secondary" className="ml-auto flex-shrink-0">Review Now</Button>
          </div>
        )}

        {/* Key metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Total Businesses",
              value: stats.total_businesses,
              sub: `${stats.active_businesses.toLocaleString()} active`,
              icon: Building2,
              color: "text-[#3B82F6]",
              bg: "bg-[rgba(59,130,246,0.08)]",
              trend: "+8.2%",
              up: true,
            },
            {
              label: "Platform Users",
              value: stats.total_users,
              sub: `+${stats.new_users_today} today`,
              icon: Users,
              color: "text-[#10b981]",
              bg: "bg-[rgba(16,185,129,0.08)]",
              trend: "+12.4%",
              up: true,
            },
            {
              label: "Revenue MTD",
              value: stats.total_revenue_mtd,
              sub: "Gross platform fees",
              icon: CreditCard,
              color: "text-[#FF8B5E]",
              bg: "bg-[rgba(255,101,36,0.08)]",
              trend: "+14.7%",
              up: true,
              currency: true,
            },
            {
              label: "GMV Today",
              value: stats.gmv_today,
              sub: `${stats.total_transactions_today.toLocaleString()} transactions`,
              icon: TrendingUp,
              color: "text-[#F59E0B]",
              bg: "bg-[rgba(245,158,11,0.08)]",
              trend: "+6.1%",
              up: true,
              currency: true,
            },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon size={18} className={m.color} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${m.up ? "text-[#34d399]" : "text-[#f87171]"}`}>
                    {m.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {m.trend}
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#f1f5f9] mb-0.5">
                  {m.currency ? formatCurrency(m.value) : formatNumber(m.value)}
                </p>
                <p className="text-xs text-[#64748b]">{m.label}</p>
                <p className="text-[11px] text-[#374151] mt-0.5">{m.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Economy metrics row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "KENUX in Circulation", value: `${stats.kenux_in_circulation.toLocaleString()} KNX`, icon: Zap,      color: "text-[#FF8B5E]", bg: "bg-[rgba(255,101,36,0.08)]", sub: `GH₵ ${(stats.kenux_in_circulation / 10).toLocaleString()} equiv.` },
            { label: "MRR",                  value: `GH₵ ${stats.mrr_ghs.toLocaleString()}`,               icon: BarChart3, color: "text-[#10b981]", bg: "bg-[rgba(16,185,129,0.08)]", sub: `ARR: GH₵ ${stats.arr_ghs.toLocaleString()}` },
            { label: "Active Loans",          value: stats.active_loans.toLocaleString(),                   icon: Landmark,  color: "text-[#8b5cf6]", bg: "bg-[rgba(139,92,246,0.08)]", sub: `Loan book: GH₵ ${stats.total_loan_book_ghs.toLocaleString()}` },
            { label: "Pending KYC",           value: stats.pending_kyc.toLocaleString(),                    icon: DollarSign,color: "text-[#f59e0b]", bg: "bg-[rgba(245,158,11,0.08)]", sub: `${stats.open_disputes} open disputes` },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                    <Icon size={18} className={m.color} />
                  </div>
                </div>
                <p className="text-xl font-bold text-[#f1f5f9] mb-0.5">{m.value}</p>
                <p className="text-xs text-[#64748b]">{m.label}</p>
                <p className="text-[11px] text-[#374151] mt-0.5">{m.sub}</p>
              </Card>
            );
          })}
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue trend */}
          <Card className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Platform Revenue</h3>
                <p className="text-xs text-[#64748b]">Monthly gross fees collected</p>
              </div>
              <Button size="sm" variant="secondary">
                Export <ArrowUpRight size={12} />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6524" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF6524" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#111624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatCurrency(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FF6524" strokeWidth={2} fill="url(#rev-grad)" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Quick actions */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Pending Verifications", count: stats.pending_verification, color: "text-[#3B82F6]", href: "/admin/businesses?tab=pending" },
                { label: "KYC Reviews",           count: stats.pending_kyc,           color: "text-[#F59E0B]", href: "/admin/compliance" },
                { label: "Open Disputes",         count: stats.open_disputes,         color: "text-[#f87171]", href: "/admin/compliance?tab=disputes" },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between p-3 bg-[#0d0f1a] hover:bg-white/3 rounded-lg transition-colors group"
                >
                  <span className="text-sm text-[#64748b] group-hover:text-[#f1f5f9] transition-colors">{item.label}</span>
                  <span className={`text-sm font-bold ${item.color}`}>{item.count}</span>
                </a>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/7">
              <h4 className="text-xs font-semibold text-[#374151] uppercase tracking-wider mb-3">System Health</h4>
              <div className="space-y-2">
                {[
                  { label: "API Uptime",   value: "99.98%", ok: true },
                  { label: "DB Load",      value: "34%",    ok: true },
                  { label: "Queue Depth",  value: "142",    ok: true },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className="text-[#64748b]">{s.label}</span>
                    <div className="flex items-center gap-1.5">
                      {s.ok
                        ? <CheckCircle2 size={12} className="text-[#34d399]" />
                        : <XCircle size={12} className="text-[#f87171]" />}
                      <span className="text-[#f1f5f9] font-medium">{s.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Region breakdown + Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Regions */}
          <Card className="p-6">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Regional Breakdown</h3>
            <div className="space-y-3">
              {regionData.map((r) => {
                const maxBiz = regionData[0]?.businesses ?? 1;
                const pct = maxBiz > 0 ? Math.round((r.businesses / maxBiz) * 100) : 0;
                return (
                  <div key={r.region}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[#f1f5f9] font-medium">{r.region}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#64748b]">{r.businesses.toLocaleString()} biz</span>
                        <span className="text-[#FF8B5E] font-medium">{formatCurrency(r.revenue)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#FF6524] to-[#F59E0B]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent admin actions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">Recent Actions</h3>
              <a href="/admin/logs" className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors">View all →</a>
            </div>
            <div className="space-y-3">
              {recentActions.length === 0 ? (
                <p className="text-sm text-[#374151] text-center py-6">No recent actions</p>
              ) : recentActions.map((a) => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    a.status === "approved"  ? "bg-[rgba(52,211,153,0.1)]"  :
                    a.status === "suspended" ? "bg-[rgba(239,68,68,0.1)]"   :
                    a.status === "open"      ? "bg-[rgba(248,113,113,0.1)]" :
                    "bg-[rgba(245,158,11,0.1)]"
                  }`}>
                    {a.status === "approved"  ? <CheckCircle2 size={13} className="text-[#34d399]" /> :
                     a.status === "suspended" ? <XCircle      size={13} className="text-[#f87171]" /> :
                     a.status === "open"      ? <AlertCircle  size={13} className="text-[#f87171]" /> :
                     <Clock size={13} className="text-[#F59E0B]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#f1f5f9] truncate">{a.subject}</p>
                    <p className="text-[11px] text-[#64748b]">{a.type.charAt(0).toUpperCase() + a.type.slice(1)}</p>
                  </div>
                  <span className="text-[11px] text-[#374151] flex-shrink-0">{a.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
}
