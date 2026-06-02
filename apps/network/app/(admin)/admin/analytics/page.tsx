"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp, Download, Users, Building2, Truck } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

interface TrendPoint { month: string; gmv: number; businesses: number }
interface UserPoint   { month: string; buyers: number; sellers: number }
interface ModulePoint { name: string; value: number; color: string }

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const MODULE_COLORS: Record<string, string> = {
  POS: "#FF6524", Marketplace: "#3B82F6", Invoicing: "#10b981",
  CRM: "#F59E0B", Delivery: "#8B5CF6", Other: "#374151",
};

const COUNTRY_PIPELINE = [
  { country: "Ghana",        status: "live"    },
  { country: "Nigeria",      status: "Q3 2026" },
  { country: "Kenya",        status: "Q4 2026" },
  { country: "Côte d'Ivoire",status: "2027"    },
  { country: "Tanzania",     status: "2027"    },
  { country: "Ethiopia",     status: "2027"    },
];

export default function AdminAnalyticsPage() {
  const supabase = createClient();
  const [gmvTrend, setGmvTrend] = useState<TrendPoint[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserPoint[]>([]);
  const [moduleUsage, setModuleUsage] = useState<ModulePoint[]>([]);
  const [kpis, setKpis] = useState({ gmv: 0, businesses: 0, users: 0, deliveries: 0 });
  const [liveGhana, setLiveGhana] = useState({ businesses: 0, gmv: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {

    const months = MONTH_NAMES;
    const now = new Date();

    // Build 8-month GMV trend from sales table
    const trendPoints: TrendPoint[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const endDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}T23:59:59`;
      const { data: salesData } = await supabase.from("sales").select("total").gte("created_at", start).lte("created_at", end);
      const gmv = (salesData ?? []).reduce((s: number, r: { total: number }) => s + (r.total ?? 0), 0);
      const { count: bizCount } = await supabase.from("businesses").select("*", { count: "exact", head: true }).lte("created_at", end);
      trendPoints.push({ month: months[d.getMonth()] ?? "", gmv, businesses: bizCount ?? 0 });
    }
    setGmvTrend(trendPoints);

    // Business count
    const { count: totalBiz } = await supabase.from("businesses").select("*", { count: "exact", head: true });
    const { count: totalUsers } = await supabase.from("user_profiles").select("*", { count: "exact", head: true });

    // Current month GMV
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: mtdSales } = await supabase.from("sales").select("total").gte("created_at", monthStart);
    const gmvMtd = (mtdSales ?? []).reduce((s: number, r: { total: number }) => s + (r.total ?? 0), 0);

    setKpis({ gmv: gmvMtd, businesses: totalBiz ?? 0, users: totalUsers ?? 0, deliveries: 0 });
    setLiveGhana({ businesses: totalBiz ?? 0, gmv: gmvMtd });

    // User growth (buyers vs sellers as profiles vs businesses)
    const growthPoints: UserPoint[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10) + "T23:59:59";
      const { count: buyers } = await supabase.from("user_profiles").select("*", { count: "exact", head: true }).lte("created_at", end);
      const { count: sellers } = await supabase.from("businesses").select("*", { count: "exact", head: true }).lte("created_at", end);
      growthPoints.push({ month: months[d.getMonth()] ?? "", buyers: buyers ?? 0, sellers: sellers ?? 0 });
    }
    setUserGrowth(growthPoints);

    // Module usage from audit_logs category counts
    const { data: logCounts } = await supabase.from("audit_logs").select("category");
    if (logCounts && logCounts.length > 0) {
      const catMap: Record<string, number> = {};
      logCounts.forEach((l: { category: string }) => {
        catMap[l.category] = (catMap[l.category] ?? 0) + 1;
      });
      const total = Object.values(catMap).reduce((a, b) => a + b, 0);
      const modules = Object.entries(catMap).map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: total > 0 ? Math.round((count / total) * 100) : 0,
        color: MODULE_COLORS[name.charAt(0).toUpperCase() + name.slice(1)] ?? "#374151",
      }));
      setModuleUsage(modules);
    } else {
      setModuleUsage([
        { name: "Auth",     value: 40, color: "#3B82F6" },
        { name: "Admin",    value: 30, color: "#F59E0B" },
        { name: "Security", value: 20, color: "#f87171" },
        { name: "System",   value: 10, color: "#374151" },
      ]);
    }

    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">Platform Analytics</h1>
          <p className="text-xs text-[#64748b]">Growth metrics, GMV trends, country expansion</p>
        </div>
        <Button size="sm" variant="secondary">
          <Download size={13} />
          Export Report
        </Button>
      </div>

      <div className="p-8 space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "GMV This Month",        value: kpis.gmv,         icon: TrendingUp, color: "text-[#FF8B5E]", bg: "bg-[rgba(255,101,36,0.08)]",  currency: true  },
            { label: "Registered Businesses", value: kpis.businesses,  icon: Building2,  color: "text-[#3B82F6]", bg: "bg-[rgba(59,130,246,0.08)]",  currency: false },
            { label: "Active Users",          value: kpis.users,       icon: Users,      color: "text-[#10b981]", bg: "bg-[rgba(16,185,129,0.08)]",  currency: false },
            { label: "Deliveries MTD",        value: kpis.deliveries,  icon: Truck,      color: "text-[#F59E0B]", bg: "bg-[rgba(245,158,11,0.08)]",  currency: false },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="p-5">
                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={m.color} />
                </div>
                <p className="text-xl font-bold text-[#f1f5f9]">
                  {loading ? "—" : m.currency ? formatCurrency(m.value) : formatNumber(m.value)}
                </p>
                <p className="text-xs text-[#64748b] mt-0.5">{m.label}</p>
              </Card>
            );
          })}
        </div>

        {/* GMV & Business Growth */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-[#f1f5f9]">GMV vs Business Growth</h3>
              <p className="text-xs text-[#64748b]">Monthly gross merchandise value and registered businesses</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={gmvTrend}>
              <defs>
                <linearGradient id="gmv-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6524" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF6524" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="gmv" hide />
              <YAxis yAxisId="biz" orientation="right" hide />
              <Tooltip
                contentStyle={{ background: "#111624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any, name: any) =>
                  name === "gmv" ? [formatCurrency(Number(v)), "GMV"] : [formatNumber(Number(v)), "Businesses"]
                }
              />
              <Area yAxisId="gmv" type="monotone" dataKey="gmv" stroke="#FF6524" strokeWidth={2} fill="url(#gmv-grad)" />
              <Area yAxisId="biz" type="monotone" dataKey="businesses" stroke="#3B82F6" strokeWidth={2} fill="none" strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-6 mt-2 justify-center">
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <div className="w-3 h-0.5 bg-[#FF6524]" />
              Platform GMV
            </div>
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <div className="w-3 h-0.5 bg-[#3B82F6]" style={{ borderTop: "2px dashed #3B82F6", background: "none" }} />
              Businesses
            </div>
          </div>
        </Card>

        {/* User Growth + Module Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-5">User Growth by Segment</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userGrowth}>
                <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#111624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [formatNumber(Number(v))]}
                />
                <Bar dataKey="buyers"  name="Buyers"  fill="#FF6524" radius={[3,3,0,0]} />
                <Bar dataKey="sellers" name="Sellers" fill="#3B82F6" radius={[3,3,0,0]} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#64748b", paddingTop: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-6">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-5">Activity Breakdown</h3>
            {moduleUsage.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={moduleUsage} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={2} dataKey="value">
                      {moduleUsage.map((m) => (
                        <Cell key={m.name} fill={m.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "#111624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(v: any) => [`${v}%`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-3">
                  {moduleUsage.map((m) => (
                    <div key={m.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                        <span className="text-[#64748b]">{m.name}</span>
                      </div>
                      <span className="text-[#f1f5f9] font-medium">{m.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Country Expansion Pipeline */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Global Expansion Pipeline</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {COUNTRY_PIPELINE.map((c) => (
              <div key={c.country} className={`p-4 rounded-xl border text-center ${
                c.status === "live"
                  ? "bg-[rgba(255,101,36,0.06)] border-[rgba(255,101,36,0.2)]"
                  : "bg-[#0d0f1a] border-white/7"
              }`}>
                <p className="text-sm font-semibold text-[#f1f5f9] mb-1">{c.country}</p>
                {c.status === "live" ? (
                  <>
                    <p className="text-xs text-[#34d399] font-bold mb-0.5">LIVE</p>
                    <p className="text-[11px] text-[#64748b]">{formatNumber(liveGhana.businesses)} biz</p>
                    <p className="text-[11px] text-[#FF8B5E]">{formatCurrency(liveGhana.gmv)}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-[#64748b] font-medium">Target</p>
                    <p className="text-xs text-[#374151]">{c.status}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
