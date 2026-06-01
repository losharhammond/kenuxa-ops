"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import { useIndustry } from "@/lib/hooks/use-industry";
import { IndustryBanner } from "@/components/ui/industry-banner";
import type { Role } from "@/lib/rbac";
import {
  Monitor, Package, FileText, Users, Briefcase, Factory,
  Sparkles, AlertTriangle, TrendingUp, Zap, Compass, Gift,
  ShoppingBag, CheckCircle2, Clock, ArrowRight, Truck,
  Wrench, CreditCard, ClipboardList, Pen, Star, Map,
  Landmark, Wallet, Shield, Globe, BarChart3, Bell,
  BadgeCheck, DollarSign, ChevronRight, Activity,
  Search, Flame, MessageSquare, HandCoins, Award,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const today = new Date().toLocaleDateString("en-GH", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

function WelcomeBanner({
  name, subtitle, cta, ctaHref, icon: Icon, color,
}: {
  name: string;
  subtitle: string;
  cta?: string | undefined;
  ctaHref?: string | undefined;
  icon?: React.ElementType | undefined;
  color?: string | undefined;
}) {
  const BgIcon = Icon;
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[rgba(255,101,36,0.2)] bg-gradient-to-r from-[rgba(255,101,36,0.1)] via-[rgba(255,101,36,0.04)] to-transparent p-5">
      <div className="relative z-10">
        <p className="text-xs text-[#64748b] mb-1">{today}</p>
        <h2 className="text-lg font-bold text-[#f1f5f9]">
          {greeting()}, <span className="text-[#FF8B5E]">{name.split(" ")[0] ?? "there"}</span>
        </h2>
        <p className="text-sm text-[#64748b] mt-1">{subtitle}</p>
        {cta && ctaHref && (
          <Link href={ctaHref}>
            <button className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[rgba(255,101,36,0.15)] border border-[rgba(255,101,36,0.25)] text-[#FF8B5E] text-xs font-semibold hover:bg-[rgba(255,101,36,0.2)] transition-colors">
              {cta} <ChevronRight size={12} />
            </button>
          </Link>
        )}
      </div>
      {BgIcon && (
        <BgIcon
          size={80}
          className="absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.06]"
          style={{ color: color ?? "#FF6524" }}
        />
      )}
    </div>
  );
}

function QuickActions({ actions }: { actions: { label: string; href: string; icon: React.ElementType; color: string; bg: string }[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#2d3450] uppercase tracking-widest mb-3">Quick Actions</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {actions.map(({ href, label, icon: Icon, color, bg }) => (
          <Link key={href + label} href={href}>
            <Card className="p-3.5 text-center hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-[11px] text-[#64748b] group-hover:text-[#f1f5f9] transition-colors leading-tight font-medium">{label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// BUSINESS OWNER / MANAGER / CASHIER HOME
// ─────────────────────────────────────────────────────────────
function BusinessHome({ profile, role }: { profile: ReturnType<typeof useAuth>["profile"]; role: string }) {
  const supabase = createClient();
  const industry = useIndustry((profile as { category?: string } | null)?.category ?? null);
  const [stats, setStats] = useState({ revenue_today: 0, revenue_month: 0, total_orders: 0, total_customers: 0, low_stock_count: 0, pending_invoices: 0 });
  const [recentSales, setRecentSales] = useState<{ id: string; receipt_no: string; customer_name: string; total_amount: number; payment_method: string; created_at: string }[]>([]);
  const [lowStock, setLowStock] = useState<{ id: string; name: string; stock_qty: number; sku: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [apiStats, salesRes, stockRes] = await Promise.all([
      fetch("/api/analytics").then((r) => r.json()).catch(() => null),
      supabase.from("sales").select("id,receipt_no,customer_name,total_amount,payment_method,created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("products").select("id,name,stock_qty,sku").filter("stock_qty", "lte", "low_stock_threshold").eq("is_active", true).order("stock_qty", { ascending: true }).limit(4),
    ]);
    if (apiStats?.data) setStats((p) => ({ ...p, ...apiStats.data }));
    setRecentSales((salesRes.data ?? []) as typeof recentSales);
    setLowStock((stockRes.data ?? []) as typeof lowStock);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const canPOS = ["business_owner", "branch_manager", "cashier"].includes(role);

  const quickActions = [
    { label: "New Sale",       href: "/dashboard/pos",       icon: Monitor,   color: "#FF8B5E", bg: "rgba(255,101,36,0.1)" },
    { label: "Add Product",    href: "/dashboard/inventory", icon: Package,   color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
    { label: "Create Invoice", href: "/dashboard/invoicing", icon: FileText,  color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    { label: "Add Customer",   href: "/dashboard/crm",       icon: Users,     color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
    { label: "AI Insights",    href: "/dashboard/ai",        icon: Sparkles,  color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
    { label: "Post Job",       href: "/dashboard/jobs",      icon: Briefcase, color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  ];

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={today}
        actions={canPOS ? (
          <Link href="/dashboard/pos"><Button size="sm"><Monitor size={14} /> New Sale</Button></Link>
        ) : undefined}
      />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Here's what's happening with your business today."
          cta={canPOS ? "Open POS" : undefined}
          ctaHref="/dashboard/pos"
          icon={TrendingUp}
        />

        <IndustryBanner industry={industry} />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-[#111624] border border-white/7 rounded-xl animate-pulse" />
            ))
          ) : (
            <>
              <StatCard title="Revenue Today"   value={stats.revenue_today}   format="currency" color="orange" />
              <StatCard title="Monthly Revenue" value={stats.revenue_month}   format="currency" color="green"  />
              <StatCard title="Total Orders"    value={stats.total_orders}    format="number"   color="blue"   />
              <StatCard title="Customers"       value={stats.total_customers} format="number"   color="amber"  />
            </>
          )}
        </div>

        {/* Alert cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/inventory">
            <Card className="p-4 border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] hover:border-[rgba(239,68,68,0.4)] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                  <AlertTriangle size={16} className="text-[#f87171]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f87171]">{loading ? "—" : stats.low_stock_count || lowStock.length} Low Stock</p>
                  <p className="text-xs text-[#64748b]">Needs reorder</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/invoicing">
            <Card className="p-4 border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.04)] hover:border-[rgba(245,158,11,0.4)] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center">
                  <FileText size={16} className="text-[#fbbf24]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#fbbf24]">{loading ? "—" : stats.pending_invoices} Pending Invoices</p>
                  <p className="text-xs text-[#64748b]">Awaiting payment</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/ai">
            <Card className="p-4 border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.04)] hover:border-[rgba(124,58,237,0.4)] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(124,58,237,0.1)] flex items-center justify-center">
                  <Sparkles size={16} className="text-[#a78bfa]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#a78bfa]">AI Insights Ready</p>
                  <p className="text-xs text-[#64748b]">View recommendations</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {canPOS && <QuickActions actions={quickActions} />}

        {/* Recent Sales + Low Stock */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Recent Sales</CardTitle>
                <Link href="/dashboard/pos"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
              </CardHeader>
              <CardContent className="pt-0">
                {loading ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />)}</div>
                ) : recentSales.length === 0 ? (
                  <div className="py-10 text-center">
                    <Monitor size={32} className="mx-auto mb-2 text-[#374151]" />
                    <p className="text-sm text-[#64748b]">No sales yet today</p>
                    {canPOS && <Link href="/dashboard/pos"><Button size="sm" className="mt-3">Open POS</Button></Link>}
                  </div>
                ) : recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-xs text-[#FF8B5E] font-bold flex-shrink-0">
                        {(sale.customer_name ?? "W")[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9] truncate">{sale.customer_name ?? "Walk-in"}</p>
                        <p className="text-xs text-[#64748b]">{sale.receipt_no}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <p className="text-sm font-semibold text-[#f1f5f9]">{formatCurrency(sale.total_amount)}</p>
                      <p className="text-xs text-[#64748b]">{sale.payment_method}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Low Stock</CardTitle>
                <Link href="/dashboard/inventory"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">Manage →</Button></Link>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-white/3 rounded-lg animate-pulse" />)
                ) : lowStock.length === 0 ? (
                  <p className="text-sm text-[#64748b] py-4 text-center">All items well stocked ✓</p>
                ) : lowStock.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 px-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#f1f5f9] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#64748b]">{item.sku ?? "No SKU"}</p>
                    </div>
                    <span className="text-xs font-bold text-[#f87171] flex-shrink-0">{item.stock_qty} left</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Network links */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Economic Network</p>
              <div className="space-y-1">
                {[
                  { label: "Find Suppliers",  href: "/dashboard/suppliers",  icon: Factory },
                  { label: "Post a Job",       href: "/dashboard/jobs",       icon: Briefcase },
                  { label: "List Product",     href: "/dashboard/marketplace",icon: ShoppingBag },
                  { label: "Get Financing",    href: "/dashboard/lending",    icon: HandCoins },
                ].map(({ label, href, icon: Icon }) => (
                  <Link key={href} href={href} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
                    <Icon size={13} className="text-[#FF8B5E] flex-shrink-0" />
                    <span className="text-xs text-[#64748b] group-hover:text-[#f1f5f9] transition-colors">{label}</span>
                    <ArrowRight size={10} className="ml-auto text-[#374151] group-hover:text-[#64748b]" />
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOMER HOME — Discovery-first Economic Network
// ─────────────────────────────────────────────────────────────
function CustomerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [kenuxPoints, setKenuxPoints] = useState(0);
  const [recentOrders, setRecentOrders] = useState<{ id: string; amount: number; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    const [walletRes, rewardsRes, ordersRes] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", profile.id).eq("type", "personal").single(),
      supabase.from("rewards_accounts").select("points").eq("user_id", profile.id).single(),
      supabase.from("orders").select("id,total_amount,status,created_at").eq("buyer_id", profile.id).order("created_at", { ascending: false }).limit(5),
    ]);
    setWalletBalance((walletRes.data as { balance: number } | null)?.balance ?? 0);
    setKenuxPoints((rewardsRes.data as { points: number } | null)?.points ?? 0);
    setRecentOrders(((ordersRes.data ?? []) as unknown[]).map((r) => {
      const row = r as Record<string, unknown>;
      return { id: String(row.id ?? ""), amount: Number(row.total_amount ?? 0), status: String(row.status ?? ""), created_at: String(row.created_at ?? "") };
    }));
    setLoading(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const DISCOVER_LINKS = [
    { label: "Browse Products",   href: "/dashboard/marketplace", icon: ShoppingBag, color: "#FF8B5E", bg: "rgba(255,101,36,0.1)" },
    { label: "Find Services",     href: "/dashboard/services",    icon: Wrench,      color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
    { label: "Browse Jobs",       href: "/dashboard/jobs",        icon: Briefcase,   color: "#10b981", bg: "rgba(16,185,129,0.1)" },
    { label: "Find Businesses",   href: "/dashboard/directory",   icon: Map,         color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
    { label: "Hire Freelancers",  href: "/dashboard/freelancers", icon: Pen,         color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
    { label: "Trending Now",      href: "/dashboard/trending",    icon: Flame,       color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Your Economic Network" />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Discover businesses, products, services, and opportunities near you."
          cta="Explore Network"
          ctaHref="/dashboard/discover"
          icon={Globe}
        />

        {/* Wallet & KENUX strip */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/wallet">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[rgba(16,185,129,0.12)] to-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.2)] hover:border-[rgba(16,185,129,0.35)] transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={13} className="text-[#10b981]" />
                <p className="text-[10px] text-[#10b981] font-semibold uppercase tracking-widest">Wallet</p>
              </div>
              <p className="text-2xl font-black text-[#f1f5f9]">{loading ? "—" : formatCurrency(walletBalance ?? 0)}</p>
              <p className="text-xs text-[#64748b] mt-0.5">Top up · Send · Receive</p>
            </div>
          </Link>
          <Link href="/dashboard/kenux">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[rgba(255,101,36,0.12)] to-[rgba(245,158,11,0.06)] border border-[rgba(255,101,36,0.2)] hover:border-[rgba(255,101,36,0.35)] transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={13} className="text-[#FF8B5E]" fill="#FF8B5E" />
                <p className="text-[10px] text-[#FF8B5E] font-semibold uppercase tracking-widest">KENUX</p>
              </div>
              <p className="text-2xl font-black text-[#f1f5f9]">{loading ? "—" : kenuxPoints.toLocaleString()} <span className="text-sm text-[#FF8B5E]">KNX</span></p>
              <p className="text-xs text-[#64748b] mt-0.5">Earn · Spend · Buy</p>
            </div>
          </Link>
        </div>

        {/* Discover grid */}
        <div>
          <p className="text-xs font-semibold text-[#2d3450] uppercase tracking-widest mb-3">Discover</p>
          <div className="grid grid-cols-3 gap-3">
            {DISCOVER_LINKS.map(({ label, href, icon: Icon, color, bg }) => (
              <Link key={href} href={href}>
                <Card className="p-3.5 text-center hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform" style={{ background: bg }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <p className="text-[11px] text-[#64748b] group-hover:text-[#f1f5f9] transition-colors leading-tight font-medium">{label}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Orders</CardTitle>
            <Link href="/dashboard/account"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />)}</div>
            ) : recentOrders.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingBag size={28} className="mx-auto mb-2 text-[#374151]" />
                <p className="text-sm text-[#64748b]">No orders yet</p>
                <Link href="/dashboard/marketplace"><Button size="sm" className="mt-3">Browse Products</Button></Link>
              </div>
            ) : recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center">
                    <ShoppingBag size={13} className="text-[#FF8B5E]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#f1f5f9]">{order.id.slice(0, 12)}</p>
                    <p className="text-xs text-[#64748b]">{new Date(order.created_at).toLocaleDateString("en-GH")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#f1f5f9]">{formatCurrency(order.amount)}</p>
                  <span className={`text-[10px] font-medium capitalize ${order.status === "completed" ? "text-[#10b981]" : "text-[#f59e0b]"}`}>{order.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Credit + Community */}
        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/credit">
            <Card className="p-4 hover:border-white/20 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={13} className="text-[#3B82F6]" />
                <p className="text-xs font-semibold text-[#64748b]">KENUXA Credit</p>
              </div>
              <p className="text-xl font-bold text-[#f1f5f9]">Check Score</p>
              <p className="text-xs text-[#374151] mt-0.5">Unlock financing</p>
            </Card>
          </Link>
          <Link href="/dashboard/community">
            <Card className="p-4 hover:border-white/20 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={13} className="text-[#10b981]" />
                <p className="text-xs font-semibold text-[#64748b]">Community</p>
              </div>
              <p className="text-xl font-bold text-[#f1f5f9]">Social Feed</p>
              <p className="text-xs text-[#374151] mt-0.5">Connect & discover</p>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// FREELANCER HOME
// ─────────────────────────────────────────────────────────────
function FreelancerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [earnings, setEarnings] = useState({ month: 0, total: 0 });
  const [walletBalance, setWalletBalance] = useState(0);
  const [kenuxPoints, setKenuxPoints] = useState(0);
  const [recentProjects, setRecentProjects] = useState<{ id: string; title: string; status: string; budget: number | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    const [walletRes, rewardsRes, projectsRes] = await Promise.all([
      supabase.from("wallets").select("balance").eq("user_id", profile.id).eq("type", "personal").single(),
      supabase.from("rewards_accounts").select("points").eq("user_id", profile.id).single(),
      supabase.from("freelancer_projects").select("id,title,status,budget,created_at").eq("freelancer_id", profile.id).order("created_at", { ascending: false }).limit(5),
    ]);
    setWalletBalance((walletRes.data as { balance: number } | null)?.balance ?? 0);
    setKenuxPoints((rewardsRes.data as { points: number } | null)?.points ?? 0);
    setRecentProjects((projectsRes.data ?? []) as typeof recentProjects);
    setLoading(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="Dashboard" subtitle="Freelancer Hub" />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Manage your projects, grow your profile, and earn on KENUXA."
          cta="Find Projects"
          ctaHref="/dashboard/freelancers"
          icon={Pen}
          color="#8b5cf6"
        />

        <div className="grid grid-cols-3 gap-4">
          <Link href="/dashboard/wallet">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Wallet</p>
              <p className="text-xl font-bold text-[#f1f5f9]">{loading ? "—" : formatCurrency(walletBalance)}</p>
            </div>
          </Link>
          <Link href="/dashboard/kenux">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">KENUX</p>
              <p className="text-xl font-bold text-[#FF8B5E]">{loading ? "—" : kenuxPoints.toLocaleString()} KNX</p>
            </div>
          </Link>
          <Link href="/dashboard/analytics">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Projects</p>
              <p className="text-xl font-bold text-[#f1f5f9]">{loading ? "—" : recentProjects.length}</p>
            </div>
          </Link>
        </div>

        <QuickActions actions={[
          { label: "My Profile",     href: "/dashboard/talent",      icon: BadgeCheck, color: "#FF8B5E", bg: "rgba(255,101,36,0.1)" },
          { label: "Find Projects",  href: "/dashboard/freelancers", icon: Search,     color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
          { label: "My Skills",      href: "/dashboard/skills",      icon: Award,      color: "#10b981", bg: "rgba(16,185,129,0.1)" },
          { label: "My Wallet",      href: "/dashboard/wallet",      icon: Wallet,     color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
          { label: "KENUX",          href: "/dashboard/kenux",       icon: Zap,        color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
          { label: "AI Assistant",   href: "/dashboard/ai",          icon: Sparkles,   color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
        ]} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Projects</CardTitle>
            <Link href="/dashboard/analytics"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">All projects →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />)}</div>
            ) : recentProjects.length === 0 ? (
              <div className="py-8 text-center">
                <Pen size={28} className="mx-auto mb-2 text-[#374151]" />
                <p className="text-sm text-[#64748b]">No projects yet — complete your profile to get discovered</p>
                <Link href="/dashboard/talent"><Button size="sm" className="mt-3">Set Up Profile</Button></Link>
              </div>
            ) : recentProjects.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.1)] flex items-center justify-center flex-shrink-0">
                  <Pen size={12} className="text-[#8B5CF6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f1f5f9] truncate">{p.title}</p>
                  <p className="text-xs text-[#374151]">{new Date(p.created_at).toLocaleDateString("en-GH")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {p.budget ? <p className="text-sm font-semibold text-[#f1f5f9]">{formatCurrency(p.budget)}</p> : null}
                  <span className={`text-[10px] capitalize ${p.status === "completed" ? "text-[#10b981]" : p.status === "active" ? "text-[#3B82F6]" : "text-[#F59E0B]"}`}>{p.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// JOB SEEKER HOME
// ─────────────────────────────────────────────────────────────
function JobSeekerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [jobs, setJobs] = useState<{ id: string; title: string; business_name: string | null; location: string | null; job_type: string | null; created_at: string }[]>([]);
  const [applications, setApplications] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [jobsRes, appsRes] = await Promise.all([
      supabase.from("job_listings").select("id,title,business_name,location,job_type,created_at").eq("status", "active").order("created_at", { ascending: false }).limit(6),
      profile?.id
        ? supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("applicant_id", profile.id)
        : Promise.resolve({ count: 0 }),
    ]);
    setJobs((jobsRes.data ?? []) as typeof jobs);
    setApplications((appsRes as { count: number | null }).count ?? 0);
    setLoading(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="Dashboard" subtitle="Your Career Hub" />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Find your next opportunity in the KENUXA Economic Network."
          cta="Browse All Jobs"
          ctaHref="/dashboard/jobs"
          icon={Briefcase}
          color="#10b981"
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
            <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Applied</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{loading ? "—" : applications}</p>
          </div>
          <Link href="/dashboard/talent">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Profile</p>
              <p className="text-xl font-bold text-[#FF8B5E]">Set Up</p>
            </div>
          </Link>
          <Link href="/dashboard/credit">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Credit</p>
              <p className="text-xl font-bold text-[#f1f5f9]">Score</p>
            </div>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Latest Jobs</CardTitle>
            <Link href="/dashboard/jobs"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white/3 rounded-lg animate-pulse" />)}</div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center">
                <Briefcase size={28} className="mx-auto mb-2 text-[#374151]" />
                <p className="text-sm text-[#64748b]">No active jobs right now</p>
              </div>
            ) : jobs.map((job) => (
              <Link key={job.id} href={`/dashboard/jobs`}>
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
                    <Briefcase size={14} className="text-[#10b981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f1f5f9] truncate">{job.title}</p>
                    <p className="text-xs text-[#64748b]">{job.business_name ?? "KENUXA Business"} · {job.location ?? "Ghana"}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-[#10b981] capitalize flex-shrink-0">{job.job_type ?? "Full-time"}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SUPPLIER HOME
// ─────────────────────────────────────────────────────────────
function SupplierHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [rfqs, setRfqs] = useState<{ id: string; title: string; budget: number | null; status: string; created_at: string }[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [rfqRes, walletRes] = await Promise.all([
      supabase.from("rfqs").select("id,title,budget,status,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(5),
      profile?.id ? supabase.from("wallets").select("balance").eq("user_id", profile.id).eq("type", "personal").single() : Promise.resolve({ data: null }),
    ]);
    setRfqs((rfqRes.data ?? []) as typeof rfqs);
    setWalletBalance((walletRes.data as { balance: number } | null)?.balance ?? 0);
    setLoading(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="Dashboard" subtitle="Supplier Hub" />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Respond to RFQs, manage your orders, and grow your supply network."
          cta="View Open RFQs"
          ctaHref="/dashboard/rfq"
          icon={Factory}
          color="#F59E0B"
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
            <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Open RFQs</p>
            <p className="text-2xl font-bold text-[#F59E0B]">{loading ? "—" : rfqs.length}</p>
          </div>
          <Link href="/dashboard/wallet">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Wallet</p>
              <p className="text-xl font-bold text-[#f1f5f9]">{loading ? "—" : formatCurrency(walletBalance)}</p>
            </div>
          </Link>
          <Link href="/dashboard/analytics">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Analytics</p>
              <p className="text-xl font-bold text-[#f1f5f9]">View</p>
            </div>
          </Link>
        </div>

        <QuickActions actions={[
          { label: "View RFQs",    href: "/dashboard/rfq",       icon: ClipboardList, color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
          { label: "Invoicing",    href: "/dashboard/invoicing", icon: FileText,      color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
          { label: "Payments",     href: "/dashboard/payments",  icon: CreditCard,    color: "#10b981", bg: "rgba(16,185,129,0.1)" },
          { label: "Analytics",    href: "/dashboard/analytics", icon: BarChart3,     color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
          { label: "My Wallet",    href: "/dashboard/wallet",    icon: Wallet,        color: "#FF8B5E", bg: "rgba(255,101,36,0.1)" },
          { label: "AI Assistant", href: "/dashboard/ai",        icon: Sparkles,      color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
        ]} />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Open RFQs</CardTitle>
            <Link href="/dashboard/rfq"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />)}</div>
            ) : rfqs.length === 0 ? (
              <div className="py-8 text-center">
                <ClipboardList size={28} className="mx-auto mb-2 text-[#374151]" />
                <p className="text-sm text-[#64748b]">No open RFQs right now</p>
              </div>
            ) : rfqs.map((rfq) => (
              <Link key={rfq.id} href="/dashboard/rfq">
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(245,158,11,0.1)] flex items-center justify-center flex-shrink-0">
                    <ClipboardList size={12} className="text-[#F59E0B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#f1f5f9] truncate">{rfq.title}</p>
                    <p className="text-xs text-[#374151]">{new Date(rfq.created_at).toLocaleDateString("en-GH")}</p>
                  </div>
                  {rfq.budget ? <p className="text-sm font-semibold text-[#f1f5f9] flex-shrink-0">{formatCurrency(rfq.budget)}</p> : null}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// DELIVERY RIDER HOME
// ─────────────────────────────────────────────────────────────
function RiderHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [runs, setRuns] = useState<{ id: string; status: string; customer_name: string | null; delivery_address: string | null; created_at: string }[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) { setLoading(false); return; }
    setLoading(true);
    const [runsRes, walletRes] = await Promise.all([
      supabase.from("delivery_runs").select("id,status,customer_name,delivery_address,created_at").eq("rider_id", profile.id).order("created_at", { ascending: false }).limit(5),
      supabase.from("wallets").select("balance").eq("user_id", profile.id).eq("type", "personal").single(),
    ]);
    setRuns((runsRes.data ?? []) as typeof runs);
    setEarnings((walletRes.data as { balance: number } | null)?.balance ?? 0);
    setLoading(false);
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="Dashboard" subtitle="Delivery Hub" />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Your active deliveries and earnings overview."
          cta="View Deliveries"
          ctaHref="/dashboard/delivery"
          icon={Truck}
          color="#3B82F6"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-[#111624] border border-white/7">
            <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Today&apos;s Runs</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{loading ? "—" : runs.length}</p>
          </div>
          <Link href="/dashboard/wallet">
            <div className="p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-white/15 transition-colors cursor-pointer">
              <p className="text-[10px] text-[#374151] uppercase tracking-widest mb-1">Wallet Balance</p>
              <p className="text-xl font-bold text-[#10b981]">{loading ? "—" : formatCurrency(earnings)}</p>
            </div>
          </Link>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Recent Deliveries</CardTitle>
            <Link href="/dashboard/delivery"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 bg-white/3 rounded-lg animate-pulse" />)}</div>
            ) : runs.length === 0 ? (
              <div className="py-8 text-center">
                <Truck size={28} className="mx-auto mb-2 text-[#374151]" />
                <p className="text-sm text-[#64748b]">No deliveries yet today</p>
                <Link href="/dashboard/delivery"><Button size="sm" className="mt-3">Check Active Deliveries</Button></Link>
              </div>
            ) : runs.map((run) => (
              <div key={run.id} className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-white/3 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[rgba(59,130,246,0.1)] flex items-center justify-center flex-shrink-0">
                  <Truck size={12} className="text-[#3B82F6]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#f1f5f9] truncate">{run.customer_name ?? "Customer"}</p>
                  <p className="text-xs text-[#374151] truncate">{run.delivery_address ?? "—"}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${run.status === "delivered" ? "bg-[rgba(16,185,129,0.1)] text-[#10b981]" : run.status === "transit" ? "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" : "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]"}`}>
                  {run.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// FINANCIAL PARTNER HOME
// ─────────────────────────────────────────────────────────────
function FinancialPartnerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [pending, setPending] = useState(0);
  const [active, setActive] = useState(0);
  const [totalDeployed, setTotalDeployed] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("loan_applications").select("status,amount");
    const rows = (data ?? []) as { status: string; amount: number }[];
    setPending(rows.filter((r) => r.status === "pending").length);
    setActive(rows.filter((r) => ["approved", "disbursed", "repaying"].includes(r.status)).length);
    setTotalDeployed(rows.filter((r) => ["disbursed", "repaying"].includes(r.status)).reduce((s, r) => s + r.amount, 0));
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <Header title="Dashboard" subtitle="Financial Partner Portal" />
      <div className="p-6 space-y-6">
        <WelcomeBanner
          name={profile?.full_name ?? ""}
          subtitle="Review loan applications, monitor your portfolio, and evaluate KENUXA credit scores."
          cta="Review Applications"
          ctaHref="/dashboard/finance-partner"
          icon={Landmark}
          color="#3B82F6"
        />

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)]">
            <p className="text-[10px] text-[#F59E0B] uppercase tracking-widest mb-1">Pending</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{loading ? "—" : pending}</p>
            <p className="text-xs text-[#64748b]">applications</p>
          </div>
          <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.2)]">
            <p className="text-[10px] text-[#10b981] uppercase tracking-widest mb-1">Active</p>
            <p className="text-2xl font-bold text-[#f1f5f9]">{loading ? "—" : active}</p>
            <p className="text-xs text-[#64748b]">loans</p>
          </div>
          <div className="p-4 rounded-xl bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.2)]">
            <p className="text-[10px] text-[#3B82F6] uppercase tracking-widest mb-1">Deployed</p>
            <p className="text-xl font-bold text-[#f1f5f9]">{loading ? "—" : formatCurrency(totalDeployed)}</p>
          </div>
        </div>

        <QuickActions actions={[
          { label: "Applications",  href: "/dashboard/finance-partner", icon: Landmark,    color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
          { label: "Analytics",     href: "/dashboard/analytics",       icon: BarChart3,   color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
          { label: "API Docs",      href: "/dashboard/developer",       icon: Sparkles,    color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
          { label: "Credit Scores", href: "/dashboard/credit",          icon: Shield,      color: "#10b981", bg: "rgba(16,185,129,0.1)" },
          { label: "Wallet",        href: "/dashboard/wallet",          icon: Wallet,      color: "#FF8B5E", bg: "rgba(255,101,36,0.1)" },
          { label: "Network",       href: "/dashboard/discover",        icon: Globe,       color: "#64748b", bg: "rgba(100,116,139,0.1)" },
        ]} />

        <div className="p-4 rounded-xl bg-[rgba(255,101,36,0.05)] border border-[rgba(255,101,36,0.15)]">
          <div className="flex items-center gap-2 mb-1">
            <Activity size={13} className="text-[#FF8B5E]" />
            <p className="text-xs font-semibold text-[#FF8B5E]">KENUXA Credit Intelligence</p>
          </div>
          <p className="text-xs text-[#64748b]">Every applicant&apos;s KENUXA Credit Score is computed from real platform activity — revenue, orders, reviews, and payment history. No external bureau required.</p>
          <Link href="/dashboard/developer">
            <button className="mt-2 text-xs text-[#FF8B5E] hover:underline flex items-center gap-1">
              API Integration Guide <ChevronRight size={10} />
            </button>
          </Link>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// ROOT DASHBOARD — dispatches per role
// ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { profile } = useAuth();
  const { activeContext } = useRoles();
  const authRole = profile?.role ?? null;
  const currentRole: Role = ((activeContext || authRole || profile?.role || "customer") as Role);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full py-32">
        <div className="w-6 h-6 border-2 border-[#FF6524] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Business-operator roles
  if (["business_owner", "branch_manager", "cashier", "employee"].includes(currentRole)) {
    return <BusinessHome profile={profile} role={currentRole} />;
  }

  // Freelancer
  if (currentRole === "freelancer") {
    return <FreelancerHome profile={profile} />;
  }

  // Job Seeker / Recruiter
  if (["job_seeker", "recruiter"].includes(currentRole)) {
    return <JobSeekerHome profile={profile} />;
  }

  // Supplier
  if (currentRole === "supplier") {
    return <SupplierHome profile={profile} />;
  }

  // Delivery Rider
  if (currentRole === "delivery_rider") {
    return <RiderHome profile={profile} />;
  }

  // Financial Partner
  if (currentRole === "financial_partner") {
    return <FinancialPartnerHome profile={profile} />;
  }

  // Customer (default) + super_admin / country_admin → discovery-first
  return <CustomerHome profile={profile} />;
}
