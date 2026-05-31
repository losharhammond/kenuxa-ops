"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Zap, TrendingUp, ArrowDownLeft, ArrowUpRight,
  Gift, Sparkles, Megaphone, Package, CreditCard,
  Loader2, CheckCircle, Shield,
} from "lucide-react";

interface RewardsData {
  points: number;
  lifetime_points: number;
  tier: string;
}

interface KenuxTx {
  id: string;
  type: "earn" | "spend";
  amount: number;
  description: string;
  created_at: string;
}

const TIER_CONFIG = {
  bronze:   { color: "#cd7f32", next: "Silver",   nextAt: 1000 },
  silver:   { color: "#94a3b8", next: "Gold",     nextAt: 5000 },
  gold:     { color: "#f59e0b", next: "Platinum", nextAt: 20000 },
  platinum: { color: "#8b5cf6", next: null,       nextAt: null },
};

const EARN_WAYS = [
  { icon: CreditCard,  label: "Make a purchase",         reward: "+5% back in KENUX",   color: "#10b981" },
  { icon: Gift,        label: "Refer a friend",           reward: "+500 KNX per referral", color: "#8b5cf6" },
  { icon: CheckCircle, label: "Complete your profile",    reward: "+200 KNX",             color: "#3b82f6" },
  { icon: Shield,      label: "Verify your identity",     reward: "+500 KNX",             color: "#f59e0b" },
  { icon: TrendingUp,  label: "Review a business",        reward: "+50 KNX each",         color: "#ec4899" },
];

const SPEND_WAYS = [
  { icon: Megaphone,  label: "Boost a listing",       desc: "Get featured in search results",      cost: "From 100 KNX" },
  { icon: Sparkles,   label: "AI credits",             desc: "Extra AI queries & generation",       cost: "10 KNX / query" },
  { icon: Package,    label: "Platform subscription",  desc: "Pay monthly fee with KENUX",          cost: "Save 10%" },
];

const BUY_AMOUNTS = [
  { ghs: 10,   knx: 100  },
  { ghs: 25,   knx: 250  },
  { ghs: 50,   knx: 500  },
  { ghs: 100,  knx: 1000 },
  { ghs: 250,  knx: 2500 },
  { ghs: 500,  knx: 5000 },
];


