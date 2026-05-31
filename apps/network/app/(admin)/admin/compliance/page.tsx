"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  ShieldAlert, AlertTriangle, FileText, Eye,
  CheckCircle2, XCircle, Clock, Search, Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const TABS = ["kyc", "disputes", "fraud"] as const;

interface KYCRecord {
  id: string;
  business_id: string;
  business_name: string;
  document_type: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string;
}

interface Dispute {
  id: string;
  order_ref: string;
  buyer_name: string | null;
  seller_name: string | null;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
}

interface FraudAlert {
  id: string;
  entity_name: string;
  fraud_type: string;
  risk_level: string;
  detected_at: string;
}

export default function AdminCompliancePage() {
  const supabase = createClient();
  const [tab, setTab] = useState<typeof TABS[number]>("kyc");
  const [kyc, setKyc] = useState<KYCRecord[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: kycData }, { data: disputeData }, { data: fraudData }] = await Promise.all([
      supabase
        .from("kyc_submissions")
        .select("id, business_id, business_name, document_type, status, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(50),
      supabase
        .from("disputes")
        .select("id, order_ref, buyer_name, seller_name, amount, reason, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("fraud_alerts")
        .select("id, entity_name, fraud_type, risk_level, detected_at")
        .order("detected_at", { ascending: false })
        .limit(50),
    ]);

    setKyc((kycData as KYCRecord[]) ?? []);
    setDisputes((disputeData as Dispute[]) ?? []);
    setFraudAlerts((fraudData as FraudAlert[]) ?? []);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function updateKyc(id: string, status: "approved" | "rejected") {
    await supabase.from("kyc_submissions").update({ status }).eq("id", id);
    setKyc((prev) => prev.map((k) => (k.id === id ? { ...k, status } : k)));
  }

  async function resolveDispute(id: string) {
    await supabase.from("disputes").update({ status: "resolved" }).eq("id", id);
    setDisputes((prev) => prev.map((d) => (d.id === id ? { ...d, status: "resolved" } : d)));
  }

  async function suspendFraud(id: string) {
    await supabase.from("fraud_alerts").update({ status: "actioned" }).eq("id", id);
    setFraudAlerts((prev) => prev.filter((f) => f.id !== id));
  }

  const filteredKyc = kyc.filter((k) =>
    k.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingKyc = kyc.filter((k) => k.status === "pending").length;
  const openDisputes = disputes.filter((d) => d.status === "open").length;

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">Compliance & KYC</h1>
          <p className="text-xs text-[#64748b]">Document verification, dispute resolution, fraud monitoring</p>
        </div>
        <Button size="sm" variant="secondary">
          <Download size={13} />
          Export Report
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending KYC",   value: pendingKyc,           icon: Clock,        color: "text-[#F59E0B]", bg: "bg-[rgba(245,158,11,0.08)]" },
            { label: "Open Disputes", value: openDisputes,          icon: AlertTriangle, color: "text-[#f87171]", bg: "bg-[rgba(239,68,68,0.08)]" },
            { label: "Fraud Alerts",  value: fraudAlerts.length,   icon: ShieldAlert,  color: "text-[#f97316]", bg: "bg-[rgba(249,115,22,0.08)]" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={20} className={s.color} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
                  <p className="text-xs text-[#64748b]">{s.label}</p>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#111624] border border-white/10 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                tab === t ? "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]" : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {t === "kyc" ? "KYC Review" : t === "fraud" ? "Fraud Monitor" : "Disputes"}
            </button>
          ))}
        </div>

        {/* KYC Tab */}
        {tab === "kyc" && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/7 flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#0d0f1a] border border-white/7 rounded-lg px-3 h-8 flex-1 max-w-xs">
                <Search size={13} className="text-[#64748b]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search businesses..."
                  className="bg-transparent outline-none flex-1 text-sm text-[#f1f5f9] placeholder:text-[#374151]"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-white/2">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Document</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Submitted</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filteredKyc.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-sm text-[#64748b]">No KYC submissions found</td>
                    </tr>
                  ) : filteredKyc.map((k) => (
                    <tr key={k.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-[#f1f5f9]">{k.business_name}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-[#64748b]">
                          <FileText size={12} />
                          {k.document_type}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          k.status === "approved" ? "bg-[rgba(52,211,153,0.1)] text-[#34d399]" :
                          k.status === "rejected" ? "bg-[rgba(239,68,68,0.1)] text-[#f87171]" :
                          "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                        }`}>
                          {k.status === "approved" ? <CheckCircle2 size={10} /> :
                           k.status === "rejected" ? <XCircle size={10} /> :
                           <Clock size={10} />}
                          {k.status.charAt(0).toUpperCase() + k.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#64748b]">
                        {new Date(k.submitted_at).toLocaleDateString("en-GH")}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Eye size={13} /></Button>
                          {k.status === "pending" && (
                            <>
                              <Button size="sm" variant="success" className="h-7 px-2 text-xs" onClick={() => updateKyc(k.id, "approved")}>Approve</Button>
                              <Button size="sm" variant="danger"  className="h-7 px-2 text-xs" onClick={() => updateKyc(k.id, "rejected")}>Reject</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Disputes Tab */}
        {tab === "disputes" && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-white/2">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Order</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Parties</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Reason</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : disputes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#64748b]">No disputes found</td>
                    </tr>
                  ) : disputes.map((d) => (
                    <tr key={d.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono text-[#FF8B5E]">{d.order_ref}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-[#f1f5f9]">{d.buyer_name ?? "—"}</p>
                        <p className="text-xs text-[#64748b]">vs {d.seller_name ?? "—"}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-sm font-medium text-[#f1f5f9]">{formatCurrency(d.amount)}</td>
                      <td className="px-5 py-3.5 text-xs text-[#64748b]">{d.reason ?? "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          d.status === "open"       ? "bg-[rgba(239,68,68,0.1)] text-[#f87171]" :
                          d.status === "reviewing"  ? "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]" :
                          "bg-[rgba(52,211,153,0.1)] text-[#34d399]"
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {d.status !== "resolved" && (
                          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => resolveDispute(d.id)}>Resolve</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Fraud Tab */}
        {tab === "fraud" && (
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-5 h-20 animate-pulse bg-white/3" />
              ))
            ) : fraudAlerts.length === 0 ? (
              <Card className="p-16 text-center">
                <ShieldAlert size={32} className="mx-auto text-[#374151] mb-3" />
                <p className="text-sm text-[#64748b]">No fraud alerts</p>
              </Card>
            ) : fraudAlerts.map((f) => (
              <Card key={f.id} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    f.risk_level === "critical" ? "bg-[rgba(239,68,68,0.1)]" : "bg-[rgba(249,115,22,0.1)]"
                  }`}>
                    <ShieldAlert size={18} className={f.risk_level === "critical" ? "text-[#f87171]" : "text-[#f97316]"} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f1f5f9]">{f.entity_name}</p>
                    <p className="text-xs text-[#64748b]">
                      {f.fraud_type} · Detected {new Date(f.detected_at).toLocaleDateString("en-GH")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                    f.risk_level === "critical" ? "bg-[rgba(239,68,68,0.15)] text-[#f87171]" :
                    f.risk_level === "high"     ? "bg-[rgba(249,115,22,0.15)] text-[#f97316]" :
                    "bg-[rgba(245,158,11,0.15)] text-[#F59E0B]"
                  }`}>
                    {f.risk_level}
                  </span>
                  <Button size="sm" variant="danger" className="text-xs" onClick={() => suspendFraud(f.id)}>Suspend</Button>
                  <Button size="sm" variant="secondary" className="text-xs">Investigate</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
