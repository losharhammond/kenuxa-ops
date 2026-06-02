"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import {
  Landmark, TrendingUp, CheckCircle, Clock, XCircle,
  AlertTriangle, FileText, Users, BarChart3, Shield,
  ChevronRight, Loader2, DollarSign, ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface LoanApplication {
  id: string;
  business_id: string;
  type: string;
  amount: number;
  term_months: number;
  status: string;
  created_at: string;
  kenuxa_score: number | undefined;
  business_name: string | undefined;
  user_name: string | undefined;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending:   { label: "Pending Review",  color: "#f59e0b", icon: Clock },
  approved:  { label: "Approved",        color: "#10b981", icon: CheckCircle },
  rejected:  { label: "Rejected",        color: "#f87171", icon: XCircle },
  disbursed: { label: "Disbursed",       color: "#3b82f6", icon: DollarSign },
  repaying:  { label: "Repaying",        color: "#8b5cf6", icon: TrendingUp },
  defaulted: { label: "Defaulted",       color: "#ef4444", icon: AlertTriangle },
};

const LOAN_TYPES: Record<string, string> = {
  working_capital:   "Working Capital",
  inventory_finance: "Inventory Finance",
  invoice_finance:   "Invoice Finance",
  bnpl:              "BNPL",
  equipment:         "Equipment Finance",
  revenue_advance:   "Revenue Advance",
};

const RISK_BANDS = [
  { min: 700, label: "Low Risk",    color: "#10b981" },
  { min: 550, label: "Medium Risk", color: "#f59e0b" },
  { min: 0,   label: "High Risk",   color: "#f87171" },
];

function getRisk(score: number) {
  return RISK_BANDS.find((b) => score >= b.min) ?? RISK_BANDS[RISK_BANDS.length - 1]!;
}

