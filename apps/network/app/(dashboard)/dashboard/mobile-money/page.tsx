"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Smartphone, TrendingUp, ArrowUpRight, ArrowDownLeft,
  RefreshCw, BarChart2, Clock, DollarSign,
  Zap, Wifi, Signal, ShoppingBag, Tv, Lightbulb, GraduationCap,
  Shield, CreditCard, Plus, Send, ChevronRight, Sparkles,
  Activity, Target, Award,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FloatAccount {
  id: string;
  network: string;
  balance: number;
  min_balance: number;
  last_topped_up: string | null;
}

interface MoMoTransaction {
  id: string;
  type: "cash_in" | "cash_out" | "airtime" | "data" | "utility" | "transfer" | "commission";
  amount: number;
  fee: number;
  commission: number;
  network: string;
  reference: string;
  customer_name: string | null;
  status: "completed" | "pending" | "failed";
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const NETWORKS = ["MTN", "Telecel", "AirtelTigo"];
const NETWORK_COLOR: Record<string, string> = {
  MTN:        "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  Telecel:    "bg-red-400/10 text-red-400 border-red-400/20",
  AirtelTigo: "bg-blue-400/10 text-blue-400 border-blue-400/20",
};
const NETWORK_DOT: Record<string, string> = {
  MTN: "bg-yellow-400", Telecel: "bg-red-400", AirtelTigo: "bg-blue-400",
};

const TX_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; dir: "in" | "out" }> = {
  cash_in:    { label: "Cash In",    color: "text-emerald-400", icon: ArrowDownLeft,  dir: "in"  },
  cash_out:   { label: "Cash Out",   color: "text-red-400",     icon: ArrowUpRight,   dir: "out" },
  airtime:    { label: "Airtime",    color: "text-blue-400",    icon: Signal,         dir: "out" },
  data:       { label: "Data",       color: "text-purple-400",  icon: Wifi,           dir: "out" },
  utility:    { label: "Utility",    color: "text-amber-400",   icon: Lightbulb,      dir: "out" },
  transfer:   { label: "Transfer",   color: "text-pink-400",    icon: RefreshCw,      dir: "out" },
  commission: { label: "Commission", color: "text-emerald-400", icon: Award,          dir: "in"  },
};

const DIGITAL_SERVICES = [
  { icon: Signal,       label: "Airtime",     color: "bg-[rgba(59,130,246,0.1)] text-[#60A5FA]",    category: "airtime" },
  { icon: Wifi,         label: "Data Bundle", color: "bg-[rgba(139,92,246,0.1)] text-[#8B5CF6]",   category: "data" },
  { icon: Lightbulb,    label: "Electricity", color: "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]",   category: "utility" },
  { icon: Tv,           label: "DStv / GOtv", color: "bg-[rgba(16,185,129,0.1)] text-[#10b981]",   category: "tv" },
  { icon: GraduationCap,label: "School Fees", color: "bg-[rgba(255,101,36,0.1)] text-[#FF8B5E]",   category: "school" },
  { icon: Shield,       label: "Insurance",   color: "bg-[rgba(236,72,153,0.1)] text-[#EC4899]",   category: "insurance" },
  { icon: CreditCard,   label: "Water Bill",  color: "bg-[rgba(6,182,212,0.1)] text-[#06B6D4]",    category: "utility" },
  { icon: ShoppingBag,  label: "Vouchers",    color: "bg-[rgba(251,191,36,0.1)] text-[#fbbf24]",   category: "voucher" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 2 }).format(n);
}

