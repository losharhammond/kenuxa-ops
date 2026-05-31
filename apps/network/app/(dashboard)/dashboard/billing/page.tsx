"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  CheckCircle, Zap, Building2, Shield, Loader2,
  CreditCard, Receipt, ArrowRight, Star,
} from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string;
  billing_cycle: string;
  amount: number;
  currency: string;
}

interface BillingHistory {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "",
    desc: "Personal — forever free",
    features: [
      "KENUXA ID + Wallet",
      "Shop the marketplace",
      "Apply to jobs & gigs",
      "KENUX rewards",
      "AI assistant (10 queries/month)",
      "Community access",
    ],
    color: "#64748b",
    cta: "Current Plan",
  },
  {
    id: "business",
    name: "Business",
    price: 149,
    period: "/mo",
    desc: "Full operating system for SMEs",
    badge: "Most Popular",
    features: [
      "Everything in Free",
      "Full POS + Inventory",
      "CRM + Customer Loyalty",
      "Marketplace storefront",
      "AI Business Assistant (unlimited)",
      "Marketing platform",
      "50 staff accounts · 5 branches",
      "Financial services access",
      "Priority support",
    ],
    color: "#FF6524",
    cta: "Upgrade to Business",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: null,
    period: "",
    desc: "For chains, groups & institutions",
    features: [
      "Everything in Business",
      "Unlimited branches",
      "API access + webhooks",
      "Custom integrations",
      "Dedicated account manager",
      "99.9% SLA guarantee",
      "White-label options",
      "Treasury dashboard",
    ],
    color: "#8b5cf6",
    cta: "Contact Sales",
  },
];

const ADDON_CATALOG = [
  { id: "ai_boost",    name: "AI Boost",      desc: "500 extra AI queries/month",        price: 29,  color: "#8b5cf6" },
  { id: "extra_staff", name: "Extra Staff",   desc: "+25 staff accounts",                price: 49,  color: "#3b82f6" },
  { id: "sms_bundle",  name: "SMS Bundle",    desc: "1,000 SMS credits/month",           price: 39,  color: "#10b981" },
  { id: "api_access",  name: "API Access",    desc: "REST API + webhook integration",    price: 99,  color: "#f59e0b" },
];

export default function BillingPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<BillingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [tab, setTab] = useState<"plans" | "history" | "addons">("plans");

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const [subRes, histRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", user.id).eq("status", "active").single(),
      supabase.from("billing_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setSub(subRes.data as Subscription | null);
    setHistory((histRes.data ?? []) as BillingHistory[]);
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleUpgrade = async (planId: string, price: number) => {
    setUpgrading(planId);
    const res = await fetch("/api/payments/paystack/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: price * 100,
        currency: "GHS",
        purpose: "subscription",
        metadata: { plan: planId },
      }),
    });
    const data = await res.json();
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
    setUpgrading(null);
  };

  const currentPlan = sub?.plan ?? "free";

  return (
    <>
      <Header title="Billing & Subscription" subtitle="Manage your plan and payment history" />
      <div className="p-6 space-y-5">

        {/* Current plan banner */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)]">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,101,36,0.12)] flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-[#FF8B5E]" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#f1f5f9]">
              {currentPlan === "free" ? "Free Plan" : `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan`}
            </p>
            {sub?.current_period_end ? (
              <p className="text-xs text-[#64748b]">Renews {new Date(sub.current_period_end).toLocaleDateString("en-GH", { day: "numeric", month: "long", year: "numeric" })}</p>
            ) : (
              <p className="text-xs text-[#64748b]">Upgrade to unlock the full KENUXA operating system</p>
            )}
          </div>
          {currentPlan !== "enterprise" && (
            <button onClick={() => setTab("plans")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
              Upgrade <ArrowRight size={11} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5">
          {(["plans", "addons", "history"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                tab === t ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.25)]" : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
              }`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-[#374151]" />
          </div>
        ) : (
          <>
            {/* Plans */}
            {tab === "plans" && (
              <div className="space-y-3">
                {PLANS.map((plan) => {
                  const isCurrent = currentPlan === plan.id;
                  return (
                    <div key={plan.id} className={`relative rounded-2xl border p-5 transition-all ${
                      isCurrent ? "border-[rgba(255,101,36,0.4)] bg-[rgba(255,101,36,0.04)]" : "border-white/7 bg-[#111624]"
                    }`}>
                      {plan.badge && (
                        <div className="absolute -top-3 left-5 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">
                          {plan.badge}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-bold text-[#f1f5f9]">{plan.name}</p>
                            {isCurrent && <span className="text-[10px] bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.2)] px-2 py-0.5 rounded-full font-semibold">Active</span>}
                          </div>
                          <p className="text-xs text-[#374151]">{plan.desc}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-black text-[#f1f5f9]">{plan.price === null ? "Custom" : plan.price === 0 ? "Free" : `GH₵ ${plan.price}`}</p>
                          <p className="text-[10px] text-[#374151]">{plan.period}</p>
                        </div>
                      </div>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-4">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-xs text-[#94a3b8]">
                            <CheckCircle size={11} className="text-[#10b981] flex-shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {!isCurrent && (
                        <button
                          onClick={() => plan.price ? handleUpgrade(plan.id, plan.price) : undefined}
                          disabled={upgrading === plan.id}
                          className="w-full h-10 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white hover:opacity-90 disabled:opacity-50">
                          {upgrading === plan.id ? <><Loader2 size={13} className="animate-spin" /> Processing...</> : plan.cta}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add-ons */}
            {tab === "addons" && (
              <div className="space-y-2">
                {ADDON_CATALOG.map(({ id, name, desc, price, color }) => (
                  <div key={id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                      <Star size={14} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9]">{name}</p>
                      <p className="text-xs text-[#374151]">{desc}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-[#f1f5f9]">GH₵ {price}/mo</span>
                      <button onClick={() => handleUpgrade(id, price)} disabled={upgrading === id}
                        className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                        {upgrading === id ? "..." : "Add"}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="p-4 rounded-xl bg-[rgba(139,92,246,0.05)] border border-[rgba(139,92,246,0.15)] text-center mt-4">
                  <p className="text-xs text-[#374151]">Pay with GHS or use KENUX for a 10% discount on add-ons.</p>
                </div>
              </div>
            )}

            {/* Billing history */}
            {tab === "history" && (
              <div className="space-y-2">
                {history.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/7 rounded-2xl">
                    <Receipt size={32} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">No billing history yet</p>
                  </div>
                ) : history.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
                      <CreditCard size={14} className="text-[#10b981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9]">{item.description}</p>
                      <p className="text-xs text-[#374151]">{new Date(item.created_at).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-[#f1f5f9]">{item.currency} {item.amount.toLocaleString()}</p>
                      <span className={`text-[10px] font-medium ${item.status === "paid" ? "text-[#10b981]" : "text-[#f87171]"}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Security note */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[#0d0f1a] border border-white/5">
          <Shield size={13} className="text-[#374151] flex-shrink-0" />
          <p className="text-xs text-[#374151]">All payments are processed securely via Paystack. Your card details are never stored on KENUXA servers.</p>
        </div>
      </div>
    </>
  );
}
