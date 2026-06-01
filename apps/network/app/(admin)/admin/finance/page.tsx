"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Download, Clock, CheckCircle2, AlertCircle, Lock, Unlock, RefreshCw, DollarSign, Percent } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";

interface Settlement {
  id: string;
  business_name: string;
  amount: number;
  transaction_count: number;
  due_date: string;
  status: string;
}

interface FeeRecord {
  id: string;
  reference: string;
  fee_type: string;
  amount: number;
  payer_name: string;
  created_at: string;
  status: string;
}

interface EscrowRecord {
  id: string;
  order_id: string;
  buyer_name: string;
  seller_name: string;
  amount: number;
  held_since: string;
  release_date: string;
  status: string;
}

interface PayoutRecord {
  id: string;
  recipient_name: string;
  account_number: string;
  bank_name: string;
  amount: number;
  created_at: string;
  status: string;
  reference: string;
}

interface FeeTrend { month: string; fees: number }

const TABS = ["settlements", "fees", "escrow", "payouts"] as const;
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function AdminFinancePage() {
  const supabase = createClient();
  const [tab, setTab] = useState<typeof TABS[number]>("settlements");
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [feeTrend, setFeeTrend] = useState<FeeTrend[]>([]);
  const [kpis, setKpis] = useState({ fees_mtd: 0, pending: 0, escrow: 0, payouts_total: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    // Settlements
    const { data: settlData } = await supabase
      .from("pending_settlements")
      .select("id, business_name, amount, transaction_count, due_date, status")
      .order("due_date", { ascending: true })
      .limit(50);
    setSettlements((settlData as Settlement[]) ?? []);
    const pending = ((settlData as Settlement[]) ?? [])
      .filter((s) => s.status !== "completed")
      .reduce((sum, s) => sum + (s.amount ?? 0), 0);

    // Platform fees — list
    const { data: feeData } = await supabase
      .from("platform_revenue")
      .select("id, reference, revenue_type, amount, created_at, status, metadata")
      .order("created_at", { ascending: false })
      .limit(50);
    const feeRows: FeeRecord[] = ((feeData as { id: string; reference: string; revenue_type: string; amount: number; created_at: string; status: string; metadata: Record<string, string> | null }[]) ?? []).map((r) => ({
      id: r.id,
      reference: r.reference ?? "",
      fee_type: r.revenue_type ?? "platform_fee",
      amount: r.amount ?? 0,
      payer_name: r.metadata?.payer_name ?? "—",
      created_at: r.created_at,
      status: r.status ?? "settled",
    }));
    setFees(feeRows);

    // Fee trend — last 7 months
    const now = new Date();
    const trend: FeeTrend[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
      const endDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const end = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}T23:59:59`;
      const { data: mfee } = await supabase.from("platform_revenue").select("amount").gte("created_at", start).lte("created_at", end);
      const fees = ((mfee as { amount: number }[]) ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
      trend.push({ month: MONTH_NAMES[d.getMonth()] ?? "", fees });
    }
    setFeeTrend(trend);
    const feesMtd = trend[trend.length - 1]?.fees ?? 0;

    // Escrow
    const { data: escrowData } = await supabase
      .from("escrow_holds")
      .select("id, order_id, buyer_name, seller_name, amount, held_since, release_date, status")
      .order("held_since", { ascending: false })
      .limit(50);
    setEscrows((escrowData as EscrowRecord[]) ?? []);
    const escrowTotal = ((escrowData as { amount: number; status: string }[]) ?? [])
      .filter((e) => e.status === "held")
      .reduce((s, r) => s + (r.amount ?? 0), 0);

    // Payouts — from wallet_transactions type=payout via Paystack transfer
    const { data: payoutData } = await supabase
      .from("paystack_transfers")
      .select("id, recipient_name, account_number, bank_name, amount, created_at, status, transfer_code")
      .order("created_at", { ascending: false })
      .limit(50);
    const payoutRows: PayoutRecord[] = ((payoutData as { id: string; recipient_name: string; account_number: string; bank_name: string; amount: number; created_at: string; status: string; transfer_code: string }[]) ?? []).map((r) => ({
      id: r.id,
      recipient_name: r.recipient_name ?? "—",
      account_number: r.account_number ?? "—",
      bank_name: r.bank_name ?? "—",
      amount: r.amount ?? 0,
      created_at: r.created_at,
      status: r.status ?? "pending",
      reference: r.transfer_code ?? "",
    }));
    setPayouts(payoutRows);
    const payoutsTotal = payoutRows.filter((p) => p.status === "success").reduce((s, r) => s + r.amount, 0);

    setKpis({ fees_mtd: feesMtd, pending, escrow: escrowTotal, payouts_total: payoutsTotal });
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      <div className="h-16 border-b border-white/7 flex items-center justify-between px-8">
        <div>
          <h1 className="text-base font-bold text-[#f1f5f9]">Financial Management</h1>
          <p className="text-xs text-[#64748b]">Settlements, fees, escrow and payouts</p>
        </div>
        <Button size="sm" variant="secondary">
          <Download size={13} />
          Export Statement
        </Button>
      </div>

      <div className="p-8 space-y-6">
        {/* Key metrics */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Platform Fees MTD",   value: kpis.fees_mtd,       icon: TrendingUp,    color: "text-[#FF8B5E]", bg: "bg-[rgba(255,101,36,0.08)]" },
            { label: "Pending Settlements", value: kpis.pending,         icon: Clock,         color: "text-[#F59E0B]", bg: "bg-[rgba(245,158,11,0.08)]" },
            { label: "Escrow Held",         value: kpis.escrow,          icon: Lock,          color: "text-[#3B82F6]", bg: "bg-[rgba(59,130,246,0.08)]" },
            { label: "Payouts Settled",     value: kpis.payouts_total,   icon: ArrowUpRight,  color: "text-[#34d399]", bg: "bg-[rgba(52,211,153,0.08)]" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <Card key={m.label} className="p-5">
                <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                  <Icon size={18} className={m.color} />
                </div>
                <p className="text-xl font-bold text-[#f1f5f9]">{loading ? "—" : formatCurrency(m.value)}</p>
                <p className="text-xs text-[#64748b] mt-0.5">{m.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Fee Trend Chart */}
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Platform Fee Revenue</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={feeTrend}>
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#111624", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(v: any) => [formatCurrency(v), "Fees"]}
              />
              <Bar dataKey="fees" fill="#FF6524" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

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
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Settlements table */}
        {tab === "settlements" && (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-white/2">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Business</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Transactions</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Due Date</th>
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
                  ) : settlements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#64748b]">No pending settlements</td>
                    </tr>
                  ) : settlements.map((s) => (
                    <tr key={s.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-xs font-bold text-[#FF8B5E]">
                            {(s.business_name ?? "?")[0]}
                          </div>
                          <span className="text-sm text-[#f1f5f9]">{s.business_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#f1f5f9]">{formatCurrency(s.amount)}</td>
                      <td className="px-5 py-3.5 text-center text-sm text-[#64748b]">{s.transaction_count}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-[#64748b]">
                        {new Date(s.due_date).toLocaleDateString("en-GH")}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          s.status === "processing" ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" :
                          s.status === "on_hold"    ? "bg-[rgba(239,68,68,0.1)] text-[#f87171]" :
                          "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                        }`}>
                          {s.status === "processing" ? <CheckCircle2 size={10} /> :
                           s.status === "on_hold"    ? <AlertCircle size={10} /> :
                           <Clock size={10} />}
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <Button size="sm" variant={s.status === "on_hold" ? "danger" : "secondary"} className="h-7 px-2 text-xs">
                          {s.status === "on_hold" ? "Review" : "Process"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Fees tab */}
        {tab === "fees" && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/7 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#94a3b8]">Platform Revenue Records</p>
              <span className="text-xs text-[#64748b]">{fees.length} records</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-white/2">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Reference</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Payer</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : fees.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#64748b]">No revenue records yet</td></tr>
                  ) : fees.map((f) => (
                    <tr key={f.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-[#64748b]">{f.reference || f.id.slice(0, 12)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-[rgba(255,101,36,0.08)] text-[#FF8B5E]">
                          <Percent size={9} />{f.fee_type.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[#94a3b8]">{f.payer_name}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#34d399]">{formatCurrency(f.amount)}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-[#64748b]">
                        {new Date(f.created_at).toLocaleDateString("en-GH")}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          f.status === "settled" ? "bg-[rgba(52,211,153,0.1)] text-[#34d399]" : "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                        }`}>{f.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Escrow tab */}
        {tab === "escrow" && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/7 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#94a3b8]">Escrow Holdings</p>
              <span className="text-xs text-[#64748b]">{escrows.filter((e) => e.status === "held").length} active holds</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-white/2">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Order ID</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Buyer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Seller</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Held Since</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Release</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : escrows.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-12 text-center text-sm text-[#64748b]">No escrow holds</td></tr>
                  ) : escrows.map((e) => (
                    <tr key={e.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-[#64748b]">{e.order_id?.slice(0, 12) ?? "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94a3b8]">{e.buyer_name ?? "—"}</td>
                      <td className="px-5 py-3.5 text-sm text-[#94a3b8]">{e.seller_name ?? "—"}</td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#3B82F6]">{formatCurrency(e.amount)}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-[#64748b]">
                        {e.held_since ? new Date(e.held_since).toLocaleDateString("en-GH") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center text-xs text-[#64748b]">
                        {e.release_date ? new Date(e.release_date).toLocaleDateString("en-GH") : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          e.status === "held"     ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" :
                          e.status === "released" ? "bg-[rgba(52,211,153,0.1)] text-[#34d399]" :
                                                    "bg-[rgba(239,68,68,0.1)] text-[#f87171]"
                        }`}>{e.status}</span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {e.status === "held" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            disabled={actionLoading === e.id}
                            onClick={async () => {
                              setActionLoading(e.id);
                              await supabase.from("escrow_holds").update({ status: "released" }).eq("id", e.id);
                              setActionLoading(null);
                              load();
                            }}
                          >
                            <Unlock size={11} className="mr-1" />
                            {actionLoading === e.id ? "…" : "Release"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Payouts tab */}
        {tab === "payouts" && (
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/7 flex items-center justify-between">
              <p className="text-xs font-semibold text-[#94a3b8]">Paystack Transfer History</p>
              <Button size="sm" variant="secondary" onClick={load} className="h-7 px-2 text-xs">
                <RefreshCw size={11} className="mr-1" /> Refresh
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/7 bg-white/2">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Recipient</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[#64748b] uppercase tracking-wider">Bank / Account</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-[#64748b] uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Reference</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-[#64748b] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-white/5 rounded animate-pulse" /></td>
                      ))}</tr>
                    ))
                  ) : payouts.length === 0 ? (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-sm text-[#64748b]">No payout records</td></tr>
                  ) : payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[rgba(52,211,153,0.08)] flex items-center justify-center">
                            <DollarSign size={12} className="text-[#34d399]" />
                          </div>
                          <span className="text-sm text-[#f1f5f9]">{p.recipient_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-[#94a3b8]">{p.bank_name}</p>
                        <p className="text-xs text-[#64748b] font-mono">{p.account_number}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold text-[#f1f5f9]">{formatCurrency(p.amount)}</td>
                      <td className="px-5 py-3.5 text-center text-xs text-[#64748b]">
                        {new Date(p.created_at).toLocaleDateString("en-GH")}
                      </td>
                      <td className="px-5 py-3.5 text-center font-mono text-xs text-[#64748b]">{p.reference || "—"}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.status === "success"  ? "bg-[rgba(52,211,153,0.1)] text-[#34d399]" :
                          p.status === "failed"   ? "bg-[rgba(239,68,68,0.1)] text-[#f87171]" :
                          p.status === "reversed" ? "bg-[rgba(239,68,68,0.08)] text-[#f87171]" :
                                                    "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"
                        }`}>
                          {p.status === "success"  ? <CheckCircle2 size={9} /> :
                           p.status === "failed"   ? <AlertCircle size={9} /> :
                           p.status === "reversed" ? <ArrowDownLeft size={9} /> :
                           <Clock size={9} />}
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
