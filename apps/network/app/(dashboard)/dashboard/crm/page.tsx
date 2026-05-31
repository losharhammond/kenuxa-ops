"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, timeAgo } from "@/lib/utils";
import { Search, UserPlus, MessageSquare, Users, Star, TrendingUp, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  segment: string | null;
  total_orders: number;
  lifetime_value: number;
  loyalty_points: number;
  last_purchase: string | null;
}

interface CRMStats {
  total: number;
  vip: number;
  avg_order_value: number;
  total_points: number;
}

const SEGMENT_COLORS: Record<string, "orange" | "green" | "blue" | "amber"> = {
  VIP: "orange",
  Regular: "blue",
  New: "green",
  Dormant: "amber",
};

const SEGMENTS = [
  { label: "VIP",     desc: "Spend 10× + average",    color: "border-[rgba(255,101,36,0.3)] bg-[rgba(255,101,36,0.05)]" },
  { label: "Regular", desc: "Active last 90 days",     color: "border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.05)]" },
  { label: "New",     desc: "Joined last 30 days",     color: "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)]" },
  { label: "Dormant", desc: "No purchase in 90 days",  color: "border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.05)]" },
];

export default function CRMPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoading(true);
      let q = supabase
        .from("customers")
        .select("id, full_name, phone, email, city, segment, total_orders, lifetime_value, loyalty_points, last_purchase")
        .eq("business_id", profile!.business_id)
        .order("lifetime_value", { ascending: false })
        .limit(50);

      if (search) q = q.ilike("full_name", `%${search}%`);
      if (segment !== "all") q = q.eq("segment", segment);

      const { data } = await q;
      setCustomers((data as Customer[]) ?? []);

      const { data: all } = await supabase
        .from("customers")
        .select("lifetime_value, total_orders, loyalty_points, segment")
        .eq("business_id", profile!.business_id);

      if (all) {
        const totalLV = all.reduce((s, r) => s + (r.lifetime_value ?? 0), 0);
        const totalOrders = all.reduce((s, r) => s + (r.total_orders ?? 0), 0);
        const totalPoints = all.reduce((s, r) => s + (r.loyalty_points ?? 0), 0);
        const counts: Record<string, number> = {};
        all.forEach((r) => { counts[r.segment ?? "Regular"] = (counts[r.segment ?? "Regular"] ?? 0) + 1; });
        setStats({
          total: all.length,
          vip: counts["VIP"] ?? 0,
          avg_order_value: totalOrders > 0 ? Math.round(totalLV / totalOrders) : 0,
          total_points: totalPoints,
        });
        setSegmentCounts(counts);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id, search, segment]);

  return (
    <div className="animate-fade-in">
      <Header
        title="CRM"
        subtitle="Customer relationships & loyalty"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">Import</Button>
            <Button size="sm">
              <UserPlus size={13} />
              Add Customer
            </Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Customers" value={stats?.total ?? 0} format="number" change={5} color="orange" icon={<Users size={16} />} />
          <StatCard title="VIP Customers"   value={stats?.vip ?? 0}   format="number" change={12} color="green" icon={<Star size={16} />} />
          <StatCard title="Avg Order Value" value={stats?.avg_order_value ?? 0} format="currency" change={8} color="blue" icon={<TrendingUp size={16} />} />
          <StatCard title="Loyalty Points"  value={stats?.total_points ?? 0}    format="number" color="amber" icon={<Gift size={16} />} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SEGMENTS.map((seg) => (
            <Card key={seg.label} className={`p-4 ${seg.color}`}>
              <h4 className="text-sm font-semibold text-[#f1f5f9]">{seg.label}</h4>
              <p className="text-2xl font-black text-[#f1f5f9] my-1">
                {loading ? "—" : (segmentCounts[seg.label] ?? 0)}
              </p>
              <p className="text-xs text-[#64748b]">{seg.desc}</p>
            </Card>
          ))}
        </div>

        <Card>
          <div className="p-4 border-b border-white/7 flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-[#07080f] border border-white/7 rounded-lg px-4 h-9">
              <Search size={14} className="text-[#64748b] flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151]"
                placeholder="Search customers..."
                style={{ padding: 0 }}
              />
            </div>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="bg-[#0d0f1a] border border-white/7 rounded-lg text-sm px-3 h-9 text-[#f1f5f9] outline-none"
            >
              <option value="all">All Segments</option>
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="New">New</option>
              <option value="Dormant">Dormant</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/7 text-xs text-[#64748b] uppercase tracking-wider">
                  <th className="px-6 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-center font-medium">Segment</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-right font-medium">Lifetime Value</th>
                  <th className="px-4 py-3 text-right font-medium">Points</th>
                  <th className="px-4 py-3 text-left font-medium">Last Purchase</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <Users size={32} className="mx-auto text-[#374151] mb-3" />
                      <p className="text-sm text-[#64748b]">No customers found</p>
                      <p className="text-xs text-[#374151] mt-1">Add your first customer to get started</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-white/2 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[rgba(255,101,36,0.12)] flex items-center justify-center text-sm font-bold text-[#FF8B5E]">
                            {(c.full_name ?? "?")[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#f1f5f9]">{c.full_name ?? "Unnamed"}</p>
                            <p className="text-xs text-[#64748b]">{c.city ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-[#f1f5f9]">{c.phone ?? "—"}</p>
                        {c.email && <p className="text-xs text-[#64748b]">{c.email}</p>}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge variant={SEGMENT_COLORS[c.segment ?? "Regular"] ?? "default"}>{c.segment ?? "Regular"}</Badge>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-[#f1f5f9]">{c.total_orders}</td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-[#f1f5f9]">{formatCurrency(c.lifetime_value)}</td>
                      <td className="px-4 py-4 text-right text-sm text-[#FF8B5E]">{c.loyalty_points.toLocaleString()}</td>
                      <td className="px-4 py-4 text-sm text-[#64748b]">{c.last_purchase ? timeAgo(c.last_purchase) : "—"}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="px-2 py-1 text-xs bg-[#111624] hover:bg-white/5 rounded border border-white/7 text-[#64748b] hover:text-[#f1f5f9]">View</button>
                          <button className="px-2 py-1 text-xs bg-[#111624] hover:bg-white/5 rounded border border-white/7 text-[#64748b] hover:text-[#f1f5f9]">
                            <MessageSquare size={11} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
