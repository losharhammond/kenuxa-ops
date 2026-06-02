"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Plus, Send,
  RefreshCw, TrendingUp, Shield, Clock, CheckCircle2,
  ChevronRight, Smartphone, Building2, CreditCard,
  AlertCircle, Loader2, X, Briefcase,
} from "lucide-react";
import { hasPermission } from "@/lib/rbac";
import { useRoles } from "@/lib/hooks/use-roles";

interface WalletData {
  balance: number;
  currency: string;
  status: string;
}

interface WalletTx {
  id: string;
  type: "credit" | "debit";
  amount: number;
  description: string;
  status: string;
  created_at: string;
  reference?: string;
}


const TOP_UP_METHODS = [
  { id: "momo",   label: "Mobile Money",   icon: Smartphone,  sub: "MTN, Telecel, AirtelTigo", color: "#FF6524" },
  { id: "bank",   label: "Bank Transfer",  icon: Building2,   sub: "Instant from any bank",    color: "#3B82F6" },
  { id: "card",   label: "Card",           icon: CreditCard,  sub: "Visa / Mastercard",         color: "#8B5CF6" },
];

const QUICK_ACTIONS = [
  { label: "Top Up",    icon: Plus,          color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  { label: "Send",      icon: Send,          color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  { label: "Request",   icon: ArrowDownLeft, color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
  { label: "History",   icon: Clock,         color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

interface BusinessWallet {
  balance: number;
  currency: string;
  status: string;
  updated_at: string;
}

interface BusinessWalletTx {
  id: string;
  type: "credit" | "debit";
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  reference: string | null;
  created_at: string;
}

function WalletPageInner() {
  const { profile, user, role } = useAuth();
  const { activeContext } = useRoles();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const currentRole = (activeContext || role || "customer") as import("@/lib/rbac").Role;
  const showBusinessWallet = hasPermission(currentRole, "payments.view") &&
    ["business_owner", "branch_manager", "cashier", "employee"].includes(currentRole);

  // Handle Paystack redirect callbacks
  const paymentSuccess = searchParams.get("success");
  const paymentError   = searchParams.get("error");

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [rewardsPoints, setRewardsPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpMethod, setTopUpMethod] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpPhone, setTopUpPhone] = useState("");
  const [topping, setTopping] = useState(false);
  const [topUpSuccess, setTopUpSuccess] = useState(false);

  // Wallet type (personal vs business)
  const [walletTab, setWalletTab] = useState<"personal" | "business">("personal");
  const [bizWallet, setBizWallet] = useState<BusinessWallet | null>(null);
  const [bizTxs, setBizTxs] = useState<BusinessWalletTx[]>([]);
  const [bizLoading, setBizLoading] = useState(false);
  const [bizId, setBizId] = useState<string | null>(null);

  // Send flow
  const [showSend, setShowSend] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState("");

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [walletRes, rewardsRes] = await Promise.all([
      supabase.from("wallets").select("balance, currency, status").eq("user_id", user.id).single(),
      supabase.from("rewards_accounts").select("points").eq("user_id", user.id).single(),
    ]);

    if (walletRes.data) {
      setWallet(walletRes.data as WalletData);
    } else {
      // Provision wallet if it doesn't exist
      await supabase.from("wallets").upsert({ user_id: user.id, balance: 0, currency: "GHS", status: "active" });
      setWallet({ balance: 0, currency: "GHS", status: "active" });
    }

    if (!rewardsRes.error && rewardsRes.data) {
      setRewardsPoints((rewardsRes.data as { points: number }).points);
    }

    // Fetch real transactions
    const { data: txData } = await supabase
      .from("wallet_transactions")
      .select("id, type, amount, description, status, created_at, reference")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (txData && txData.length > 0) {
      setTxs((txData as unknown as WalletTx[]));
    } else {
      setTxs([]);
    }
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load business wallet when tab switches
  const loadBusinessWallet = useCallback(async () => {
    if (!user?.id || !showBusinessWallet) return;
    setBizLoading(true);

    // Get user's primary business
    const { data: biz } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!biz) { setBizLoading(false); return; }
    setBizId((biz as { id: string }).id);

    try {
      const res = await fetch(`/api/wallet/business?business_id=${(biz as { id: string }).id}`);
      if (res.ok) {
        const data = await res.json() as { wallet: BusinessWallet; transactions: BusinessWalletTx[] };
        setBizWallet(data.wallet);
        setBizTxs(data.transactions);
      }
    } finally {
      setBizLoading(false);
    }
  }, [user?.id, showBusinessWallet]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (walletTab === "business") loadBusinessWallet();
  }, [walletTab, loadBusinessWallet]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (walletTab === "personal") await load();
    else await loadBusinessWallet();
    setRefreshing(false);
  };

  const handleTopUp = async () => {
    if (!topUpAmount || !topUpMethod) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount < 1) return;
    setTopping(true);
    try {
      const res = await fetch("/api/payments/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // pesewas
          currency: "GHS",
          purpose: "wallet_topup",
          metadata: { method: topUpMethod, phone: topUpPhone },
        }),
      });
      const data = await res.json();
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        setTopUpSuccess(false);
        setShowTopUp(false);
      }
    } finally {
      setTopping(false);
    }
  };

  const handleSend = async () => {
    setSendError("");
    const amount = parseFloat(sendAmount);
    if (!sendTo.trim()) { setSendError("Enter recipient email, phone, or KENUXA ID"); return; }
    if (isNaN(amount) || amount < 0.01) { setSendError("Enter a valid amount"); return; }
    if (amount > (wallet?.balance ?? 0)) { setSendError("Insufficient balance"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiver_identifier: sendTo.trim(), amount, note: sendNote || undefined }),
      });
      const data = await res.json() as { ok?: boolean; reference?: string; error?: string };
      if (!res.ok || !data.ok) { setSendError(data.error ?? "Transfer failed"); return; }
      setSendSuccess(data.reference ?? "done");
      setSendTo(""); setSendAmount(""); setSendNote("");
      await load();
      setTimeout(() => { setSendSuccess(null); setShowSend(false); }, 3000);
    } catch {
      setSendError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const balance = wallet?.balance ?? 0;
  const monthIn  = txs.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
  const monthOut = txs.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

  const downloadStatement = async () => {
    const to   = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - 90 * 86400000).toISOString().split("T")[0];
    const res  = await fetch(`/api/wallet/statement?from=${from}&to=${to}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `kenuxa-statement-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      {/* Payment status banners */}
      {paymentSuccess === "topup" && (
        <div className="bg-[rgba(16,185,129,0.12)] border-b border-[rgba(16,185,129,0.25)] px-6 py-3 flex items-center gap-3">
          <CheckCircle2 size={15} className="text-[#10b981] flex-shrink-0" />
          <p className="text-sm text-[#10b981] font-medium">Wallet topped up successfully! Your balance has been updated.</p>
        </div>
      )}
      {paymentError && (
        <div className="bg-[rgba(239,68,68,0.1)] border-b border-[rgba(239,68,68,0.2)] px-6 py-3 flex items-center gap-3">
          <AlertCircle size={15} className="text-[#f87171] flex-shrink-0" />
          <p className="text-sm text-[#f87171] font-medium">
            {paymentError === "payment_failed" ? "Payment was not completed. Please try again." : "An error occurred. Please contact support if funds were deducted."}
          </p>
        </div>
      )}
      {/* Header */}
      <div className="border-b border-white/7 bg-[#0d0f1a]">
        <div className="max-w-3xl mx-auto px-6 pt-6 pb-0 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Wallet size={20} className="text-[#FF6524]" />
              <h1 className="text-2xl font-bold text-white">KENUXA Wallet</h1>
            </div>
            <p className="text-sm text-[#64748b]">Your unified economic wallet — spend, receive, and manage funds</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-[#94a3b8] transition-all mt-1"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Wallet type tabs */}
        {showBusinessWallet && (
          <div className="max-w-3xl mx-auto px-6 pt-4 pb-0 flex gap-1">
            {([["personal", Wallet, "Personal"], ["business", Briefcase, "Business"]] as const).map(([tab, Icon, label]) => (
              <button
                key={tab}
                onClick={() => setWalletTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                  walletTab === tab
                    ? "border-[#FF6524] text-[#FF8B5E] bg-[rgba(255,101,36,0.07)]"
                    : "border-transparent text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                <Icon size={13} />
                {label} Wallet
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Business Wallet View ──────────────────────────────────── */}
      {walletTab === "business" && showBusinessWallet && (
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {/* Business Balance Card */}
          <div className="relative rounded-2xl overflow-hidden border border-[rgba(59,130,246,0.25)] bg-gradient-to-br from-[rgba(59,130,246,0.12)] via-[rgba(59,130,246,0.04)] to-[rgba(139,92,246,0.08)] p-7">
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase size={14} className="text-[#64748b]" />
                <p className="text-sm text-[#94a3b8]">Business Balance</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  bizWallet?.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"
                }`}>{bizWallet?.status ?? "active"}</span>
              </div>
              <p className="text-5xl font-black text-white mb-1">
                {bizLoading ? "—" : `GHS ${(bizWallet?.balance ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </p>
              <p className="text-sm text-[#64748b]">Business Settlement Wallet · Sales, Payroll & Payments</p>
            </div>
          </div>

          {/* Business wallet info */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Credits", value: bizTxs.filter(t => t.type === "credit").reduce((s,t) => s+t.amount, 0), color: "#10b981", icon: ArrowDownLeft },
              { label: "Total Debits",  value: bizTxs.filter(t => t.type === "debit").reduce((s,t) => s+t.amount, 0),  color: "#f87171", icon: ArrowUpRight },
              { label: "Transactions",  value: bizTxs.length, color: "#3B82F6", icon: TrendingUp, isCount: true },
            ].map(({ label, value, color, icon: Icon, isCount }) => (
              <div key={label} className="p-4 rounded-xl bg-[#111624] border border-white/7 text-center">
                <Icon size={14} style={{ color }} className="mx-auto mb-1.5" />
                <p className="text-sm font-bold text-[#f1f5f9]">
                  {bizLoading ? "—" : isCount ? value.toString() : `GHS ${(value as number).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`}
                </p>
                <p className="text-[10px] text-[#64748b] mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Business transactions */}
          <div className="rounded-2xl bg-[#0d0f1a] border border-white/7 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/7 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#f1f5f9]">Business Transactions</h3>
              <span className="text-xs text-[#374151]">{bizTxs.length} records</span>
            </div>
            {bizLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-[#374151]" />
              </div>
            ) : bizTxs.length === 0 ? (
              <div className="p-10 text-center">
                <Briefcase size={28} className="mx-auto mb-2 text-[#374151]" />
                <p className="text-sm text-[#64748b]">No business transactions yet.</p>
                <p className="text-xs text-[#374151] mt-1">Sales settlements and business payments will appear here.</p>
                {!bizId && currentRole === "business_owner" && (
                  <button
                    onClick={async () => {
                      if (!user?.id) return;
                      const { data: biz } = await supabase.from("businesses").select("id").eq("owner_id", user.id).single();
                      if (biz) {
                        await fetch("/api/wallet/business", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ business_id: (biz as { id: string }).id }) });
                        loadBusinessWallet();
                      }
                    }}
                    className="mt-3 px-4 py-2 bg-[#3B82F6] text-white text-xs font-medium rounded-lg hover:bg-[#2563eb] transition-colors"
                  >
                    Provision Business Wallet
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {bizTxs.map((t) => (
                  <div key={t.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/2 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === "credit" ? "bg-[rgba(16,185,129,0.1)]" : "bg-[rgba(239,68,68,0.1)]"}`}>
                        {t.type === "credit"
                          ? <ArrowDownLeft size={14} className="text-[#10b981]" />
                          : <ArrowUpRight size={14} className="text-[#f87171]" />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9] truncate">{t.description ?? t.type}</p>
                        <p className="text-xs text-[#64748b]">{relTime(t.created_at)}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold flex-shrink-0 ml-3 ${t.type === "credit" ? "text-[#10b981]" : "text-[#f87171]"}`}>
                      {t.type === "credit" ? "+" : "-"}GHS {t.amount.toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Personal Wallet View ──────────────────────────────────── */}
      {walletTab === "personal" && <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
        {/* Balance Card */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(255,101,36,0.25)] bg-gradient-to-br from-[rgba(255,101,36,0.15)] via-[rgba(255,101,36,0.06)] to-[rgba(124,58,237,0.1)] p-7">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #FF6524 0%, transparent 60%)" }} />

          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-sm text-[#94a3b8]">Available Balance</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                wallet?.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-yellow-500/15 text-yellow-400"
              }`}>{wallet?.status ?? "active"}</span>
            </div>
            <p className="text-5xl font-black text-white mb-1">
              {loading ? "—" : `GHS ${balance.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </p>
            <p className="text-sm text-[#64748b] mb-6">{profile?.full_name ?? "KENUXA Member"} · KENUXA Wallet</p>

            {/* Quick actions */}
            <div className="flex gap-3">
              {QUICK_ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    onClick={() => {
                      if (a.label === "Top Up") setShowTopUp(true);
                      if (a.label === "Send")   setShowSend(true);
                    }}
                    className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl transition-all hover:scale-105"
                    style={{ background: a.bg }}
                  >
                    <Icon size={16} style={{ color: a.color }} />
                    <span className="text-xs font-medium" style={{ color: a.color }}>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownLeft size={14} className="text-emerald-400" />
              <span className="text-xs text-[#64748b]">Month In</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">₵{monthIn.toFixed(2)}</p>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight size={14} className="text-[#f87171]" />
              <span className="text-xs text-[#64748b]">Month Out</span>
            </div>
            <p className="text-xl font-bold text-[#f87171]">₵{monthOut.toFixed(2)}</p>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-[#8B5CF6]" />
              <span className="text-xs text-[#64748b]">Rewards Pts</span>
            </div>
            <p className="text-xl font-bold text-[#a78bfa]">{rewardsPoints.toLocaleString()}</p>
          </div>
        </div>

        {/* Success flash */}
        {topUpSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
            <CheckCircle2 size={16} />
            Top-up request submitted! Funds will appear within 2–5 minutes.
          </div>
        )}

        {/* Transactions */}
        <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/7 flex items-center justify-between">
            <p className="font-semibold text-white text-sm">Transaction History</p>
            <button
              onClick={downloadStatement}
              disabled={txs.length === 0}
              className="text-xs text-[#64748b] hover:text-[#FF8B5E] flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Download CSV <ChevronRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-4 flex items-center gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-white/5 rounded w-2/3" />
                    <div className="h-2 bg-white/5 rounded w-1/3" />
                  </div>
                  <div className="h-4 bg-white/5 rounded w-16" />
                </div>
              ))
            ) : txs.map((tx) => (
              <div key={tx.id} className="px-5 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  tx.type === "credit" ? "bg-emerald-500/10" : "bg-red-500/10"
                }`}>
                  {tx.type === "credit"
                    ? <ArrowDownLeft size={15} className="text-emerald-400" />
                    : <ArrowUpRight size={15} className="text-[#f87171]" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-[#64748b]">{relTime(tx.created_at)}</span>
                    {tx.reference && <span className="text-[10px] text-[#374151]">{tx.reference}</span>}
                    {tx.status === "pending" && (
                      <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">Pending</span>
                    )}
                  </div>
                </div>
                <p className={`text-sm font-bold flex-shrink-0 ${
                  tx.type === "credit" ? "text-emerald-400" : "text-[#f87171]"
                }`}>
                  {tx.type === "credit" ? "+" : "−"}₵{tx.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 p-4 bg-[#0d0f1a] border border-white/7 rounded-2xl">
          <Shield size={15} className="text-[#3B82F6] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white mb-1">KENUXA Wallet Protection</p>
            <p className="text-xs text-[#64748b]">
              Your wallet is protected by 2FA, fraud monitoring, and end-to-end encryption. Transactions are instant and irreversible — verify all details before sending.
            </p>
          </div>
        </div>
      </div>}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/7">
              <h2 className="font-semibold text-white flex items-center gap-2"><Send size={15} className="text-[#3B82F6]" /> Send Funds</h2>
              <button onClick={() => { setShowSend(false); setSendError(""); setSendSuccess(null); }} className="text-[#64748b] hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {sendSuccess ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="text-[#10b981] mx-auto mb-3" />
                  <p className="text-base font-semibold text-white mb-1">Transfer Sent!</p>
                  <p className="text-xs text-[#64748b]">Ref: {sendSuccess}</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Recipient (email, phone, or KENUXA ID)</label>
                    <input
                      type="text" value={sendTo} onChange={(e) => setSendTo(e.target.value)}
                      placeholder="user@email.com or +233244000000"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Amount (GHS)</label>
                    <input
                      type="number" min="0.01" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                    <div className="flex gap-2 mt-2">
                      {[10, 50, 100, 200].map((amt) => (
                        <button key={amt} onClick={() => setSendAmount(String(amt))}
                          className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#94a3b8] transition-all">
                          ₵{amt}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#374151] mt-1.5">Available: GH₵ {balance.toFixed(2)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Note (optional)</label>
                    <input
                      type="text" value={sendNote} onChange={(e) => setSendNote(e.target.value)}
                      placeholder="What's this for?"
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#3B82F6]/50"
                    />
                  </div>
                  {sendError && (
                    <p className="text-xs text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-xl px-3 py-2">{sendError}</p>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={!sendTo || !sendAmount || sending}
                    className="w-full py-3 bg-[#3B82F6] hover:bg-[#2563eb] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {sending
                      ? <><Loader2 size={14} className="animate-spin" /> Sending…</>
                      : <><Send size={14} /> Send GH₵ {sendAmount || "0"}</>
                    }
                  </button>
                  <p className="text-xs text-[#374151] text-center">Transfers are instant and irreversible. Verify recipient details.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Top-Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/7">
              <h2 className="font-semibold text-white">Top Up Wallet</h2>
              <button onClick={() => setShowTopUp(false)} className="text-[#64748b] hover:text-white text-lg">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Method selection */}
              <div>
                <p className="text-xs text-[#64748b] mb-2 font-medium">Select Method</p>
                <div className="space-y-2">
                  {TOP_UP_METHODS.map((m) => {
                    const Icon = m.icon;
                    const sel = topUpMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setTopUpMethod(m.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          sel ? "border-[#FF6524]/50 bg-[rgba(255,101,36,0.08)]" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${m.color}20` }}>
                          <Icon size={16} style={{ color: m.color }} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{m.label}</p>
                          <p className="text-xs text-[#64748b]">{m.sub}</p>
                        </div>
                        {sel && <CheckCircle2 size={14} className="text-[#FF6524]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Amount (GHS)</label>
                <input
                  type="number" min="5" value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#FF6524]/50"
                />
                <div className="flex gap-2 mt-2">
                  {[50, 100, 200, 500].map((amt) => (
                    <button key={amt} onClick={() => setTopUpAmount(String(amt))}
                      className="text-xs px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[#94a3b8] transition-all">
                      ₵{amt}
                    </button>
                  ))}
                </div>
              </div>

              {topUpMethod === "momo" && (
                <div>
                  <label className="text-xs font-medium text-[#64748b] mb-1.5 block">Mobile Number</label>
                  <input
                    type="tel" value={topUpPhone}
                    onChange={(e) => setTopUpPhone(e.target.value)}
                    placeholder="+233 244 000 000"
                    className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-[#374151] focus:outline-none focus:border-[#FF6524]/50"
                  />
                </div>
              )}

              <button
                onClick={handleTopUp}
                disabled={!topUpMethod || !topUpAmount || topping}
                className="w-full py-3 bg-[#FF6524] hover:bg-[#e55a1f] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {topping
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                  : <><Plus size={14} /> Top Up ₵{topUpAmount || "0"}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense>
      <WalletPageInner />
    </Suspense>
  );
}
