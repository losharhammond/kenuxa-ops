"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import {
  ShoppingBag, Heart, Zap, CreditCard, Star, Sparkles,
  Package, Clock, CheckCircle, XCircle, Loader2,
  TrendingUp, Gift, Wallet,
} from "lucide-react";

const TABS = [
  { id: "orders",          label: "Orders",          icon: ShoppingBag },
  { id: "wishlist",        label: "Wishlist",         icon: Heart },
  { id: "rewards",         label: "Rewards",          icon: Zap },
  { id: "wallet",          label: "Wallet",           icon: CreditCard },
  { id: "reviews",         label: "Reviews",          icon: Star },
  { id: "recommendations", label: "For You",          icon: Sparkles },
] as const;

type TabId = typeof TABS[number]["id"];

interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  items_count: number;
  seller_name?: string;
}

interface WishlistItem {
  id: string;
  product_name: string;
  price: number;
  currency: string;
  image_url?: string;
  business_name?: string;
}

interface WalletData {
  balance: number;
  currency: string;
  status: string;
}

interface RewardsData {
  points: number;
  lifetime_points: number;
  tier: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  entity_name?: string;
}

const QUICK_LINKS = [
  { id: "r1", label: "Groceries near you",    href: "/dashboard/marketplace?cat=groceries",  color: "#10b981" },
  { id: "r2", label: "Trending tech deals",   href: "/dashboard/marketplace?cat=tech",       color: "#3b82f6" },
  { id: "r3", label: "Local pharmacies",      href: "/dashboard/directory?type=pharmacy",    color: "#8b5cf6" },
  { id: "r4", label: "Weekend services",      href: "/dashboard/services",                   color: "#f59e0b" },
  { id: "r5", label: "Job openings near you", href: "/dashboard/jobs",                       color: "#FF8B5E" },
  { id: "r6", label: "Freelancers you need",  href: "/dashboard/freelancers",                color: "#ec4899" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  delivered:  { label: "Delivered",  color: "#10b981", icon: CheckCircle },
  shipped:    { label: "Shipped",    color: "#3b82f6", icon: Package },
  processing: { label: "Processing", color: "#f59e0b", icon: Clock },
  cancelled:  { label: "Cancelled",  color: "#f87171", icon: XCircle },
};

const TIER_CONFIG: Record<string, { label: string; color: string; min: number; max: number }> = {
  bronze:   { label: "Bronze",   color: "#cd7f32", min: 0,     max: 999 },
  silver:   { label: "Silver",   color: "#94a3b8", min: 1000,  max: 4999 },
  gold:     { label: "Gold",     color: "#f59e0b", min: 5000,  max: 19999 },
  platinum: { label: "Platinum", color: "#8b5cf6", min: 20000, max: 99999 },
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AccountPage() {
  const supabase = createClient();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist] = useState<WishlistItem[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [rewards, setRewards] = useState<RewardsData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);

    const [ordersRes, walletRes, rewardsRes, reviewsRes] = await Promise.all([
      supabase.from("orders").select("id,status,total,currency,created_at,items_count,seller_name").eq("buyer_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("wallets").select("balance,currency,status").eq("user_id", user.id).single(),
      supabase.from("rewards_accounts").select("points,lifetime_points,tier").eq("user_id", user.id).single(),
      supabase.from("business_reviews").select("id,rating,comment,created_at").eq("reviewer_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    setOrders((ordersRes.data as Order[]) ?? []);
    setWallet(walletRes.data as WalletData | null ?? { balance: 0, currency: "GHS", status: "active" });
    setRewards(rewardsRes.data as RewardsData | null ?? { points: 100, lifetime_points: 100, tier: "bronze" });
    setReviews((reviewsRes.data as Review[] | null) ?? []);
    setLoading(false);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const tierInfo = TIER_CONFIG[rewards?.tier ?? "bronze"] ?? TIER_CONFIG.bronze!;
  const nextTier = Object.values(TIER_CONFIG).find((t) => t.min > (rewards?.points ?? 0));
  const progress = rewards ? Math.min(100, ((rewards.points - tierInfo.min) / (tierInfo.max - tierInfo.min + 1)) * 100) : 0;

  return (
    <>
      <Header title="My Account" subtitle="Orders, wallet, rewards & more" />
      <div className="p-6 space-y-5">
        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
            <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Orders</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{orders.filter((o) => o.status !== "cancelled").length}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
            <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Wallet</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{wallet?.currency} {(wallet?.balance ?? 0).toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
            <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Points</p>
            <p className="text-2xl font-bold" style={{ color: tierInfo.color }}>{(rewards?.points ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                tab === id ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.25)]" : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5"
              }`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-[#374151]" />
          </div>
        ) : (
          <>
            {/* ORDERS */}
            {tab === "orders" && (
              <div className="space-y-2">
                {orders.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/7 rounded-2xl">
                    <ShoppingBag size={32} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">No orders yet</p>
                    <Link href="/dashboard/marketplace">
                      <button className="mt-3 text-xs text-[#FF8B5E] hover:text-[#FF6524]">Browse products →</button>
                    </Link>
                  </div>
                ) : orders.map((order) => {
                  const st = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.processing!;
                  const Icon = st.icon;
                  return (
                    <div key={order.id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${st.color}18` }}>
                        <Icon size={14} style={{ color: st.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9]">{order.id}</p>
                        <p className="text-xs text-[#374151]">{order.seller_name ?? "Seller"} · {order.items_count} item{order.items_count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-[#f1f5f9]">{order.currency} {order.total.toLocaleString()}</p>
                        <span className="text-[10px] font-medium capitalize" style={{ color: st.color }}>{st.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* WISHLIST */}
            {tab === "wishlist" && (
              <div className="space-y-2">
                {wishlist.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/7 rounded-2xl">
                    <Heart size={32} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">Your wishlist is empty</p>
                    <Link href="/dashboard/marketplace">
                      <button className="mt-3 text-xs text-[#FF8B5E] hover:text-[#FF6524]">Discover products →</button>
                    </Link>
                  </div>
                ) : wishlist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-4 rounded-xl bg-[#111624] border border-white/7">
                    <div className="w-9 h-9 rounded-xl bg-[rgba(255,101,36,0.08)] flex items-center justify-center flex-shrink-0">
                      <ShoppingBag size={14} className="text-[#FF8B5E]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9] truncate">{item.product_name}</p>
                      <p className="text-xs text-[#374151]">{item.business_name}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#f1f5f9] flex-shrink-0">{item.currency} {item.price.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {/* REWARDS */}
            {tab === "rewards" && (
              <div className="space-y-4">
                {/* Tier card */}
                <div className="p-5 rounded-2xl border" style={{ borderColor: `${tierInfo.color}30`, background: `${tierInfo.color}08` }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-[#64748b] mb-0.5">Current Tier</p>
                      <p className="text-xl font-bold" style={{ color: tierInfo.color }}>{tierInfo.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#64748b] mb-0.5">Available Points</p>
                      <p className="text-2xl font-bold text-[#f1f5f9]">{(rewards?.points ?? 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: tierInfo.color }} />
                  </div>
                  {nextTier && (
                    <p className="text-xs text-[#374151] mt-1.5">
                      {(nextTier.min - (rewards?.points ?? 0)).toLocaleString()} pts to {nextTier.label}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                    <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Lifetime Points</p>
                    <p className="text-xl font-bold text-[#f1f5f9]">{(rewards?.lifetime_points ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                    <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Redeemable</p>
                    <p className="text-xl font-bold text-[#f1f5f9]">{(rewards?.points ?? 0).toLocaleString()}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.15)]">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift size={13} className="text-[#FF8B5E]" />
                    <p className="text-xs font-semibold text-[#FF8B5E]">How to earn more</p>
                  </div>
                  <ul className="space-y-1 text-xs text-[#64748b]">
                    <li>• Make a purchase — earn 5% in points</li>
                    <li>• Refer a friend — 500 bonus points each</li>
                    <li>• Complete your profile — 200 points</li>
                    <li>• Verify your identity — 500 points</li>
                    <li>• Leave a review — 50 points</li>
                  </ul>
                </div>
              </div>
            )}

            {/* WALLET */}
            {tab === "wallet" && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-[#1a1f35] to-[#111624] border border-white/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[rgba(255,101,36,0.06)] rounded-full -translate-y-8 translate-x-8" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <Wallet size={15} className="text-[#FF8B5E]" />
                      <p className="text-xs font-semibold text-[#64748b] uppercase tracking-widest">KENUXA Wallet</p>
                    </div>
                    <p className="text-4xl font-bold text-[#f1f5f9] mb-1">{wallet?.currency} {(wallet?.balance ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-[#374151]">Available balance · {wallet?.status === "active" ? "Active" : wallet?.status}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="h-11 rounded-xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                    Add Money
                  </button>
                  <button className="h-11 rounded-xl border border-white/10 bg-[#111624] text-[#f1f5f9] text-sm font-medium hover:bg-white/5 transition-colors">
                    Send Money
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
                  <p className="text-xs font-semibold text-[#64748b] mb-3">Quick Actions</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-[#64748b]">
                    {["Pay Bills", "Buy Airtime", "Transfer"].map((a) => (
                      <div key={a} className="p-3 rounded-lg bg-white/3 hover:bg-white/5 cursor-pointer transition-colors">
                        <CreditCard size={16} className="mx-auto mb-1 text-[#374151]" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>

                <Link href="/dashboard/wallet">
                  <button className="w-full h-10 rounded-xl border border-white/10 text-xs text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-colors">
                    View full wallet →
                  </button>
                </Link>
              </div>
            )}

            {/* REVIEWS */}
            {tab === "reviews" && (
              <div className="space-y-2">
                {reviews.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-white/7 rounded-2xl">
                    <Star size={32} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">No reviews written yet</p>
                    <p className="text-xs text-[#374151] mt-1">Reviews earn you 50 reward points each</p>
                  </div>
                ) : reviews.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl bg-[#111624] border border-white/7">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={11} className={i < r.rating ? "text-[#f59e0b] fill-[#f59e0b]" : "text-[#374151]"} />
                      ))}
                      <span className="text-[10px] text-[#374151] ml-1">{relTime(r.created_at)}</span>
                    </div>
                    {r.comment && <p className="text-xs text-[#94a3b8]">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* RECOMMENDATIONS */}
            {tab === "recommendations" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)]">
                  <Sparkles size={13} className="text-[#FF8B5E] flex-shrink-0" />
                  <p className="text-xs text-[#94a3b8]">AI-curated recommendations based on your activity and location.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {QUICK_LINKS.map((rec) => (
                    <Link key={rec.id} href={rec.href}>
                      <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-all cursor-pointer">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: `${rec.color}15` }}>
                          <TrendingUp size={13} style={{ color: rec.color }} />
                        </div>
                        <p className="text-xs font-medium text-[#f1f5f9]">{rec.label}</p>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-[#111624] border border-white/7 text-center">
                  <p className="text-xs text-[#374151] mb-2">Complete your profile to get better recommendations</p>
                  <Link href="/dashboard/identity">
                    <button className="px-4 py-1.5 rounded-lg border border-[rgba(255,101,36,0.2)] text-xs text-[#FF8B5E] hover:bg-[rgba(255,101,36,0.08)] transition-colors">
                      Complete Profile →
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
