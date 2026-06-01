"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Shield, TrendingUp, CheckCircle, Clock, AlertCircle,
  Building2, ShoppingBag, Star, Briefcase, Factory,
  Loader2, ArrowRight, Zap, RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface CreditProfile {
  kenuxa_score: number;
  trust_score: number;
  business_score: number | null;
  talent_score: number | null;
  supplier_score: number | null;
  last_calculated: string;
}

const SCORE_BANDS = [
  { min: 0,   max: 300, label: "Poor",      color: "#f87171", bg: "rgba(248,113,113,0.1)" },
  { min: 301, max: 500, label: "Fair",       color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  { min: 501, max: 650, label: "Good",       color: "#06b6d4", bg: "rgba(6,182,212,0.1)"   },
  { min: 651, max: 750, label: "Very Good",  color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  { min: 751, max: 850, label: "Excellent",  color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
];

function getBand(score: number) {
  return SCORE_BANDS.find((b) => score >= b.min && score <= b.max) ?? SCORE_BANDS[0]!;
}

const SCORE_FACTORS = [
  { icon: Building2,   label: "Business Activity",     desc: "Revenue, orders & customer growth",       weight: "30%" },
  { icon: ShoppingBag, label: "Purchase History",       desc: "On-time payments & transaction volume",   weight: "25%" },
  { icon: Star,        label: "Platform Reputation",    desc: "Reviews, ratings & trust score",          weight: "20%" },
  { icon: Briefcase,   label: "Employment & Skills",    desc: "Work history & verified credentials",     weight: "15%" },
  { icon: Factory,     label: "Supply Chain Activity",  desc: "Contract performance & reliability",      weight: "10%" },
];

const CREDIT_PRODUCTS = [
  { name: "Working Capital",   limit: "Up to GH₵ 50,000",   rate: "From 18% p.a.",    eligible: true },
  { name: "Invoice Financing", limit: "Up to GH₵ 100,000",  rate: "From 15% p.a.",    eligible: true },
  { name: "BNPL",              limit: "Up to GH₵ 5,000",    rate: "0% for 30 days",   eligible: true },
  { name: "Inventory Finance", limit: "Up to GH₵ 200,000",  rate: "From 20% p.a.",    eligible: false },
];

function ScoreGauge({ score, color }: { score: number; color: string }) {
  const pct = Math.min(100, (score / 850) * 100);
  const r = 70;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ * 0.75; // 270deg arc

  return (
    <svg width="160" height="120" viewBox="0 0 160 120" className="mx-auto">
      {/* Track */}
      <path
        d="M 20 110 A 70 70 0 1 1 140 110"
        fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d="M 20 110 A 70 70 0 1 1 140 110"
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        style={{ transition: "stroke-dasharray 1s ease" }}
      />
      {/* Score text */}
      <text x="80" y="85" textAnchor="middle" fill="#f1f5f9" fontSize="28" fontWeight="900">{score}</text>
      <text x="80" y="105" textAnchor="middle" fill="#64748b" fontSize="10">/850</text>
    </svg>
  );
}

export default function CreditPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreditProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("credit_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    setProfile(data as CreditProfile | null);
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshScore = useCallback(async () => {
    setLoading(true);
    await fetch("/api/credit/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const displayProfile = profile ?? { kenuxa_score: 500, trust_score: 50, business_score: null, talent_score: null, supplier_score: null, last_calculated: new Date().toISOString() };
  const band = getBand(displayProfile.kenuxa_score);

  return (
    <>
      <Header title="KENUXA Credit" subtitle="Your economic credit profile"
        actions={
          <button onClick={refreshScore} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-all">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Score
          </button>
        }
      />
      <div className="p-6 space-y-5">

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#374151]" />
          </div>
        ) : (
          <>
            {/* Main score card */}
            <div className="rounded-2xl border p-5 text-center" style={{ borderColor: `${band.color}30`, background: band.bg }}>
              <ScoreGauge score={displayProfile.kenuxa_score} color={band.color} />
              <p className="text-lg font-bold mt-2" style={{ color: band.color }}>{band.label}</p>
              <p className="text-xs text-[#64748b] mt-1">
                Last updated {new Date(displayProfile.last_calculated).toLocaleDateString("en-GH")}
              </p>
              {!profile && (
                <button onClick={refreshScore} className="mt-3 text-xs text-[#FF8B5E] hover:underline flex items-center gap-1 mx-auto">
                  <RefreshCw size={10} /> Compute my score now
                </button>
              )}
            </div>

            {/* Sub-scores */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Trust Score</p>
                <p className="text-2xl font-bold text-[#f1f5f9]">{displayProfile.trust_score}<span className="text-sm text-[#374151]">/100</span></p>
              </div>
              <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Business Score</p>
                <p className="text-2xl font-bold text-[#f1f5f9]">{displayProfile.business_score ?? "—"}</p>
                {!displayProfile.business_score && <p className="text-[10px] text-[#374151] mt-0.5">Register a business to unlock</p>}
              </div>
            </div>

            {/* Score factors */}
            <div>
              <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Score Factors</p>
              <div className="space-y-2">
                {SCORE_FACTORS.map(({ icon: Icon, label, desc, weight }) => (
                  <div key={label} className="flex items-center gap-3 p-3.5 rounded-xl bg-[#111624] border border-white/7">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.08)] flex items-center justify-center flex-shrink-0">
                      <Icon size={13} className="text-[#FF8B5E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#f1f5f9]">{label}</p>
                      <p className="text-[10px] text-[#374151]">{desc}</p>
                    </div>
                    <span className="text-xs font-bold text-[#64748b] flex-shrink-0">{weight}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to improve */}
            <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={13} className="text-[#10b981]" />
                <p className="text-xs font-semibold text-[#10b981]">Improve Your Score</p>
              </div>
              <ul className="space-y-1.5 text-xs text-[#64748b]">
                <li className="flex items-center gap-2"><CheckCircle size={10} className="text-[#10b981]" /> Complete your KENUXA ID verification (+80 pts)</li>
                <li className="flex items-center gap-2"><CheckCircle size={10} className="text-[#10b981]" /> Register and verify a business (+120 pts)</li>
                <li className="flex items-center gap-2"><Clock size={10} className="text-[#374151]" /> Make consistent on-time payments (+30 pts/mo)</li>
                <li className="flex items-center gap-2"><Clock size={10} className="text-[#374151]" /> Collect 10+ positive reviews (+50 pts)</li>
                <li className="flex items-center gap-2"><AlertCircle size={10} className="text-[#f59e0b]" /> Avoid disputes and chargebacks</li>
              </ul>
            </div>

            {/* Eligible products */}
            <div>
              <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Financial Products</p>
              <div className="space-y-2">
                {CREDIT_PRODUCTS.map(({ name, limit, rate, eligible }) => (
                  <div key={name} className={`flex items-center gap-3 p-4 rounded-xl border ${
                    eligible ? "bg-[#111624] border-white/7" : "bg-[#0d0f1a] border-white/4 opacity-60"
                  }`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${eligible ? "bg-[rgba(16,185,129,0.1)]" : "bg-white/3"}`}>
                      {eligible ? <CheckCircle size={14} className="text-[#10b981]" /> : <Shield size={14} className="text-[#374151]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9]">{name}</p>
                      <p className="text-xs text-[#374151]">{limit} · {rate}</p>
                    </div>
                    {eligible ? (
                      <Link href="/dashboard/lending">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.12)] text-[#10b981] text-xs font-semibold hover:bg-[rgba(16,185,129,0.2)] transition-colors">
                          Apply <ArrowRight size={10} />
                        </button>
                      </Link>
                    ) : (
                      <span className="text-[10px] text-[#374151]">Score too low</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Zap */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.15)]">
              <Zap size={13} className="text-[#FF8B5E] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#64748b]">Your KENUXA Credit score is built entirely from your real platform activity — no external credit bureau required. Higher activity = higher score = better financing terms.</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