export default function FinancePartnerPage() {
  useRoleGuard("lending.manage");
  const supabase = createClient();
  const { user } = useAuth();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "active" | "portfolio" | "analytics">("pending");
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("loan_applications")
      .select("*, businesses(name), user_profiles(full_name), credit_profiles(kenuxa_score)")
      .order("created_at", { ascending: false })
      .limit(50);

    setApplications(
      ((data ?? []) as unknown[]).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id:           String(r.id),
          business_id:  String(r.business_id ?? ""),
          type:         String(r.type ?? ""),
          amount:       Number(r.amount ?? 0),
          term_months:  Number(r.term_months ?? 0),
          status:       String(r.status ?? "pending"),
          created_at:   String(r.created_at ?? ""),
          kenuxa_score: (r.credit_profiles as { kenuxa_score?: number } | null)?.kenuxa_score,
          business_name:(r.businesses as { name?: string } | null)?.name,
          user_name:    (r.user_profiles as { full_name?: string } | null)?.full_name,
        };
      })
    );
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: string) => {
    setActing(id);
    await supabase.from("loan_applications").update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    await load();
    setActing(null);
  };

  const pending   = applications.filter((a) => a.status === "pending");
  const active    = applications.filter((a) => ["approved","disbursed","repaying"].includes(a.status));
  const portfolio = applications.filter((a) => a.status !== "pending");

  const totalDeployed = active.reduce((s, a) => s + a.amount, 0);
  const totalPipeline = pending.reduce((s, a) => s + a.amount, 0);

  return (
    <>
      <Header title="Financial Partner Portal" subtitle="Review applications, manage your lending portfolio" />
      <div className="p-6 space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Pending Applications", value: pending.length,               color: "#f59e0b", icon: Clock },
            { label: "Active Loans",          value: active.length,               color: "#10b981", icon: CheckCircle },
            { label: "Total Deployed",        value: `GH₵ ${totalDeployed.toLocaleString()}`, color: "#3b82f6", icon: DollarSign },
            { label: "Pipeline Value",        value: `GH₵ ${totalPipeline.toLocaleString()}`, color: "#8b5cf6", icon: TrendingUp },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="p-4 rounded-xl bg-[#111624] border border-white/7">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon size={12} style={{ color }} />
                </div>
                <p className="text-[10px] text-[#374151] uppercase tracking-widest">{label}</p>
              </div>
              <p className="text-xl font-bold text-[#f1f5f9]">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {(["pending", "active", "portfolio", "analytics"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.25)]" : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
              }`}>
              {t} {t === "pending" && pending.length > 0 && <span className="ml-1 bg-[#f59e0b] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">{pending.length}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#374151]" />
          </div>
        ) : (
          <>
            {/* Pending */}
            {tab === "pending" && (
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/7 rounded-2xl">
                    <CheckCircle size={32} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">No pending applications</p>
                  </div>
                ) : pending.map((app) => {
                  const risk = getRisk(app.kenuxa_score ?? 0);
                  return (
                    <div key={app.id} className="p-5 rounded-2xl bg-[#111624] border border-white/7 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-[#f1f5f9]">{app.business_name ?? "Business"}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${risk.color}15`, color: risk.color }}>{risk.label}</span>
                          </div>
                          <p className="text-xs text-[#374151]">{app.user_name} · {LOAN_TYPES[app.type] ?? app.type}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-[#f1f5f9]">GH₵ {app.amount.toLocaleString()}</p>
                          <p className="text-xs text-[#374151]">{app.term_months} months</p>
                        </div>
                      </div>

                      {/* KENUXA Score */}
                      {app.kenuxa_score && (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                          <Shield size={13} className="text-[#3b82f6]" />
                          <div>
                            <p className="text-xs text-[#64748b]">KENUXA Credit Score</p>
                            <p className="text-sm font-bold text-[#f1f5f9]">{app.kenuxa_score} / 850</p>
                          </div>
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden ml-2">
                            <div className="h-full rounded-full" style={{ width: `${(app.kenuxa_score / 850) * 100}%`, background: risk.color }} />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => updateStatus(app.id, "approved")} disabled={acting === app.id}
                          className="flex-1 h-9 rounded-xl bg-[rgba(16,185,129,0.12)] text-[#10b981] border border-[rgba(16,185,129,0.2)] text-xs font-semibold hover:bg-[rgba(16,185,129,0.2)] transition-colors flex items-center justify-center gap-1.5">
                          {acting === app.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Approve
                        </button>
                        <button onClick={() => updateStatus(app.id, "rejected")} disabled={acting === app.id}
                          className="flex-1 h-9 rounded-xl bg-[rgba(239,68,68,0.08)] text-[#f87171] border border-[rgba(239,68,68,0.15)] text-xs font-semibold hover:bg-[rgba(239,68,68,0.15)] transition-colors flex items-center justify-center gap-1.5">
                          <XCircle size={12} /> Reject
                        </button>
                        <button className="w-9 h-9 rounded-xl border border-white/10 text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-colors flex items-center justify-center">
                          <FileText size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Active */}
            {tab === "active" && (
              <div className="space-y-2">
                {active.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/7 rounded-2xl">
                    <Landmark size={32} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">No active loans</p>
                  </div>
                ) : active.map((app) => {
                  const st = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.approved!;
                  return (
                    <div key={app.id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${st.color}15` }}>
                        <st.icon size={14} style={{ color: st.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9]">{app.business_name ?? "Business"}</p>
                        <p className="text-xs text-[#374151]">{LOAN_TYPES[app.type] ?? app.type} · {app.term_months}mo</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-[#f1f5f9]">GH₵ {app.amount.toLocaleString()}</p>
                        <span className="text-[10px]" style={{ color: st.color }}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Portfolio */}
            {tab === "portfolio" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Applications",  value: portfolio.length,   color: "#64748b" },
                    { label: "Approval Rate",        value: `${portfolio.length > 0 ? Math.round((active.length / portfolio.length) * 100) : 0}%`, color: "#10b981" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="p-4 rounded-xl bg-[#111624] border border-white/7">
                      <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.15)]">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 size={13} className="text-[#FF8B5E]" />
                    <p className="text-xs font-semibold text-[#FF8B5E]">Portfolio by Type</p>
                  </div>
                  {Object.entries(LOAN_TYPES).map(([key, label]) => {
                    const count = portfolio.filter((a) => a.type === key).length;
                    if (count === 0) return null;
                    return (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-xs text-[#64748b]">{label}</span>
                        <span className="text-xs font-semibold text-[#f1f5f9]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Analytics */}
            {tab === "analytics" && (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-[#111624] border border-white/7 text-center">
                  <BarChart3 size={32} className="text-[#374151] mx-auto mb-2" />
                  <p className="text-sm text-[#64748b]">Advanced analytics available after 10+ active loans.</p>
                  <Link href="/dashboard/analytics">
                    <button className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl border border-white/10 text-xs text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-all">
                      View Platform Analytics <ArrowRight size={11} />
                    </button>
                  </Link>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Users size={13} className="text-[#10b981]" />
                    <p className="text-xs font-semibold text-[#10b981]">API Integration</p>
                  </div>
                  <p className="text-xs text-[#64748b]">Connect your core banking system via our Lending API. Pull KENUXA Credit Scores, push disbursement status, automate repayment tracking.</p>
                  <Link href="/dashboard/developer">
                    <button className="mt-2 flex items-center gap-1 text-xs text-[#10b981] hover:underline">
                      View Developer Docs <ChevronRight size={10} />
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