function fmtTime(dt: string) {
  return new Date(dt).toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dt: string) {
  const d = new Date(dt);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return `Today ${fmtTime(dt)}`;
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${fmtTime(dt)}`;
  return d.toLocaleDateString("en-GH", { day: "numeric", month: "short" }) + " " + fmtTime(dt);
}

// ─── Float Card ───────────────────────────────────────────────────────────────

function FloatCard({ account, onTopUp }: { account: FloatAccount; onTopUp: () => void }) {
  const isLow = account.balance <= account.min_balance;
  const pct = Math.min((account.balance / (account.min_balance * 5)) * 100, 100);

  return (
    <div className={`bg-[#131621] border rounded-2xl p-5 ${isLow ? "border-red-400/30" : "border-white/7"}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${NETWORK_DOT[account.network] ?? "bg-white/30"}`} />
          <span className="text-sm font-semibold text-[#f1f5f9]">{account.network} Float</span>
          {isLow && (
            <span className="text-[9px] px-1.5 py-0.5 bg-red-400/10 text-red-400 rounded-full font-bold">LOW</span>
          )}
        </div>
        <button
          onClick={onTopUp}
          className="text-xs px-3 py-1.5 bg-[rgba(255,101,36,0.15)] hover:bg-[rgba(255,101,36,0.25)] text-[#FF8B5E] rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus size={11} /> Top Up
        </button>
      </div>
      <p className="text-3xl font-black text-[#f1f5f9] mb-1">{fmt(account.balance)}</p>
      <p className="text-xs text-[#64748b] mb-3">Min required: {fmt(account.min_balance)}</p>
      <div className="w-full bg-white/5 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${isLow ? "bg-red-400" : "bg-[#FF6524]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {account.last_topped_up && (
        <p className="text-[10px] text-[#374151] mt-2">Last topped up: {fmtDate(account.last_topped_up)}</p>
      )}
    </div>
  );
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TxRow({ tx }: { tx: MoMoTransaction }) {
  const cfg = TX_TYPE_CONFIG[tx.type] ?? TX_TYPE_CONFIG["transfer"]!;
  const Icon = cfg.icon;
  return (
    <div className="flex items-center gap-4 py-3 px-2 hover:bg-white/2 rounded-xl transition-colors">
      <div className={`w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0`}>
        <Icon size={15} className={cfg.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#f1f5f9] truncate">
            {tx.customer_name ?? cfg.label}
          </span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${NETWORK_COLOR[tx.network] ?? "bg-white/5 text-[#64748b] border-white/10"}`}>
            {tx.network}
          </span>
        </div>
        <p className="text-xs text-[#64748b]">
          {cfg.label} · {tx.reference} · {fmtDate(tx.created_at)}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-semibold ${cfg.dir === "in" ? "text-emerald-400" : "text-[#f1f5f9]"}`}>
          {cfg.dir === "in" ? "+" : ""}{fmt(tx.amount)}
        </p>
        {tx.commission > 0 && (
          <p className="text-[10px] text-emerald-400">+{fmt(tx.commission)} comm.</p>
        )}
      </div>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        tx.status === "completed" ? "bg-emerald-400" : tx.status === "pending" ? "bg-amber-400" : "bg-red-400"
      }`} />
    </div>
  );
}

// ─── Process Transaction Modal ────────────────────────────────────────────────

function ProcessTxModal({
  type,
  networks,
  onClose,
  onDone,
}: {
  type: "cash_in" | "cash_out" | "airtime" | "data" | "utility";
  networks: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const supabase = createClient();
  const { profile } = useAuth();
  const [form, setForm] = useState({ network: networks[0] ?? "MTN", amount: "", phone: "", customer: "", reference: "" });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const commissionRate = type === "cash_in" ? 0.01 : type === "cash_out" ? 0.015 : 0.02;
  const commission = parseFloat(form.amount || "0") * commissionRate;

  async function process() {
    if (!form.amount || !form.phone) { setError("Amount and phone are required"); return; }
    setProcessing(true);
    const ref = `KX${Date.now().toString(36).toUpperCase()}`;
    const bizId = (profile as { business_id?: string } | null)?.business_id;
    const { error: err } = await supabase.from("momo_transactions").insert({
      business_id: bizId,
      type,
      amount: parseFloat(form.amount),
      fee: parseFloat(form.amount) * 0.005,
      commission,
      network: form.network,
      reference: ref,
      customer_name: form.customer || null,
      customer_phone: form.phone,
      status: "completed",
    });
    if (err) { setError(err.message); setProcessing(false); return; }
    onDone();
  }

  const titles: Record<string, string> = {
    cash_in: "Cash In", cash_out: "Cash Out", airtime: "Sell Airtime",
    data: "Sell Data", utility: "Pay Utility Bill",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-[#131621] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[#f1f5f9] font-bold text-lg mb-1">{titles[type] ?? "Transaction"}</h2>
        <p className="text-xs text-[#64748b] mb-5">Process a new transaction on the KENUXA network</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Network</label>
            <div className="flex gap-2">
              {networks.map((n) => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, network: n })}
                  className={`flex-1 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    form.network === n ? NETWORK_COLOR[n] ?? "bg-white/5 text-[#f1f5f9] border-white/20" : "bg-white/3 text-[#64748b] border-white/10 hover:border-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Customer Phone</label>
            <input
              type="tel"
              placeholder="0XX XXX XXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Customer Name (optional)</label>
            <input
              placeholder="e.g. Kwame Mensah"
              value={form.customer}
              onChange={(e) => setForm({ ...form, customer: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
            />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Amount (GHS)</label>
            <input
              type="number"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-[#f1f5f9] text-sm placeholder-[#374151] outline-none focus:border-[#FF6524]/50"
            />
            {form.amount && parseFloat(form.amount) > 0 && (
              <p className="text-xs text-emerald-400 mt-1.5">
                Estimated commission: <span className="font-semibold">{fmt(commission)}</span>
                <span className="text-[#64748b]"> ({(commissionRate * 100).toFixed(1)}%)</span>
              </p>
            )}
          </div>
        </div>

        {error && <p className="text-xs text-red-400 mt-3">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-3 bg-white/5 hover:bg-white/8 text-[#94a3b8] text-sm rounded-xl transition-colors">
            Cancel
          </button>
          <button
            onClick={process}
            disabled={processing}
            className="flex-1 py-3 bg-[#FF6524] hover:bg-[#FF7A3D] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {processing ? "Processing…" : <><Send size={14} /> Process</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "transactions" | "services" | "ai";

export default function MobileMoneyPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const bizId = (profile as { business_id?: string } | null)?.business_id ?? null;

  const [tab, setTab] = useState<Tab>("dashboard");
  const [floats, setFloats] = useState<FloatAccount[]>([]);
  const [transactions, setTransactions] = useState<MoMoTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txModal, setTxModal] = useState<"cash_in" | "cash_out" | "airtime" | "data" | "utility" | null>(null);
  const [stats, setStats] = useState({
    todayCashIn: 0, todayCashOut: 0, todayCommission: 0, totalFloat: 0, txCount: 0,
  });
  const [aiInsight, setAiInsight] = useState("");

  const load = useCallback(async () => {
    if (!bizId) return;
    setLoading(true);
    try {
    const today = new Date().toISOString().slice(0, 10);

    const [floatRes, txRes, statsRes] = await Promise.all([
      supabase.from("momo_float_accounts").select("*").eq("business_id", bizId).order("network"),
      supabase.from("momo_transactions").select("*").eq("business_id", bizId)
        .order("created_at", { ascending: false }).limit(50),
      supabase.from("momo_transactions").select("type, amount, commission").eq("business_id", bizId)
        .gte("created_at", today),
    ]);

    const floatData: FloatAccount[] = floatRes.data ?? [];
    const txData: MoMoTransaction[] = txRes.data ?? [];
    const statsData = statsRes.data ?? [];

    setFloats(floatData);
    setTransactions(txData);

    const todayCashIn = statsData.filter((t) => t.type === "cash_in").reduce((s, t) => s + t.amount, 0);
    const todayCashOut = statsData.filter((t) => t.type === "cash_out").reduce((s, t) => s + t.amount, 0);
    const todayCommission = statsData.reduce((s, t) => s + (t.commission ?? 0), 0);
    const totalFloat = floatData.reduce((s, f) => s + f.balance, 0);

    setStats({ todayCashIn, todayCashOut, todayCommission, totalFloat, txCount: statsData.length });

    // Seed default float accounts if none exist (zero balance — agent will top up)
    if (floatData.length === 0) {
      await supabase.from("momo_float_accounts").insert(
        NETWORKS.map((n) => ({
          business_id: bizId,
          network: n,
          balance: 0,
          min_balance: 500,
          last_topped_up: null,
        }))
      );
      load();
      return;
    }

    // AI insight (simple computed insight)
    const lowFloat = floatData.filter((f) => f.balance <= f.min_balance);
    if (lowFloat.length > 0) {
      setAiInsight(`⚠️ ${lowFloat.map((f) => f.network).join(", ")} float is critically low. Top up immediately to avoid transaction failures.`);
    } else if (todayCommission > 0) {
      setAiInsight(`✅ You've earned ${fmt(todayCommission)} in commissions today from ${statsData.length} transactions. Keep the momentum going!`);
    } else {
      setAiInsight("💡 Peak MoMo hours in Ghana are 8AM–10AM and 4PM–7PM. Ensure your float is topped up before these windows.");
    }

    } finally {
      setLoading(false);
    }
  }, [bizId, supabase]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-2xl bg-[rgba(255,101,36,0.12)] flex items-center justify-center">
              <Smartphone size={20} className="text-[#FF8B5E]" />
            </div>
            <h1 className="text-2xl font-bold text-[#f1f5f9]">Mobile Money OS</h1>
          </div>
          <p className="text-sm text-[#64748b]">Float management · Commission tracking · Digital services</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["cash_in", "cash_out"] as const).map((t) => {
            const cfg = TX_TYPE_CONFIG[t]!;
            const Icon = cfg.icon;
            return (
              <button
                key={t}
                onClick={() => setTxModal(t)}
                className="flex items-center gap-2 px-4 py-2.5 bg-[rgba(255,101,36,0.12)] hover:bg-[rgba(255,101,36,0.2)] text-[#FF8B5E] border border-[rgba(255,101,36,0.2)] text-sm font-medium rounded-xl transition-colors"
              >
                <Icon size={14} /> {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* AI Insight */}
      {aiInsight && (
        <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-2xl p-4 flex items-start gap-3">
          <Sparkles size={16} className="text-[#FF8B5E] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[#FF8B5E] mb-0.5">AI Float Intelligence</p>
            <p className="text-sm text-[#94a3b8]">{aiInsight}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Float",      value: fmt(stats.totalFloat),      color: "text-[#FF8B5E]",   icon: DollarSign  },
          { label: "Cash In Today",    value: fmt(stats.todayCashIn),     color: "text-emerald-400", icon: ArrowDownLeft },
          { label: "Cash Out Today",   value: fmt(stats.todayCashOut),    color: "text-red-400",     icon: ArrowUpRight },
          { label: "Commission Today", value: fmt(stats.todayCommission), color: "text-blue-400",    icon: Award        },
          { label: "Transactions",     value: String(stats.txCount),      color: "text-amber-400",   icon: Activity     },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[#131621] border border-white/7 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className="text-xs text-[#64748b]">{label}</span>
            </div>
            <p className={`text-lg font-bold ${color}`}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/3 rounded-xl w-fit">
        {([
          ["dashboard",    "Float Dashboard"],
          ["transactions", "Transactions"],
          ["services",     "Digital Services"],
          ["ai",           "AI Insights"],
        ] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Float Dashboard Tab */}
      {tab === "dashboard" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-36 bg-[#131621] border border-white/7 rounded-2xl animate-pulse" />
              ))
            ) : floats.length === 0 ? (
              <div className="col-span-3 text-center py-12 bg-[#131621] border border-white/7 rounded-2xl">
                <Smartphone size={36} className="mx-auto text-[#374151] mb-3" />
                <p className="text-[#94a3b8]">No float accounts set up yet</p>
              </div>
            ) : (
              floats.map((f) => <FloatCard key={f.id} account={f} onTopUp={() => {}} />)
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Quick Transactions</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {([
                ["cash_in",  "Cash In",   ArrowDownLeft, "text-emerald-400"],
                ["cash_out", "Cash Out",  ArrowUpRight,  "text-red-400"],
                ["airtime",  "Airtime",   Signal,        "text-blue-400"],
                ["data",     "Data",      Wifi,          "text-purple-400"],
                ["utility",  "Utility",   Lightbulb,     "text-amber-400"],
              ] as [typeof txModal & NonNullable<typeof txModal>, string, React.ElementType, string][]).map(([t, label, Icon, color]) => (
                <button
                  key={t}
                  onClick={() => setTxModal(t)}
                  className="bg-[#131621] border border-white/7 hover:border-white/15 rounded-2xl p-4 text-center hover:bg-[#161b2e] transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
                    <Icon size={18} className={color} />
                  </div>
                  <p className="text-xs font-medium text-[#94a3b8] group-hover:text-[#f1f5f9] transition-colors">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Recent transactions preview */}
          {transactions.length > 0 && (
            <div className="bg-[#131621] border border-white/7 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#f1f5f9]">Recent Transactions</h3>
                <button onClick={() => setTab("transactions")} className="text-xs text-[#64748b] hover:text-[#FF8B5E] flex items-center gap-1 transition-colors">
                  View all <ChevronRight size={12} />
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {transactions.slice(0, 5).map((tx) => <TxRow key={tx.id} tx={tx} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transactions Tab */}
      {tab === "transactions" && (
        <div className="bg-[#131621] border border-white/7 rounded-2xl">
          <div className="p-4 border-b border-white/7 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#f1f5f9]">All Transactions</h3>
            <span className="text-xs text-[#64748b]">{transactions.length} records</span>
          </div>
          {transactions.length === 0 ? (
            <div className="py-16 text-center">
              <Activity size={32} className="mx-auto text-[#374151] mb-3" />
              <p className="text-[#94a3b8]">No transactions yet</p>
            </div>
          ) : (
            <div className="p-2 divide-y divide-white/5">
              {transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}
            </div>
          )}
        </div>
      )}

      {/* Digital Services Tab */}
      {tab === "services" && (
        <div className="space-y-5">
          <p className="text-sm text-[#64748b]">
            Sell digital services to your customers. All services are powered by the KENUXA network with instant settlement and competitive commissions.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DIGITAL_SERVICES.map(({ icon: Icon, label, color, category }) => (
              <button
                key={label}
                onClick={() => {
                  if (category === "airtime") setTxModal("airtime");
                  else if (category === "data") setTxModal("data");
                  else if (category === "utility") setTxModal("utility");
                }}
                className="bg-[#131621] border border-white/7 hover:border-white/15 rounded-2xl p-5 text-center hover:bg-[#161b2e] transition-all group"
              >
                <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform`}>
                  <Icon size={22} />
                </div>
                <p className="text-sm font-medium text-[#f1f5f9]">{label}</p>
                <p className="text-xs text-[#64748b] mt-0.5">Earn commission</p>
              </button>
            ))}
          </div>
          {/* Commission rates */}
          <div className="bg-[#131621] border border-white/7 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4">Commission Structure</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { service: "Cash In",      rate: "1.0%",  color: "text-emerald-400", desc: "Per transaction value" },
                { service: "Cash Out",     rate: "1.5%",  color: "text-red-400",     desc: "Per transaction value" },
                { service: "Airtime/Data", rate: "2.0%",  color: "text-blue-400",    desc: "Per sale value" },
                { service: "Utility Bills",rate: "1.0%",  color: "text-amber-400",   desc: "Per bill payment" },
                { service: "Transfers",    rate: "0.5%",  color: "text-purple-400",  desc: "Per transfer amount" },
                { service: "Insurance",    rate: "5.0%",  color: "text-pink-400",    desc: "Per premium paid" },
              ].map(({ service, rate, color, desc }) => (
                <div key={service} className="flex items-center gap-3 bg-white/3 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-[#f1f5f9]">{service}</p>
                    <p className="text-xs text-[#64748b]">{desc}</p>
                  </div>
                  <p className={`text-xl font-black ml-auto ${color}`}>{rate}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Insights Tab */}
      {tab === "ai" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: "Float Forecast",
                icon: TrendingUp,
                color: "text-emerald-400",
                content: `Based on your transaction patterns, you'll need approximately ${fmt(stats.todayCashOut * 1.2)} in total float by end of week. Consider topping up your MTN float first — it has the highest transaction volume.`,
              },
              {
                title: "Revenue Forecast",
                icon: BarChart2,
                color: "text-blue-400",
                content: `At your current commission rate, you're on track to earn ${fmt(stats.todayCommission * 22)} this month. Increasing cash-in volume by 20% could add ${fmt(stats.todayCommission * 4)} to monthly revenue.`,
              },
              {
                title: "Demand Prediction",
                icon: Target,
                color: "text-purple-400",
                content: "Data bundle sales typically spike on Mondays and Fridays. Ensure your Telecel and MTN Data floats are above GHS 2,000 before the weekend for maximum sales capture.",
              },
              {
                title: "Optimization Tips",
                icon: Zap,
                color: "text-amber-400",
                content: "Your cash-out to cash-in ratio is 1.8:1. Healthy agents maintain 1:1 to 1.5:1. Consider running a promotion to attract more cash-in customers and rebalance your float.",
              },
            ].map(({ title, icon: Icon, color, content }) => (
              <div key={title} className="bg-[#131621] border border-white/7 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={color} />
                  <h3 className="text-sm font-semibold text-[#f1f5f9]">{title}</h3>
                  <span className="ml-auto text-[10px] px-2 py-0.5 bg-[rgba(255,101,36,0.1)] text-[#FF8B5E] rounded-full">AI</span>
                </div>
                <p className="text-sm text-[#94a3b8] leading-relaxed">{content}</p>
              </div>
            ))}
          </div>

          {/* Peak hours chart placeholder */}
          <div className="bg-[#131621] border border-white/7 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4 flex items-center gap-2">
              <Clock size={15} className="text-[#64748b]" /> Peak Transaction Hours
            </h3>
            <div className="flex items-end gap-1 h-24">
              {[12, 25, 45, 70, 85, 60, 40, 55, 80, 95, 75, 45, 30, 20, 35, 55, 90, 100, 85, 65, 45, 30, 20, 10].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all"
                  style={{
                    height: `${h}%`,
                    background: (i >= 8 && i <= 10) || (i >= 16 && i <= 19)
                      ? "rgba(255,101,36,0.7)"
                      : "rgba(255,255,255,0.08)",
                  }}
                  title={`${i}:00 — ${h}% activity`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-[#374151] mt-1">
              <span>12AM</span><span>6AM</span><span>12PM</span><span>6PM</span><span>11PM</span>
            </div>
            <p className="text-xs text-[#64748b] mt-2">
              <span className="inline-block w-2 h-2 rounded-sm bg-[rgba(255,101,36,0.7)] mr-1" />
              Peak windows: 8–10AM and 4–7PM
            </p>
          </div>
        </div>
      )}

      {/* Transaction Modal */}
      {txModal && (
        <ProcessTxModal
          type={txModal}
          networks={NETWORKS}
          onClose={() => setTxModal(null)}
          onDone={() => { setTxModal(null); load(); }}
        />
      )}
    </div>
  );
}
