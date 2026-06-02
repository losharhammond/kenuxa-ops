"use client";

import { useMemo } from "react";
import { ShieldCheck, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreFactors {
  salesCount?: number;
  avgRating?: number;
  totalReviews?: number;
  verificationStatus?: string;
  yearsInBusiness?: number;
  profileComplete?: boolean;
  hasBanner?: boolean;
  hasLogo?: boolean;
  totalSales?: number;
}

export interface KenuxaScoreData {
  score: number;
  tier: "Unverified" | "Emerging" | "Trusted" | "Established" | "Elite";
  color: string;
  bgColor: string;
  ringColor: string;
  factors: { label: string; points: number; earned: number; met: boolean }[];
}

// ─── Compute Score ────────────────────────────────────────────────────────────

export function computeKenuxaScore(factors: ScoreFactors): KenuxaScoreData {
  const breakdown: { label: string; points: number; earned: number; met: boolean }[] = [
    {
      label: "Business Verification",
      points: 25,
      earned: factors.verificationStatus === "verified" ? 25 : factors.verificationStatus === "pending" ? 10 : 0,
      met: factors.verificationStatus === "verified",
    },
    {
      label: "Customer Reviews",
      points: 20,
      earned: Math.min((factors.totalReviews ?? 0) >= 20 ? 20 : Math.floor((factors.totalReviews ?? 0) / 20 * 20), 20),
      met: (factors.totalReviews ?? 0) >= 20,
    },
    {
      label: "Average Rating ≥ 4.0",
      points: 20,
      earned: (factors.avgRating ?? 0) >= 4.5 ? 20 : (factors.avgRating ?? 0) >= 4.0 ? 15 : (factors.avgRating ?? 0) >= 3.5 ? 8 : 0,
      met: (factors.avgRating ?? 0) >= 4.0,
    },
    {
      label: "Sales Activity",
      points: 20,
      earned: Math.min((factors.salesCount ?? 0) >= 100 ? 20 : Math.floor((factors.salesCount ?? 0) / 100 * 20), 20),
      met: (factors.salesCount ?? 0) >= 100,
    },
    {
      label: "Complete Business Profile",
      points: 10,
      earned: factors.profileComplete && factors.hasLogo ? 10 : factors.profileComplete ? 6 : factors.hasLogo ? 4 : 0,
      met: !!(factors.profileComplete && factors.hasLogo),
    },
    {
      label: "Business Tenure",
      points: 5,
      earned: (factors.yearsInBusiness ?? 0) >= 2 ? 5 : (factors.yearsInBusiness ?? 0) >= 1 ? 3 : 1,
      met: (factors.yearsInBusiness ?? 0) >= 1,
    },
  ];

  const score = Math.min(breakdown.reduce((s, f) => s + f.earned, 0), 100);

  let tier: KenuxaScoreData["tier"];
  let color: string;
  let bgColor: string;
  let ringColor: string;

  if (score >= 85) {
    tier = "Elite";
    color = "text-amber-400";
    bgColor = "bg-amber-400/10";
    ringColor = "#F59E0B";
  } else if (score >= 65) {
    tier = "Established";
    color = "text-[#FF8B5E]";
    bgColor = "bg-[rgba(255,101,36,0.1)]";
    ringColor = "#FF6524";
  } else if (score >= 45) {
    tier = "Trusted";
    color = "text-blue-400";
    bgColor = "bg-blue-400/10";
    ringColor = "#3B82F6";
  } else if (score >= 20) {
    tier = "Emerging";
    color = "text-emerald-400";
    bgColor = "bg-emerald-400/10";
    ringColor = "#10b981";
  } else {
    tier = "Unverified";
    color = "text-slate-400";
    bgColor = "bg-slate-400/10";
    ringColor = "#64748b";
  }

  return { score, tier, color, bgColor, ringColor, factors: breakdown };
}

// ─── Score Ring (SVG) ─────────────────────────────────────────────────────────

function ScoreRing({ score, ringColor, size = 80 }: { score: number; ringColor: string; size?: number }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={ringColor} strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ─── Compact Badge ────────────────────────────────────────────────────────────

export function KenuxaScoreBadge({ score, tier, color, bgColor }: Pick<KenuxaScoreData, "score" | "tier" | "color" | "bgColor">) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${bgColor} ${color} border-current/20`}>
      <ShieldCheck size={11} />
      {score} · {tier}
    </span>
  );
}

// ─── Full Score Card ──────────────────────────────────────────────────────────

interface KenuxaScoreCardProps {
  factors: ScoreFactors;
  compact?: boolean;
  showBreakdown?: boolean;
}

export function KenuxaScoreCard({ factors, compact = false, showBreakdown = true }: KenuxaScoreCardProps) {
  const data = useMemo(() => computeKenuxaScore(factors), [
    factors,
  ]);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${data.bgColor} border-current/10`}>
        <div className="relative flex-shrink-0">
          <ScoreRing score={data.score} ringColor={data.ringColor} size={52} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-black ${data.color}`}>{data.score}</span>
          </div>
        </div>
        <div>
          <p className={`text-sm font-bold ${data.color}`}>{data.tier}</p>
          <p className="text-xs text-[#64748b]">KENUXA Score</p>
        </div>
        <ShieldCheck size={16} className={`ml-auto ${data.color}`} />
      </div>
    );
  }

  return (
    <div className="bg-[#131621] border border-white/7 rounded-2xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <ScoreRing score={data.score} ringColor={data.ringColor} size={80} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black leading-none ${data.color}`}>{data.score}</span>
              <span className="text-[9px] text-[#374151] mt-0.5">/ 100</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <ShieldCheck size={16} className={data.color} />
              <span className={`text-lg font-bold ${data.color}`}>{data.tier}</span>
            </div>
            <p className="text-xs text-[#64748b]">KENUXA Business Score</p>
            <p className="text-xs text-[#374151] mt-1">
              {data.score >= 85 ? "Top-tier verified business on the network" :
               data.score >= 65 ? "Well-established with strong customer trust" :
               data.score >= 45 ? "Growing business with positive reputation" :
               data.score >= 20 ? "New to the network — keep building activity" :
               "Complete your profile to build your score"}
            </p>
          </div>
        </div>

        {/* Tier ladder */}
        <div className="flex flex-col gap-1 text-right hidden md:flex">
          {(["Elite", "Established", "Trusted", "Emerging", "Unverified"] as const).map((t) => (
            <span key={t} className={`text-[10px] font-medium ${t === data.tier ? data.color : "text-[#374151]"}`}>
              {t === data.tier ? "▶ " : "  "}{t}
            </span>
          ))}
        </div>
      </div>

      {/* Score breakdown */}
      {showBreakdown && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest">Score Breakdown</p>
          {data.factors.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {f.met
                  ? <CheckCircle2 size={14} className="text-emerald-400" />
                  : <Clock size={14} className="text-[#374151]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs ${f.met ? "text-[#f1f5f9]" : "text-[#64748b]"}`}>{f.label}</span>
                  <span className={`text-xs font-semibold ${f.met ? "text-emerald-400" : "text-[#374151]"}`}>
                    {f.earned}/{f.points}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: `${f.points > 0 ? (f.earned / f.points) * 100 : 0}%`,
                      background: f.met ? "#10b981" : data.ringColor,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tips to improve */}
      {data.score < 85 && (
        <div className="bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.12)] rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[#FF8B5E]" />
            <span className="text-xs font-semibold text-[#FF8B5E]">How to improve your score</span>
          </div>
          <ul className="space-y-0.5">
            {data.factors.filter((f) => !f.met).slice(0, 3).map((f) => (
              <li key={f.label} className="text-xs text-[#94a3b8] flex items-center gap-1.5">
                <AlertCircle size={10} className="text-[#374151] flex-shrink-0" />
                {f.label} (+{f.points - f.earned} pts)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
