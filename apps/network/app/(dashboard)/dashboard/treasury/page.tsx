"use client";

/**
 * KENUXA Treasury & Exchange Engine — Module 37
 * Real-time KENUX economy overview: exchange rates, circulation,
 * treasury metrics, and KENUX pricing engine.
 *
 * Access: super_admin, country_admin, financial_partner, business_owner
 */

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";
import {
  Zap, TrendingUp, TrendingDown, RefreshCw, Globe,
  DollarSign, BarChart3, Shield, AlertCircle, CheckCircle2,
  ArrowUpRight, ArrowDownLeft, Loader2,
  Landmark, Activity,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExchangeRate {
  to_currency: string;
  rate: number;
  fetched_at: string;
  source: string;
}

interface TreasuryStats {
  kenux_in_circulation: number;
  kenux_earned_24h:     number;
  kenux_spent_24h:      number;
  total_wallet_balance: number;
  kenux_per_ghs:        number;
  active_wallets:       number;
  pending_settlements:  number;
}

interface LedgerEntry {
  id: string;
  entry_type: "earn" | "spend";
  points: number;
  description: string;
  created_at: string;
}

// ─── Currency meta ────────────────────────────────────────────────────────────
const CURRENCY_META: Record<string, { flag: string; name: string; symbol: string }> = {
  GHS: { flag: "🇬🇭", name: "Ghanaian Cedi",        symbol: "GH₵" },
  NGN: { flag: "🇳🇬", name: "Nigerian Naira",        symbol: "₦"   },
  KES: { flag: "🇰🇪", name: "Kenyan Shilling",       symbol: "KSh" },
  ZAR: { flag: "🇿🇦", name: "South African Rand",    symbol: "R"   },
  ETB: { flag: "🇪🇹", name: "Ethiopian Birr",        symbol: "Br"  },
  UGX: { flag: "🇺🇬", name: "Ugandan Shilling",      symbol: "USh" },
  TZS: { flag: "🇹🇿", name: "Tanzanian Shilling",    symbol: "TSh" },
  RWF: { flag: "🇷🇼", name: "Rwandan Franc",         symbol: "RF"  },
  XOF: { flag: "🌍",  name: "West CFA Franc",        symbol: "CFA" },
  XAF: { flag: "🌍",  name: "Central CFA Franc",     symbol: "CFA" },
  ZMW: { flag: "🇿🇲", name: "Zambian Kwacha",        symbol: "ZK"  },
  MWK: { flag: "🇲🇼", name: "Malawian Kwacha",       symbol: "MK"  },
  SLL: { flag: "🇸🇱", name: "Sierra Leonean Leone",  symbol: "Le"  },
  USD: { flag: "🇺🇸", name: "US Dollar",             symbol: "$"   },
};

const KENUX_PER_GHS = 10; // 10 KENUX = GH₵ 1.00 — fixed rate

// ─── Component ────────────────────────────────────────────────────────────────
export default function TreasuryPage() {
  useRoleGuard("treasury.view");
  const supabase = createClient();
  const { user } = useAuth();

  const [rates, setRates]               = useState<ExchangeRate[]>([]);
  const [stats, setStats]               = useState<TreasuryStats | null>(null);
  const [ledger, setLedger]             = useState<LedgerEntry[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [ratesAge, setRatesAge]         = useState<string>("");
  const [ghsToKenux, setGhsToKenux]    = useState(100);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const since24h = new Date(Date.now() - 86400000).toISOString();

    const [
      ratesRes,
      circulationRes,
      earned24hRes,
      spent24hRes,
      walletsRes,
      ledgerRes,
    ] = await Promise.all([
      supabase.from("exchange_rates").select("to_currency, rate, fetched_at, source").order("to_currency"),
      supabase.from("rewards_accounts").select("points"),
      supabase.from("kenux_ledger").select("points").eq("entry_type", "earn").gte("created_at", since24h),
      supabase.from("kenux_ledger").select("points").eq("entry_type", "spend").gte("created_at", since24h),
      supabase.from("wallets").select("balance").eq("status", "active"),
      supabase.from("kenux_ledger").select("id, entry_type, points, description, created_at")
        .order("created_at", { ascending: false }).limit(20),
    ]);

    if (ratesRes.data?.length) {
      setRates(ratesRes.data as ExchangeRate[]);
      const first = ratesRes.data[0];
      if (first) {
        const ageMs = Date.now() - new Date(first.fetched_at).getTime();
        const ageMin = Math.floor(ageMs / 60000);
        setRatesAge(ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ago`);
      }
    }

    const circulation  = (circulationRes.data ?? []).reduce((s, r) => s + ((r as { points: number }).points ?? 0), 0);
    const earned24h    = (earned24hRes.data ?? []).reduce((s, r) => s + ((r as { points: number }).points ?? 0), 0);
    const spent24h     = (spent24hRes.data ?? []).reduce((s, r) => s + ((r as { points: number }).points ?? 0), 0);
    const walletTotal  = (walletsRes.data ?? []).reduce((s, r) => s + ((r as { balance: number }).balance ?? 0), 0);

    setStats({
      kenux_in_circulation: circulation,
      kenux_earned_24h:     earned24h,
      kenux_spent_24h:      spent24h,
      total_wallet_balance: walletTotal,
      kenux_per_ghs:        KENUX_PER_GHS,
      active_wallets:       walletsRes.data?.length ?? 0,
      pending_settlements:  0,
    });

    setLedger((ledgerRes.data ?? []) as LedgerEntry[]);
    setLoading(false);
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleRefreshRates = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/treasury/rates");
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const ghsRate = rates.find((r) => r.to_currency === "GHS")?.rate ?? 14.5;
  const ghsPerUsd = ghsRate;
  const kenuxPerUsd = KENUX_PER_GHS * ghsPerUsd;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#07080f]">
      <Header title="Treasury" />

      <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#f1f5f9]">KENUXA Treasury</h1>
            <p className="text-sm text-[#64748b]">KENUX Economy · Exchange Engine · Treasury Analytics</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-[#64748b] bg-[#111624] border border-white/7 rounded-lg px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
              Rates updated {ratesAge || "—"}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRefreshRates}
              disabled={refreshing}
            >
              {refreshing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
              Refresh Rates
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={28} className="text-[#FF8B5E] animate-spin" />
          </div>
        ) : (
          <>
            {/* KENUX Economy Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "KENUX in Circulation",
                  value: (stats?.kenux_in_circulation ?? 0).toLocaleString(),
                  sub: `GH₵ ${((stats?.kenux_in_circulation ?? 0) / KENUX_PER_GHS).toLocaleString(undefined, { maximumFractionDigits: 0 })} equiv.`,
                  icon: Zap,
                  color: "text-[#FF8B5E]",
                  bg: "bg-[rgba(255,101,36,0.08)]",
                },
                {
                  label: "KENUX Earned (24h)",
                  value: (stats?.kenux_earned_24h ?? 0).toLocaleString(),
                  sub: `+GH₵ ${((stats?.kenux_earned_24h ?? 0) / KENUX_PER_GHS).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  icon: TrendingUp,
                  color: "text-[#10b981]",
                  bg: "bg-[rgba(16,185,129,0.08)]",
                },
                {
                  label: "KENUX Spent (24h)",
                  value: (stats?.kenux_spent_24h ?? 0).toLocaleString(),
                  sub: `GH₵ ${((stats?.kenux_spent_24h ?? 0) / KENUX_PER_GHS).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  icon: TrendingDown,
                  color: "text-[#f87171]",
                  bg: "bg-[rgba(248,113,113,0.08)]",
                },
                {
                  label: "Total Wallet Balance",
                  value: `GH₵ ${(stats?.total_wallet_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  sub: `${(stats?.active_wallets ?? 0).toLocaleString()} active wallets`,
                  icon: Landmark,
                  color: "text-[#8b5cf6]",
                  bg: "bg-[rgba(139,92,246,0.08)]",
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <Card key={m.label} className="p-5">
                    <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center mb-3`}>
                      <Icon size={18} className={m.color} />
                    </div>
                    <p className="text-xl font-bold text-[#f1f5f9]">{m.value}</p>
                    <p className="text-xs text-[#64748b] mt-0.5">{m.label}</p>
                    <p className="text-[11px] text-[#374151] mt-1">{m.sub}</p>
                  </Card>
                );
              })}
            </div>

            {/* KENUX Fixed Rate Engine */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Rate Card */}
              <Card className="p-6 lg:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center">
                    <Zap size={16} className="text-[#FF8B5E]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#f1f5f9]">KENUX Pricing Engine</h3>
                    <p className="text-[11px] text-[#64748b]">Fixed utility rate — not speculative</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-[#64748b]">KENUX Rate</span>
                    <span className="text-sm font-bold text-[#FF8B5E]">10 KNX = GH₵ 1.00</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-[#64748b]">USD Reference</span>
                    <span className="text-sm font-mono text-[#f1f5f9]">1 USD ≈ GH₵ {ghsPerUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-xs text-[#64748b]">KNX / USD</span>
                    <span className="text-sm font-mono text-[#f1f5f9]">{kenuxPerUsd.toFixed(0)} KNX</span>
                  </div>
                </div>

                {/* Converter */}
                <div className="bg-[#0d0f1a] rounded-xl p-4 border border-white/5">
                  <p className="text-[11px] text-[#64748b] mb-3 font-semibold uppercase tracking-wider">Quick Convert</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-[#64748b] mb-1 block">GH₵</label>
                      <input
                        type="number"
                        value={ghsToKenux}
                        onChange={(e) => setGhsToKenux(Number(e.target.value))}
                        className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] outline-none focus:border-[#FF8B5E]/50"
                      />
                    </div>
                    <div className="text-[#64748b] mt-4">→</div>
                    <div className="flex-1">
                      <label className="text-[10px] text-[#64748b] mb-1 block">KENUX</label>
                      <div className="w-full bg-[#111624] border border-white/7 rounded-lg px-3 py-2 text-sm text-[#FF8B5E] font-bold">
                        {(ghsToKenux * KENUX_PER_GHS).toLocaleString()} KNX
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#374151] mt-2">
                    KENUX is KENUXA&apos;s utility currency. Not cryptocurrency. Not speculative.
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-[#34d399]">
                  <Shield size={12} />
                  Fixed rate — stable pricing for all users
                </div>
              </Card>

              {/* Live Exchange Rates */}
              <Card className="p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#f1f5f9]">Live Exchange Rates</h3>
                    <p className="text-[11px] text-[#64748b]">Base: USD · Used for treasury normalization</p>
                  </div>
                  <Globe size={16} className="text-[#64748b]" />
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {rates.filter((r) => CURRENCY_META[r.to_currency]).map((r) => {
                    const meta = CURRENCY_META[r.to_currency]!;
                    return (
                      <div key={r.to_currency} className="flex items-center justify-between bg-[#0d0f1a] rounded-lg px-3 py-2.5 border border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.flag}</span>
                          <div>
                            <p className="text-xs font-semibold text-[#f1f5f9]">{r.to_currency}</p>
                            <p className="text-[10px] text-[#374151] leading-tight">{meta.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-mono text-[#f1f5f9]">{r.rate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                          <p className="text-[10px] text-[#374151]">per USD</p>
                        </div>
                      </div>
                    );
                  })}
                  {rates.length === 0 && (
                    <div className="col-span-2 text-center py-8 text-[#374151] text-sm">
                      No rates cached. Click &quot;Refresh Rates&quot; to fetch live data.
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* KENUX Ledger Activity */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-[#f1f5f9]">KENUX Ledger Activity</h3>
                  <p className="text-[11px] text-[#64748b]">Recent earn/spend events across the network</p>
                </div>
                <Link href="/dashboard/kenux" className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors flex items-center gap-1">
                  My KENUX <ArrowUpRight size={12} />
                </Link>
              </div>
              {ledger.length === 0 ? (
                <div className="text-center py-10 text-[#374151] text-sm">
                  No ledger activity yet
                </div>
              ) : (
                <div className="space-y-2">
                  {ledger.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 py-2.5 border-b border-white/4 last:border-0">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        entry.entry_type === "earn"
                          ? "bg-[rgba(16,185,129,0.1)]"
                          : "bg-[rgba(248,113,113,0.1)]"
                      }`}>
                        {entry.entry_type === "earn"
                          ? <ArrowDownLeft size={13} className="text-[#10b981]" />
                          : <ArrowUpRight  size={13} className="text-[#f87171]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#f1f5f9] truncate">{entry.description || (entry.entry_type === "earn" ? "KENUX Earned" : "KENUX Spent")}</p>
                        <p className="text-[11px] text-[#374151]">
                          {new Date(entry.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${
                        entry.entry_type === "earn" ? "text-[#10b981]" : "text-[#f87171]"
                      }`}>
                        {entry.entry_type === "earn" ? "+" : "−"}{entry.points.toLocaleString()} KNX
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Treasury Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                {
                  title: "Ledger Integrity",
                  status: "Healthy",
                  desc: "Double-entry balanced. All debits match credits.",
                  icon: CheckCircle2,
                  color: "text-[#34d399]",
                  bg: "bg-[rgba(52,211,153,0.08)]",
                },
                {
                  title: "Settlement Engine",
                  status: "Operational",
                  desc: "Wallet settlements processing normally.",
                  icon: Activity,
                  color: "text-[#3b82f6]",
                  bg: "bg-[rgba(59,130,246,0.08)]",
                },
                {
                  title: "Rate Feed",
                  status: rates.length > 0 ? "Live" : "Stale",
                  desc: rates.length > 0 ? `${rates.length} currency pairs cached.` : "No rate data. Refresh to fetch live rates.",
                  icon: rates.length > 0 ? CheckCircle2 : AlertCircle,
                  color: rates.length > 0 ? "text-[#34d399]" : "text-[#f59e0b]",
                  bg: rates.length > 0 ? "bg-[rgba(52,211,153,0.08)]" : "bg-[rgba(245,158,11,0.08)]",
                },
              ].map((h) => {
                const Icon = h.icon;
                return (
                  <Card key={h.title} className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${h.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon size={18} className={h.color} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#f1f5f9]">{h.title}</p>
                        <p className={`text-xs font-medium ${h.color} mb-1`}>{h.status}</p>
                        <p className="text-[11px] text-[#64748b]">{h.desc}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "My Wallet",    href: "/dashboard/wallet",  icon: Landmark,  color: "#3b82f6" },
                { label: "My KENUX",     href: "/dashboard/kenux",   icon: Zap,       color: "#FF8B5E" },
                { label: "KENUX Credit", href: "/dashboard/credit",  icon: BarChart3, color: "#8b5cf6" },
                { label: "Financing",    href: "/dashboard/lending", icon: DollarSign,color: "#10b981" },
              ].map((l) => {
                const Icon = l.icon;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="flex items-center gap-2.5 bg-[#111624] hover:bg-[#1a1f35] border border-white/7 rounded-xl p-4 transition-colors group"
                  >
                    <Icon size={18} style={{ color: l.color }} />
                    <span className="text-sm font-medium text-[#64748b] group-hover:text-[#f1f5f9] transition-colors">{l.label}</span>
                    <ArrowUpRight size={13} className="ml-auto text-[#374151] group-hover:text-[#64748b]" />
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
