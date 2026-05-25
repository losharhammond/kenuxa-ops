"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { CheckCircle2, Zap, Building2, Rocket, Crown, ArrowRight, CreditCard, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Plan {
  name: string;
  slug: string;
  price: number;
  yearlyPrice: number;
  color: string;
  badge: string;
  icon: typeof Zap;
  features: string[];
  highlight?: boolean;
}

// ─── Plans ────────────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    name: "Free",   slug: "free",     price: 0,   yearlyPrice: 0,    color: "slate",
    badge: "bg-[#374151]/60 text-[#64748b]", icon: Zap,
    features: ["100 AI requests/month","5,000 KENUX/month","Basic search","Public intelligence"],
  },
  {
    name: "Pro",    slug: "pro",      price: 29,  yearlyPrice: 290,  color: "violet",
    badge: "bg-violet-500/20 text-violet-400", icon: Rocket, highlight: true,
    features: ["1,000 AI requests/month","20,000 KENUX/month","Advanced AI","API access","Priority support"],
  },
  {
    name: "Business", slug: "business", price: 79, yearlyPrice: 790, color: "emerald",
    badge: "bg-emerald-500/20 text-emerald-400", icon: Building2,
    features: ["5,000 AI requests/month","100,000 KENUX/month","Custom crawlers","Team workspace","SLA guarantee"],
  },
  {
    name: "Enterprise", slug: "enterprise", price: 299, yearlyPrice: 2990, color: "amber",
    badge: "bg-amber-500/20 text-amber-400", icon: Crown,
    features: ["50,000 AI requests/month","Unlimited KENUX","Dedicated infra","Custom SLA","Onboarding support"],
  },
];

const USAGE = [
  { label: "AI Requests",   used: 312,   limit: 1000,  color: "bg-violet-500" },
  { label: "KENUX Spent",   used: 7550,  limit: 20000, color: "bg-cyan-500"   },
  { label: "Events / day",  used: 4200,  limit: 10000, color: "bg-emerald-500"},
  { label: "Workflows",     used: 8,     limit: 50,    color: "bg-amber-500"  },
];

const INVOICES = [
  { id: "INV-001", date: "2026-05-01", amount: 29, status: "paid" },
  { id: "INV-002", date: "2026-04-01", amount: 29, status: "paid" },
  { id: "INV-003", date: "2026-03-01", amount: 29, status: "paid" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [billing, setBilling]     = useState<"monthly" | "yearly">("monthly");
  const [activeTab, setActiveTab] = useState<"plans" | "usage" | "invoices">("plans");
  const currentPlan = "pro";

  return (
    <AppLayout title="Billing" description="Manage your subscription and usage">

      <div className="p-6 space-y-6">

        {/* Current plan banner */}
        <div className="flex items-center justify-between rounded-xl border border-violet-500/20 bg-violet-500/5 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15">
              <Rocket className="h-4.5 w-4.5 text-violet-400" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Pro Plan — Active</p>
              <p className="text-[11px] text-[#64748b]">Next billing: June 1, 2026 · $29.00</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2 text-[12px] font-medium text-slate-300 hover:bg-white/[0.08] transition-all">
            <CreditCard className="h-3.5 w-3.5" /> Manage
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-1">
          {[
            { key: "plans" as const,   label: "Plans" },
            { key: "usage" as const,   label: "Usage" },
            { key: "invoices" as const, label: "Invoices" },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${activeTab === t.key ? "bg-violet-600/20 text-violet-300 border border-violet-500/20" : "text-[#374151] hover:text-slate-400"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Plans */}
        {activeTab === "plans" && (
          <>
            {/* Billing toggle */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-1">
                {(["monthly","yearly"] as const).map(b => (
                  <button key={b} onClick={() => setBilling(b)} className={`rounded-lg px-4 py-1.5 text-[12px] font-medium capitalize transition-all ${billing === b ? "bg-violet-600/20 text-violet-300" : "text-[#374151] hover:text-slate-400"}`}>
                    {b} {b === "yearly" && <span className="ml-1 text-[10px] text-emerald-400">-17%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {PLANS.map(plan => {
                const Icon   = plan.icon;
                const active = plan.slug === currentPlan;
                const price  = billing === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.price;
                return (
                  <div
                    key={plan.slug}
                    className={`relative rounded-xl border p-5 transition-all ${
                      active
                        ? "border-violet-500/40 bg-violet-500/5 shadow-lg shadow-violet-500/5"
                        : plan.highlight
                          ? "border-violet-500/20 bg-[#0d0f1a]"
                          : "border-white/[0.06] bg-[#0d0f1a]"
                    }`}
                  >
                    {active && (
                      <div className="absolute -top-2.5 left-4 rounded-full border border-violet-500/30 bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                        Current
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${plan.badge}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[13px] font-semibold text-white">{plan.name}</span>
                    </div>

                    <div className="mb-4">
                      <span className="text-3xl font-bold text-white">${price}</span>
                      <span className="text-[12px] text-[#374151]">/mo</span>
                    </div>

                    <ul className="mb-5 space-y-1.5">
                      {plan.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-[12px] text-[#64748b]">
                          <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500/70" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <button className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[12px] font-semibold transition-all ${
                      active
                        ? "border border-violet-500/30 bg-violet-500/10 text-violet-400 cursor-default"
                        : "bg-gradient-to-r from-violet-600 to-violet-700 text-white hover:from-violet-500 hover:to-violet-600"
                    }`}>
                      {active ? "Current plan" : <><span>Upgrade</span><ArrowRight className="h-3 w-3" /></>}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Usage */}
        {activeTab === "usage" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {USAGE.map(u => {
                const pct = Math.round((u.used / u.limit) * 100);
                return (
                  <div key={u.label} className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5 text-[#374151]" />
                        <span className="text-[12px] font-medium text-[#64748b]">{u.label}</span>
                      </div>
                      <span className={`text-[11px] font-semibold ${pct > 80 ? "text-red-400" : pct > 60 ? "text-amber-400" : "text-emerald-400"}`}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.05]">
                      <div className={`h-full rounded-full transition-all ${u.color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[11px] text-[#374151]">
                      <span>{u.used.toLocaleString()} used</span>
                      <span>{u.limit.toLocaleString()} limit</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Invoices */}
        {activeTab === "invoices" && (
          <div className="rounded-xl border border-white/[0.06] bg-[#0d0f1a] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {["Invoice", "Date", "Amount", "Status", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[#374151] uppercase tracking-[0.08em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map(inv => (
                  <tr key={inv.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3.5 text-[13px] font-medium text-white">{inv.id}</td>
                    <td className="px-5 py-3.5 text-[12px] text-[#64748b]">{new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-5 py-3.5 text-[13px] text-white">${inv.amount}.00</td>
                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 capitalize">
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-[12px] text-violet-400 hover:text-violet-300 transition-colors">Download</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
