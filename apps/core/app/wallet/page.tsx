"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/app-layout";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw,
  TrendingUp, Send, Plus, History, Clock,
  CheckCircle2, XCircle, Coins,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_BALANCE = 12450;
const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "tx1", type: "earn",             amount: 500,   description: "Referral reward",           created_at: "2026-05-20T10:00:00Z" },
  { id: "tx2", type: "subscription_credit", amount: 200, description: "Pro plan monthly bonus",  created_at: "2026-05-15T09:00:00Z" },
  { id: "tx3", type: "ai_usage",         amount: -25,   description: "AI request batch (Groq)",   created_at: "2026-05-14T16:30:00Z" },
  { id: "tx4", type: "automation_usage", amount: -50,   description: "Workflow execution ×20",    created_at: "2026-05-12T11:20:00Z" },
  { id: "tx5", type: "welcome_bonus",    amount: 100,   description: "Welcome to KENUXA",         created_at: "2026-04-25T08:00:00Z" },
  { id: "tx6", type: "transfer_in",      amount: 300,   description: "Transfer from team member", created_at: "2026-04-20T15:45:00Z" },
  { id: "tx7", type: "spend",            amount: -120,  description: "Marketplace purchase",      created_at: "2026-04-18T13:00:00Z" },
];

const TX_CONFIG: Record<string, { icon: typeof ArrowUpRight; color: string; bg: string }> = {
  earn:                 { icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  transfer_in:          { icon: ArrowDownLeft, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  subscription_credit:  { icon: Coins,         color: "text-violet-400",  bg: "bg-violet-500/10"  },
  welcome_bonus:        { icon: Coins,         color: "text-amber-400",   bg: "bg-amber-500/10"   },
  ai_usage:             { icon: ArrowUpRight,  color: "text-red-400",     bg: "bg-red-500/10"     },
  automation_usage:     { icon: ArrowUpRight,  color: "text-red-400",     bg: "bg-red-500/10"     },
  spend:                { icon: ArrowUpRight,  color: "text-red-400",     bg: "bg-red-500/10"     },
  transfer_out:         { icon: ArrowUpRight,  color: "text-red-400",     bg: "bg-red-500/10"     },
};

const SPEND_BREAKDOWN = [
  { label: "AI Usage",     value: 25,  color: "bg-violet-500" },
  { label: "Automation",   value: 50,  color: "bg-cyan-500"   },
  { label: "Marketplace",  value: 120, color: "bg-amber-500"  },
  { label: "Transfers",    value: 0,   color: "bg-emerald-500"},
];
const totalSpend = SPEND_BREAKDOWN.reduce((s, i) => s + i.value, 0);

// ─── Component ────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "earn">("overview");
  const [sendModal, setSendModal] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [sendTo, setSendTo] = useState("");

  function txConfig(type: string) {
    return TX_CONFIG[type] ?? { icon: Clock, color: "text-[#64748b]", bg: "bg-white/[0.04]" };
  }

  const tabs = [
    { key: "overview" as const,     label: "Overview" },
    { key: "transactions" as const, label: "Transactions" },
    { key: "earn" as const,         label: "Earn KENUX" },
  ];

  return (
    <AppLayout title="KENUX Wallet" description="Your ecosystem currency balance">

      <div className="p-6 space-y-6 max-w-5xl mx-auto">

        {/* Balance card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-[#0d0f1a] via-[#111624] to-[#0a0b14] p-7"
        >
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-cyan-600/8 blur-2xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-[12px] text-[#64748b] font-medium uppercase tracking-[0.12em]">
                  <Wallet className="h-3.5 w-3.5 text-violet-400" />
                  KENUX Balance
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-white tabular-nums">
                    {MOCK_BALANCE.toLocaleString()}
                  </span>
                  <span className="text-xl font-medium text-violet-400">KENUX</span>
                </div>
                <div className="mt-1 text-[12px] text-[#374151]">≈ ${(MOCK_BALANCE * 0.001).toFixed(2)} USD</div>
              </div>

              <div className="hidden sm:flex flex-col items-end gap-1">
                <div className="text-[11px] text-[#374151] uppercase tracking-[0.1em]">All-time earned</div>
                <div className="text-lg font-semibold text-emerald-400">25,000 KENUX</div>
                <div className="text-[11px] text-[#374151] uppercase tracking-[0.1em] mt-2">All-time spent</div>
                <div className="text-lg font-semibold text-red-400">12,550 KENUX</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {[
                { label: "Send",     icon: Send,       onClick: () => setSendModal(true), primary: true },
                { label: "Top Up",   icon: Plus,       onClick: () => {},                primary: false },
                { label: "History",  icon: History,    onClick: () => setActiveTab("transactions"), primary: false },
              ].map(btn => {
                const Icon = btn.icon;
                return (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold transition-all ${
                      btn.primary
                        ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-500/20"
                        : "border border-white/[0.08] bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${
                activeTab === t.key
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                  : "text-[#374151] hover:text-slate-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Spend breakdown */}
            <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-5">
              <h3 className="mb-4 text-[12px] font-semibold text-white uppercase tracking-[0.1em]">30-Day Spend Breakdown</h3>
              <div className="space-y-3">
                {SPEND_BREAKDOWN.map(item => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[12px] text-[#64748b]">{item.label}</span>
                      <span className="text-[12px] font-medium text-white">{item.value} KENUX</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/[0.05]">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: totalSpend ? `${(item.value / totalSpend) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-5 space-y-4">
              <h3 className="text-[12px] font-semibold text-white uppercase tracking-[0.1em]">This Month</h3>
              {[
                { label: "Earned",   value: "+700 KENUX", color: "text-emerald-400", icon: TrendingUp },
                { label: "Spent",    value: "-195 KENUX", color: "text-red-400",     icon: ArrowUpRight },
                { label: "Net",      value: "+505 KENUX", color: "text-violet-400",  icon: RefreshCw   },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.04]`}>
                        <Icon className={`h-3.5 w-3.5 ${s.color}`} />
                      </div>
                      <span className="text-[12px] text-[#64748b]">{s.label}</span>
                    </div>
                    <span className={`text-[12px] font-semibold ${s.color}`}>{s.value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transactions tab */}
        {activeTab === "transactions" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-[12px] font-semibold text-white uppercase tracking-[0.1em]">Transaction History</h3>
              <span className="text-[11px] text-[#374151]">{MOCK_TRANSACTIONS.length} transactions</span>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {MOCK_TRANSACTIONS.map(tx => {
                const cfg    = txConfig(tx.type);
                const Icon   = cfg.icon;
                const isPos  = tx.amount > 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3.5 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-white truncate">{tx.description}</p>
                      <p className="text-[11px] text-[#374151]">
                        {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[13px] font-semibold tabular-nums ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                        {isPos ? "+" : ""}{tx.amount.toLocaleString()} KENUX
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {isPos
                          ? <CheckCircle2 className="h-3 w-3 text-emerald-500/60" />
                          : <XCircle className="h-3 w-3 text-red-500/60" />}
                        <span className="text-[10px] text-[#374151]">{isPos ? "received" : "sent"}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Earn tab */}
        {activeTab === "earn" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { title: "Referral Program",    desc: "Earn 500 KENUX for every user you invite who activates an account.",   reward: "500 KENUX/referral",   color: "violet" },
              { title: "Monthly Bonus",        desc: "Pro plan users automatically receive KENUX every billing cycle.",       reward: "200–∞ KENUX/month",    color: "emerald" },
              { title: "Complete Onboarding",  desc: "Finish setting up your workspace to earn a one-time completion bonus.", reward: "250 KENUX",            color: "cyan" },
              { title: "Marketplace Selling",  desc: "List and sell intelligence products to earn KENUX commissions.",       reward: "5% commission",        color: "amber" },
            ].map(card => (
              <div
                key={card.title}
                className={`rounded-xl border p-5 ${
                  card.color === "violet"  ? "border-violet-500/20  bg-violet-500/5"  :
                  card.color === "emerald" ? "border-emerald-500/20 bg-emerald-500/5" :
                  card.color === "cyan"    ? "border-cyan-500/20    bg-cyan-500/5"    :
                                             "border-amber-500/20   bg-amber-500/5"
                }`}
              >
                <h4 className="text-[13px] font-semibold text-white">{card.title}</h4>
                <p className="mt-1.5 text-[12px] text-[#64748b] leading-relaxed">{card.desc}</p>
                <div className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  card.color === "violet"  ? "bg-violet-500/15 text-violet-400"  :
                  card.color === "emerald" ? "bg-emerald-500/15 text-emerald-400" :
                  card.color === "cyan"    ? "bg-cyan-500/15 text-cyan-400"    :
                                             "bg-amber-500/15 text-amber-400"
                }`}>
                  <Coins className="h-3 w-3" />
                  {card.reward}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send modal */}
      {sendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0d0f1a] p-6 shadow-2xl"
          >
            <h3 className="text-base font-semibold text-white mb-4">Send KENUX</h3>
            <div className="space-y-3">
              <input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="Recipient email or user ID"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/40 transition-all" />
              <input value={sendAmount} onChange={e => setSendAmount(e.target.value)} placeholder="Amount in KENUX" type="number"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/40 transition-all" />
            </div>
            <div className="mt-4 flex gap-2.5">
              <button onClick={() => setSendModal(false)} className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-[12px] text-[#64748b] hover:text-slate-300 transition-colors">Cancel</button>
              <button className="flex-1 rounded-xl bg-violet-600 py-2.5 text-[12px] font-semibold text-white hover:bg-violet-500 transition-colors">Send</button>
            </div>
          </motion.div>
        </div>
      )}
    </AppLayout>
  );
}