function relTime(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d}d ago`;
}

export default function KenuxPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [txs, setTxs] = useState<KenuxTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [buySuccess, setBuySuccess] = useState("");
  const [buyError, setBuyError] = useState("");
  const [tab, setTab] = useState<"overview" | "earn" | "spend" | "history">("overview");

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const [rewardsRes, txsRes] = await Promise.all([
      supabase.from("rewards_accounts").select("points,lifetime_points,tier").eq("user_id", user.id).single(),
      supabase.from("kenux_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setRewards(rewardsRes.data as RewardsData | null ?? { points: 0, lifetime_points: 0, tier: "bronze" });
    setTxs((txsRes.data ?? []) as KenuxTx[]);
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleBuy = async () => {
    if (selected === null) return;
    setBuying(true);
    setBuyError("");
    const pkg = BUY_AMOUNTS[selected];
    if (!pkg) { setBuying(false); return; }

    const res = await fetch("/api/payments/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: pkg.ghs * 100,
        currency: "GHS",
        purpose: "kenux_purchase",
        metadata: { kenux_amount: pkg.knx },
      }),
    });
    const data = await res.json();
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      setBuyError(data.error ?? "Payment initialization failed.");
      setBuying(false);
    }
  };

  const tierInfo = TIER_CONFIG[(rewards?.tier ?? "bronze") as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.bronze;
  const progress = rewards && tierInfo.nextAt
    ? Math.min(100, (rewards.points / tierInfo.nextAt) * 100)
    : 100;

  return (
    <>
      <Header title="KENUX" subtitle="Your platform utility currency" />
      <div className="p-6 space-y-5">

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#374151]" />
          </div>
        ) : (
          <>
            {/* Balance card */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FF6524] to-[#F59E0B] p-6 shadow-[0_8px_30px_rgba(255,101,36,0.3)]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.07] rounded-full -translate-y-16 translate-x-16" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/[0.08] rounded-full translate-y-12 -translate-x-8" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-white/80" fill="currentColor" />
                  <p className="text-white/80 text-xs font-semibold uppercase tracking-widest">KENUX Balance</p>
                </div>
                <p className="text-5xl font-black text-white mb-1">{(rewards?.points ?? 0).toLocaleString()}</p>
                <p className="text-white/70 text-sm mb-4">KNX — ≈ GH₵ {((rewards?.points ?? 0) / 10).toFixed(2)}</p>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white/90 text-xs font-bold capitalize">
                    {rewards?.tier ?? "bronze"} Tier
                  </span>
                  {tierInfo.nextAt && (
                    <span className="text-white/70 text-xs">
                      {(tierInfo.nextAt - (rewards?.points ?? 0)).toLocaleString()} KNX to {tierInfo.next}
                    </span>
                  )}
                </div>
                <div className="mt-3 w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/70 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1.5">
              {(["overview", "earn", "spend", "history"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                    tab === t ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.25)]" : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {/* Overview */}
            {tab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                    <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Lifetime Earned</p>
                    <p className="text-xl font-bold text-[#f1f5f9]">{(rewards?.lifetime_points ?? 0).toLocaleString()} KNX</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                    <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">GHS Value</p>
                    <p className="text-xl font-bold text-[#f1f5f9]">GH₵ {((rewards?.points ?? 0) / 10).toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.15)]">
                  <p className="text-xs font-semibold text-[#FF8B5E] mb-2">Exchange Rate</p>
                  <p className="text-sm text-[#94a3b8]">10 KENUX = GH₵ 1.00 · Priced for accessibility, not speculation.</p>
                </div>
              </div>
            )}

            {/* Earn */}
            {tab === "earn" && (
              <div className="space-y-2">
                {EARN_WAYS.map(({ icon: Icon, label, reward, color }) => (
                  <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Icon size={15} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9]">{label}</p>
                    </div>
                    <span className="text-xs font-bold text-[#10b981] flex-shrink-0">{reward}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Spend / Buy */}
            {tab === "spend" && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest">Use KENUX For</p>
                  {SPEND_WAYS.map(({ icon: Icon, label, desc, cost }) => (
                    <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center flex-shrink-0">
                        <Icon size={15} className="text-[#FF8B5E]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9]">{label}</p>
                        <p className="text-xs text-[#374151]">{desc}</p>
                      </div>
                      <span className="text-xs text-[#64748b] flex-shrink-0">{cost}</span>
                    </div>
                  ))}
                </div>

                {/* Buy KENUX */}
                <div>
                  <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Buy KENUX</p>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {BUY_AMOUNTS.map((pkg, i) => (
                      <button key={i} onClick={() => setSelected(i)}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          selected === i
                            ? "border-[#FF6524] bg-[rgba(255,101,36,0.1)] text-[#FF8B5E]"
                            : "border-white/7 bg-[#111624] text-[#64748b] hover:border-white/15"
                        }`}>
                        <p className="text-sm font-bold text-[#f1f5f9]">{pkg.knx.toLocaleString()} KNX</p>
                        <p className="text-[10px] mt-0.5">GH₵ {pkg.ghs}</p>
                      </button>
                    ))}
                  </div>
                  {buyError && <p className="text-xs text-[#f87171] mb-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{buyError}</p>}
                  {buySuccess && <p className="text-xs text-[#10b981] mb-3 bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] rounded-lg px-3 py-2">{buySuccess}</p>}
                  <button onClick={handleBuy} disabled={selected === null || buying}
                    className="w-full h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40">
                    {buying ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : <><Zap size={14} fill="white" /> Buy KENUX via Paystack</>}
                  </button>
                  <p className="text-[10px] text-[#374151] text-center mt-2">Secure payment via Paystack. Mobile money, card & bank transfer accepted.</p>
                </div>
              </div>
            )}

            {/* History */}
            {tab === "history" && (
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === "earn" ? "bg-[rgba(16,185,129,0.12)]" : "bg-[rgba(239,68,68,0.08)]"}`}>
                      {tx.type === "earn" ? <ArrowDownLeft size={14} className="text-[#10b981]" /> : <ArrowUpRight size={14} className="text-[#f87171]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9] truncate">{tx.description}</p>
                      <p className="text-xs text-[#374151]">{relTime(tx.created_at)}</p>
                    </div>
                    <p className={`text-sm font-bold flex-shrink-0 ${tx.type === "earn" ? "text-[#10b981]" : "text-[#f87171]"}`}>
                      {tx.type === "earn" ? "+" : "-"}{tx.amount.toLocaleString()} KNX
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
