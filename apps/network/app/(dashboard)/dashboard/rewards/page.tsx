"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  Gift, Star, Zap, TrendingUp, Trophy, Award,
  ShoppingBag, CheckCircle2, ArrowRight,
  Crown, Flame, Target, Lock,
} from "lucide-react";

interface RewardTransaction {
  id: string;
  points: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface RewardTier {
  name: string;
  minPoints: number;
  color: string;
  icon: React.ElementType;
  perks: string[];
}

const TIERS: RewardTier[] = [
  {
    name: "Bronze",
    minPoints: 0,
    color: "#cd7f32",
    icon: Award,
    perks: ["2% cashback on purchases", "Priority support access", "Exclusive deals"],
  },
  {
    name: "Silver",
    minPoints: 500,
    color: "#94a3b8",
    icon: Star,
    perks: ["4% cashback on purchases", "Free delivery credits", "Early access to sales", "Partner discounts"],
  },
  {
    name: "Gold",
    minPoints: 2000,
    color: "#F59E0B",
    icon: Trophy,
    perks: ["6% cashback on purchases", "Dedicated account manager", "Zero transaction fees", "Premium marketplace access"],
  },
  {
    name: "Platinum",
    minPoints: 10000,
    color: "#a78bfa",
    icon: Crown,
    perks: ["10% cashback on purchases", "Monthly bonus points", "VIP event invitations", "Custom business solutions"],
  },
];

const HOW_TO_EARN = [
  { action: "Make a purchase", points: "+10 pts",  icon: ShoppingBag, color: "text-[#FF8B5E]" },
  { action: "Complete your profile", points: "+50 pts", icon: CheckCircle2, color: "text-[#10b981]" },
  { action: "Write a review",  points: "+25 pts",  icon: Star,        color: "text-[#F59E0B]" },
  { action: "Refer a friend",  points: "+100 pts", icon: Gift,        color: "text-[#8B5CF6]" },
  { action: "Daily login",     points: "+5 pts",   icon: Flame,       color: "text-[#f87171]"  },
  { action: "Complete a task", points: "+15 pts",  icon: Target,      color: "text-[#3B82F6]"  },
];

export default function RewardsPage() {
  const { profile } = useAuth();
  const supabase = createClient();
  const [points, setPoints] = useState(0);
  const [lifetime, setLifetime] = useState(0);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data: acct } = await supabase
        .from("rewards_accounts")
        .select("points, lifetime_points")
        .eq("user_id", profile.id)
        .maybeSingle();

      setPoints((acct as { points: number; lifetime_points: number } | null)?.points ?? 0);
      setLifetime((acct as { points: number; lifetime_points: number } | null)?.lifetime_points ?? 0);

