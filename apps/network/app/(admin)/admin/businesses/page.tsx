"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  Search, CheckCircle2, XCircle, Clock, Eye,
  Building2, MapPin, Star, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BusinessStatus = "active" | "pending" | "suspended" | "closed";

interface AdminBusiness {
  id: string;
  name: string;
  type: string;
  city: string;
  region: string;
  status: BusinessStatus;
  verification_status: string;
  avg_rating: number;
  total_sales: number;
  owner_name?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<BusinessStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  active:    { label: "Active",    color: "text-[#34d399]", bg: "bg-[rgba(52,211,153,0.1)]",  icon: CheckCircle2 },
  pending:   { label: "Pending",   color: "text-[#F59E0B]", bg: "bg-[rgba(245,158,11,0.1)]",  icon: Clock },
  suspended: { label: "Suspended", color: "text-[#f87171]", bg: "bg-[rgba(239,68,68,0.1)]",   icon: XCircle },
  closed:    { label: "Closed",    color: "text-[#374151]", bg: "bg-white/5",                  icon: XCircle },
};

const TABS = ["all", "pending", "active", "suspended"] as const;

interface StatCounts { total: number; active: number; pending: number; suspended: number }

export default function AdminBusinessesPage() {
  const [tab, setTab] = useState<typeof TABS[number]>("all");
  const [search, setSearch] = useState("");
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCounts>({ total: 0, active: 0, pending: 0, suspended: 0 });
  const supabase = createClient();

  // Load stats once
  useEffect(() => {
    async function loadStats() {
      const { data } = await supabase.from("businesses").select("status");
      const s = { total: 0, active: 0, pending: 0, suspended: 0 };
      for (const row of data ?? []) {
        s.total++;
        if (row.status === "active")    s.active++;
        if (row.status === "pending")   s.pending++;
        if (row.status === "suspended") s.suspended++;
      }
      setStats(s);
    }
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let q = supabase
        .from("businesses")
        .select("id, name, type, city, region, status, verification_status, avg_rating, total_sales, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tab !== "all") q = q.eq("status", tab);
      if (search) q = q.ilike("name", `%${search}%`);

      const { data } = await q;
      setBusinesses((data as AdminBusiness[]) ?? []);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, search]);

  async function updateStatus(id: string, status: BusinessStatus) {
    await supabase.from("businesses").update({ status }).eq("id", id);
    setBusinesses((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }

  async function verifyBusiness(id: string) {
    await supabase
      .from("businesses")
      .update({ verification_status: "verified", verified_at: new Date().toISOString() })
      .eq("id", id);
    setBusinesses((prev) =>
      prev.map((b) => (b.id === id ? { ...b, verification_status: "verified" } : b))
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">Business Management</h1>
          <p className="text-xs text-[#64748b]">Approve, verify and manage all registered businesses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary">
            Export CSV
          </Button>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total",     value: stats.total,     color: "text-[#f1f5f9]" },
            { label: "Active",    value: stats.active,    color: "text-[#34d399]" },
            { label: "Pending",   value: stats.pending,   color: "text-[#F59E0B]" },
            { label: "Suspended", value: stats.suspended, color: "text-[#f87171]" },
          ].map((s) => (
            <Card key={s.label} className="px-5 py-4">
              <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
              <p className="text-xs text-[#64748b] mt-0.5">{s.label} businesses</p>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-3 h-9 flex-1 max-w-xs">
            <Search size={14} className="text-[#64748b] flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search businesses..."
              className="bg-transparent border-none outline-none flex-1 text-sm text-[#f1f5f9] placeholder:text-[#374151]"
            />
          </div>
          <div className="flex items-center gap-1 bg-[#111624] border border-white/10 rounded-lg p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                    : "text-[#64748b] hover:text-[#f1f5f9]"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/7 bg-white/2">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Business</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Location</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Rating</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Sales</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Verified</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5">
                          <div className="h-4 bg-white/5 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : businesses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <Building2 size={32} className="mx-auto mb-3 text-[#374151]" />
                      <p className="text-sm text-[#64748b]">No businesses found</p>
                    </td>
                  </tr>
                ) : (
                  businesses.map((b) => {
                    const statusCfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.active;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <tr key={b.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-xs font-bold text-[#FF8B5E] flex-shrink-0">
                              {b.name[0]}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#f1f5f9]">{b.name}</p>
                              <p className="text-xs text-[#64748b] capitalize">{b.type?.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                            <MapPin size={11} />
                            {b.city}, {b.region}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-xs text-[#f1f5f9]">
                            <Star size={11} className="text-[#F59E0B] fill-[#F59E0B]" />
                            {b.avg_rating?.toFixed(1) ?? " - "}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="text-sm font-medium text-[#f1f5f9]">{formatCurrency(b.total_sales ?? 0)}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}>
                            <StatusIcon size={10} />
                            {statusCfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {b.verification_status === "verified" ? (
                            <ShieldCheck size={16} className="mx-auto text-[#34d399]" />
                          ) : (
                            <ShieldAlert size={16} className="mx-auto text-[#64748b]" />
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="View">
                              <Eye size={13} />
                            </Button>
                            {b.verification_status !== "verified" && (
                              <Button
                                size="sm"
                                variant="success"
                                className="h-7 px-2 text-xs"
                                onClick={() => verifyBusiness(b.id)}
                              >
                                Verify
                              </Button>
                            )}
                            {b.status === "active" ? (
                              <Button
                                size="sm"
                                variant="danger"
                                className="h-7 px-2 text-xs"
                                onClick={() => updateStatus(b.id, "suspended")}
                              >
                                Suspend
                              </Button>
                            ) : b.status === "suspended" ? (
                              <Button
                                size="sm"
                                variant="success"
                                className="h-7 px-2 text-xs"
                                onClick={() => updateStatus(b.id, "active")}
                              >
                                Restore
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}