      const { data: ledger } = await supabase
        .from("kenux_ledger")
        .select("id, points, entry_type, reason, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      const txns = (ledger ?? []).map((r) => ({
        id: r.id as string,
        points: r.entry_type === "earn" ? (r.points as number) : -(r.points as number),
        type: r.entry_type as string,
        description: (r.reason as string | null),
        created_at: r.created_at as string,
      }));
      setTransactions(txns);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const currentTier = TIERS.slice().reverse().find((t) => lifetime >= t.minPoints) ?? TIERS[0]!;
  const nextTier = TIERS[TIERS.indexOf(currentTier) + 1];
  const progressToNext = nextTier
    ? Math.min(100, Math.round(((lifetime - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100))
    : 100;

  const TierIcon = currentTier.icon;

  return (
    <div className="animate-fade-in">
      <Header
        title="Rewards"
        subtitle="Earn points, unlock perks & climb the tiers"
        actions={<Button size="sm"><Gift size={14} /> Redeem Points</Button>}
      />

      <div className="p-6 space-y-6">
        {/* Current tier + points hero */}
        <div
          className="relative rounded-2xl overflow-hidden border p-6"
          style={{ borderColor: `${currentTier.color}33`, background: `linear-gradient(135deg, ${currentTier.color}12 0%, transparent 60%)` }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TierIcon size={16} style={{ color: currentTier.color }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: currentTier.color }}>
                  {currentTier.name} Member
                </span>
              </div>
              <h2 className="text-3xl font-bold text-[#f1f5f9]">{points.toLocaleString()} <span className="text-sm font-normal text-[#64748b]">points available</span></h2>
              <p className="text-sm text-[#64748b] mt-1">{lifetime.toLocaleString()} lifetime points earned</p>
            </div>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `${currentTier.color}20` }}
            >
              <TierIcon size={28} style={{ color: currentTier.color }} />
            </div>
          </div>

          {nextTier && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#64748b]">Progress to {nextTier.name}</span>
                <span style={{ color: currentTier.color }}>{progressToNext}%</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressToNext}%`, background: currentTier.color }}
                />
              </div>
              <p className="text-xs text-[#64748b] mt-1.5">
                {(nextTier.minPoints - lifetime).toLocaleString()} more points to reach {nextTier.name}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="Available Points" value={loading ? 0 : points}    format="number" color="orange" icon={<Zap size={16} />} />
          <StatCard title="Lifetime Points"  value={loading ? 0 : lifetime}  format="number" color="amber"  icon={<Trophy size={16} />} />
          <StatCard title="Transactions"     value={loading ? 0 : transactions.length} format="number" color="blue" icon={<TrendingUp size={16} />} />
          <StatCard title="Tier"             value={TIERS.indexOf(currentTier) + 1}    format="number" color="green" icon={<Star size={16} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transaction history */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>Points History</CardTitle></CardHeader>
              <CardContent className="p-0 divide-y divide-white/5">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 m-4 bg-white/3 rounded-lg animate-pulse" />)
                ) : transactions.length === 0 ? (
                  <div className="p-10 text-center">
                    <Gift size={32} className="mx-auto mb-2 text-[#374151]" />
                    <p className="text-sm text-[#64748b]">No reward transactions yet.</p>
                    <p className="text-xs text-[#374151] mt-1">Start earning by making purchases and completing your profile.</p>
                  </div>
                ) : (
                  transactions.map((t) => (
                    <div key={t.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.points > 0 ? "bg-[rgba(16,185,129,0.1)]" : "bg-[rgba(239,68,68,0.1)]"}`}>
                          {t.points > 0
                            ? <TrendingUp size={14} className="text-[#10b981]" />
                            : <ArrowRight size={14} className="text-[#f87171] rotate-45" />
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f1f5f9] truncate">{t.description ?? t.type}</p>
                          <p className="text-xs text-[#64748b]">{formatDate(t.created_at)}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ml-3 ${t.points > 0 ? "text-[#10b981]" : "text-[#f87171]"}`}>
                        {t.points > 0 ? "+" : ""}{t.points.toLocaleString()} pts
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* How to earn */}
            <Card>
              <CardHeader><CardTitle>How to Earn</CardTitle></CardHeader>
              <CardContent className="p-0">
                {HOW_TO_EARN.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <Icon size={14} className={item.color} />
                        <span className="text-sm text-[#94a3b8]">{item.action}</span>
                      </div>
                      <span className="text-xs font-bold text-[#10b981]">{item.points}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Tier benefits */}
            <Card>
              <CardHeader><CardTitle>Your Perks</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {currentTier.perks.map((perk, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 size={13} style={{ color: currentTier.color }} className="flex-shrink-0" />
                    <span className="text-[#94a3b8]">{perk}</span>
                  </div>
                ))}
                {nextTier && (
                  <>
                    <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest pt-2 border-t border-white/7">Unlock at {nextTier.name}</p>
                    {nextTier.perks.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm opacity-40">
                        <Lock size={12} className="flex-shrink-0 text-[#64748b]" />
                        <span className="text-[#64748b]">{perk}</span>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* All tiers */}
        <div>
          <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Membership Tiers</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isActive = tier.name === currentTier.name;
              const isUnlocked = lifetime >= tier.minPoints;
              return (
                <div
                  key={tier.name}
                  className={`p-4 rounded-xl border transition-all ${isActive ? "border-current" : isUnlocked ? "border-white/10" : "border-white/5 opacity-50"}`}
                  style={isActive ? { borderColor: `${tier.color}60`, background: `${tier.color}0a` } : {}}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon size={18} style={{ color: tier.color }} />
                    {isActive && <Badge variant="green" className="text-[9px]">Current</Badge>}
                    {!isUnlocked && <Lock size={11} className="text-[#374151]" />}
                  </div>
                  <p className="text-sm font-bold" style={{ color: tier.color }}>{tier.name}</p>
                  <p className="text-xs text-[#64748b] mt-0.5">{tier.minPoints.toLocaleString()}+ pts</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
