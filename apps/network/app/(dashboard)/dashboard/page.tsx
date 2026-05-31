"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import { useIndustry } from "@/lib/hooks/use-industry";
import { IndustryBanner } from "@/components/ui/industry-banner";
import {
  Monitor, Package, FileText, Users, Map, Briefcase,
  Factory, Sparkles, AlertTriangle, TrendingUp, Zap,
  Compass, Gift, Star, ShoppingBag, Flame, Globe,
  CheckCircle2, Clock, ArrowRight, MapPin, Search,
  Truck, DollarSign, BarChart2, MessageSquare, UserCircle2,
  Wrench, Landmark, CreditCard, ClipboardList, Pen,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  revenue_today: number;
  revenue_month: number;
  total_orders: number;
  total_customers: number;
  low_stock_count: number;
  pending_invoices: number;
}

interface RecentSale {
  id: string;
  receipt_no: string;
  customer_name: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface LowStockItem {
  id: string;
  name: string;
  stock_qty: number;
  low_stock_threshold: number;
  sku: string | null;
}

interface JobListing {
  id: string;
  title: string;
  business_name: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  job_type: string | null;
  created_at: string;
}

interface DeliveryRun {
  id: string;
  status: string;
  customer_name: string | null;
  delivery_address: string | null;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const today = new Date().toLocaleDateString("en-GH", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ─── Business Owner / Manager / Cashier / Employee Home ───────────────────────

function BusinessHome({ profile, role }: { profile: ReturnType<typeof useAuth>["profile"]; role: string }) {
  const supabase = createClient();
  const industry = useIndustry((profile as { category?: string } | null)?.category ?? null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, salesRes, stockRes] = await Promise.all([
      fetch("/api/analytics").then((r) => r.json()).catch(() => null),
      supabase
        .from("sales")
        .select("id, receipt_no, customer_name, total_amount, payment_method, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("products")
        .select("id, name, stock_qty, low_stock_threshold, sku")
        .filter("stock_qty", "lte", "low_stock_threshold")
        .eq("is_active", true)
        .order("stock_qty", { ascending: true })
        .limit(4),
    ]);
    if (statsRes?.data) setStats(statsRes.data);
    setRecentSales((salesRes.data as RecentSale[]) ?? []);
    setLowStock((stockRes.data as LowStockItem[]) ?? []);
    setLoading(false);

    const { data: insightRow } = await supabase
      .from("ai_insights")
      .select("content")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (insightRow?.content) setAiInsight(insightRow.content as string);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const canPOS = ["business_owner", "branch_manager", "cashier"].includes(role);

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={today}
        actions={canPOS ? (
          <Link href="/dashboard/pos">
            <Button size="sm"><Monitor size={14} /> New Sale</Button>
          </Link>
        ) : undefined}
      />
      <div className="p-6 space-y-6">
        {/* Welcome */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(255,101,36,0.2)] bg-gradient-to-r from-[rgba(255,101,36,0.1)] via-[rgba(255,101,36,0.05)] to-transparent p-6">
          <div className="relative z-10">
            <h2 className="text-lg font-semibold text-[#f1f5f9]">
              {greeting()}, <span className="text-[#FF8B5E]">{profile?.full_name?.split(" ")[0] ?? "there"}</span>
            </h2>
            <p className="text-sm text-[#64748b] mt-1">Here&apos;s what&apos;s happening with your business today.</p>
          </div>
          <TrendingUp size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#FF6524] opacity-8" />
        </div>

        {/* Industry Mode Banner */}
        <IndustryBanner industry={industry} />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 bg-[#111624] border border-white/7 rounded-xl animate-pulse" />
            ))
          ) : (
            <>
              <StatCard title="Revenue Today"   value={stats?.revenue_today   ?? 0} format="currency" color="orange" />
              <StatCard title="Monthly Revenue" value={stats?.revenue_month   ?? 0} format="currency" color="green"  />
              <StatCard title="Total Orders"    value={stats?.total_orders    ?? 0} format="number"   color="blue"   />
              <StatCard title="Customers"       value={stats?.total_customers ?? 0} format="number"   color="amber"  />
            </>
          )}
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/inventory">
            <Card className="p-4 border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.04)] hover:border-[rgba(239,68,68,0.4)] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(239,68,68,0.1)] flex items-center justify-center">
                  <AlertTriangle size={16} className="text-[#f87171]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f87171]">{loading ? "—" : (stats?.low_stock_count ?? lowStock.length)} Low Stock</p>
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
                  <p className="text-sm font-semibold text-[#fbbf24]">{loading ? "—" : (stats?.pending_invoices ?? 0)} Pending Invoices</p>
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

        {/* Quick Actions */}
        {canPOS && (
          <div>
            <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Quick Actions</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { label: "New Sale",       href: "/dashboard/pos",       Icon: Monitor,   color: "bg-[rgba(255,101,36,0.1)] text-[#FF8B5E]" },
                { label: "Add Product",    href: "/dashboard/inventory", Icon: Package,   color: "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" },
                { label: "Create Invoice", href: "/dashboard/invoicing", Icon: FileText,  color: "bg-[rgba(16,185,129,0.1)] text-[#10b981]" },
                { label: "Add Customer",   href: "/dashboard/crm",       Icon: Users,     color: "bg-[rgba(245,158,11,0.1)] text-[#F59E0B]" },
                { label: "AI Insights",    href: "/dashboard/ai",        Icon: Sparkles,  color: "bg-[rgba(124,58,237,0.1)] text-[#8B5CF6]" },
                { label: "Post Job",       href: "/dashboard/jobs",      Icon: Briefcase, color: "bg-[rgba(59,130,246,0.1)] text-[#3B82F6]" },
              ].map(({ href, label, Icon, color }) => (
                <Link key={href} href={href}>
                  <Card className="p-4 text-center hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group">
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform`}>
                      <Icon size={16} />
                    </div>
                    <p className="text-xs text-[#64748b] group-hover:text-[#f1f5f9] transition-colors leading-tight font-medium">{label}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

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
                ) : (
                  <div className="space-y-1">
                    {recentSales.map((sale) => (
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
                  </div>
                )}
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
                ) : (
                  lowStock.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#f1f5f9] truncate">{item.name}</p>
                        <p className="text-[11px] text-[#64748b]">{item.sku ?? "—"}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#f87171]">{item.stock_qty}</p>
                        <p className="text-[11px] text-[#374151]">min {item.low_stock_threshold}</p>
                      </div>
                    </div>
                  ))
                )}
                <div className="pt-2 border-t border-white/7">
                  <Link href="/dashboard/suppliers">
                    <Button variant="secondary" size="sm" className="w-full"><Factory size={13} /> Order from Suppliers</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[rgba(124,58,237,0.2)] bg-[rgba(124,58,237,0.04)]">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[rgba(124,58,237,0.15)] flex items-center justify-center flex-shrink-0">
                    <Zap size={13} className="text-[#a78bfa]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[#8B5CF6] uppercase tracking-wider mb-1">AI Insight</p>
                    <p className="text-xs text-[#cbd5e1] leading-relaxed">
                      {aiInsight ?? "Your AI assistant is ready to analyse your business data and surface actionable recommendations."}
                    </p>
                    <Link href="/dashboard/ai">
                      <button className="text-xs text-[#a78bfa] mt-2 hover:underline">See all insights →</button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Ecosystem Shortcuts */}
        <div>
          <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Explore KENUXA</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { title: "Discover",        subtitle: "Find businesses & services",     href: "/dashboard/discover",    Icon: Compass  },
              { title: "Jobs Marketplace",subtitle: "Post jobs, find workers",        href: "/dashboard/jobs",        Icon: Briefcase},
              { title: "Supplier Network",subtitle: "Source inventory in bulk",       href: "/dashboard/suppliers",   Icon: Factory  },
              { title: "AI Assistant",    subtitle: "Business intelligence & advice", href: "/dashboard/ai",          Icon: Sparkles },
            ].map(({ title, subtitle, href, Icon }) => (
              <Link key={href} href={href}>
                <Card className="p-5 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer h-full group">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center mb-3 group-hover:bg-[rgba(255,101,36,0.18)] transition-colors">
                    <Icon size={16} className="text-[#FF8B5E]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#f1f5f9]">{title}</h4>
                  <p className="text-xs text-[#64748b] mt-1">{subtitle}</p>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Consumer Home (Module 20 — Universal Marketplace) ────────────────────────


const NEARBY_CATEGORIES = [
  { label: "Restaurants",  icon: "🍽️", href: "/dashboard/marketplace?cat=food" },
  { label: "Pharmacies",   icon: "💊", href: "/dashboard/marketplace?cat=health" },
  { label: "Electronics",  icon: "📱", href: "/dashboard/marketplace?cat=tech" },
  { label: "Fashion",      icon: "👗", href: "/dashboard/marketplace?cat=fashion" },
  { label: "Groceries",    icon: "🛒", href: "/dashboard/marketplace?cat=grocery" },
  { label: "Services",     icon: "🔧", href: "/dashboard/services" },
  { label: "Freelancers",  icon: "💼", href: "/dashboard/freelancers" },
  { label: "Skills",       icon: "🎓", href: "/dashboard/skills" },
];

const AI_QUICK_ACTIONS = [
  { label: "Find jobs for me",        href: "/dashboard/ai?q=find+jobs" },
  { label: "Find clients for me",     href: "/dashboard/ai?q=find+clients" },
  { label: "Recommend suppliers",     href: "/dashboard/ai?q=recommend+suppliers" },
  { label: "Find a restaurant",       href: "/dashboard/ai?q=find+restaurant" },
  { label: "Book a service",          href: "/dashboard/services" },
  { label: "Buy data bundles",        href: "/dashboard/marketplace?cat=telecom" },
];

const ROLE_UNLOCK_CARDS = [
  { label: "Become a Freelancer",     sub: "Offer services & earn",        href: "/dashboard/roles",                    color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
  { label: "Find a Job",              sub: "Create your talent profile",   href: "/dashboard/onboarding/job-seeker",    color: "#10b981", bg: "rgba(16,185,129,0.08)" },
  { label: "Start a Business",        sub: "Launch your storefront",       href: "/dashboard/onboarding/business",      color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  { label: "Become a Supplier",       sub: "Supply to hundreds of businesses", href: "/dashboard/onboarding/supplier",  color: "#f97316", bg: "rgba(249,115,22,0.08)" },
];

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  business_name: string | null;
  category: string | null;
  image_url: string | null;
  total_sold: number | null;
}

function ConsumerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [featured, setFeatured] = useState<{ id: string; name: string; category: string | null }[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<TrendingProduct[]>([]);
  const [rewards, setRewards] = useState(0);
  const [savedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [bizRes, jobRes, rewardRes, trendRes] = await Promise.all([
        supabase.from("businesses").select("id, name, category").eq("status", "active").limit(6),
        supabase.from("job_listings").select("id, title, business_name, location, salary_min, salary_max, job_type, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(4),
        supabase.from("loyalty_points").select("points").eq("user_id", profile?.id ?? "").single(),
        supabase.from("marketplace_listings").select("id, name, price, business_name, category, image_url, total_sold").eq("status", "active").order("total_sold", { ascending: false }).limit(4),
      ]);
      setFeatured((bizRes.data ?? []) as { id: string; name: string; category: string | null }[]);
      setJobs((jobRes.data as JobListing[]) ?? []);
      setTrendingProducts((trendRes.data as TrendingProduct[]) ?? []);
      if (!rewardRes.error && rewardRes.data) setRewards((rewardRes.data as { points: number }).points ?? 0);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header
        title="KENUXA Network"
        subtitle="Your gateway to the local economy"
        actions={
          <Link href="/dashboard/discover">
            <Button size="sm"><Compass size={14} /> Discover</Button>
          </Link>
        }
      />
      <div className="p-6 space-y-6">
        {/* Hero + Search */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(255,101,36,0.2)] bg-gradient-to-br from-[rgba(255,101,36,0.12)] via-[rgba(255,101,36,0.05)] to-[rgba(124,58,237,0.08)] p-7">
          <h2 className="text-2xl font-bold text-[#f1f5f9]">
            {greeting()}, <span className="text-[#FF8B5E]">{profile?.full_name?.split(" ")[0] ?? "there"}</span>
          </h2>
          <p className="text-sm text-[#94a3b8] mt-1 mb-4">What are you looking for today?</p>
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, services, businesses…"
              className="w-full pl-9 pr-4 py-2.5 bg-black/30 border border-white/15 rounded-xl text-sm text-white placeholder-[#64748b] focus:outline-none focus:border-[#FF6524]/50"
            />
          </div>
          <Globe size={120} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#FF6524] opacity-5" />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(124,58,237,0.1)] flex items-center justify-center">
              <Gift size={16} className="text-[#8B5CF6]" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{rewards.toLocaleString()}</p>
              <p className="text-[10px] text-[#64748b]">Reward Points</p>
            </div>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
              <Star size={16} className="text-[#10b981]" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{savedCount}</p>
              <p className="text-[10px] text-[#64748b]">Saved Items</p>
            </div>
          </div>
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center">
              <Truck size={16} className="text-[#FF8B5E]" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">0</p>
              <p className="text-[10px] text-[#64748b]">Active Orders</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Browse by Category</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {NEARBY_CATEGORIES.map((cat) => (
              <Link key={cat.href} href={cat.href}>
                <div className="flex flex-col items-center gap-1.5 p-3 bg-[#0d0f1a] border border-white/7 hover:border-[rgba(255,101,36,0.3)] hover:bg-[#161b2e] rounded-xl transition-all cursor-pointer group">
                  <span className="text-xl">{cat.icon}</span>
                  <p className="text-[10px] text-[#64748b] group-hover:text-[#f1f5f9] transition-colors font-medium text-center leading-tight">{cat.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Trending Products */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest flex items-center gap-1.5">
              <Flame size={12} className="text-[#f87171]" /> Trending Now
            </h3>
            <Link href="/dashboard/trending" className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors">See all →</Link>
          </div>
          {trendingProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trendingProducts.map((p) => (
                <Link key={p.id} href="/dashboard/marketplace">
                  <div className="bg-[#0d0f1a] border border-white/7 hover:border-[rgba(255,101,36,0.3)] rounded-2xl overflow-hidden cursor-pointer transition-all group">
                    <div className="w-full h-20 bg-gradient-to-br from-white/5 to-white/[0.02] flex items-center justify-center">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <ShoppingBag size={20} className="text-[#374151] group-hover:text-[#FF6524] transition-colors" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-[#64748b] truncate">{p.business_name ?? p.category ?? "—"}</p>
                      <p className="text-sm font-bold text-[#FF8B5E] mt-1">₵{p.price.toLocaleString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#374151]">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No products yet — be the first to list!</p>
              <Link href="/dashboard/marketplace" className="text-xs text-[#FF6524] hover:underline mt-1 inline-block">Browse marketplace →</Link>
            </div>
          )}
        </div>

        {/* Featured Businesses */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Businesses Near You</CardTitle>
            <Link href="/dashboard/directory"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-white/3 rounded-lg animate-pulse" />)}
              </div>
            ) : featured.length === 0 ? (
              <p className="text-sm text-[#64748b] text-center py-8">No businesses listed yet.</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {featured.map((b) => (
                  <Link key={b.id} href={`/dashboard/directory?id=${b.id}`}>
                    <div className="p-3 bg-[#07080f] border border-white/7 hover:border-[rgba(255,101,36,0.3)] rounded-xl transition-colors cursor-pointer group">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-[#FF8B5E] font-bold text-sm flex-shrink-0">
                          {b.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f1f5f9] truncate">{b.name}</p>
                          <p className="text-xs text-[#64748b] truncate">{b.category ?? "Business"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <MapPin size={10} className="text-[#64748b]" />
                        <span className="text-[10px] text-[#64748b]">Accra · Open now</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Opportunities — Jobs, Gigs, Contracts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest">Opportunities</h3>
            <Link href="/dashboard/jobs" className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors">All jobs →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-[#0d0f1a] animate-pulse" />)
            ) : jobs.length === 0 ? (
              <p className="text-sm text-[#64748b] col-span-2 text-center py-6">No open opportunities right now.</p>
            ) : (
              jobs.map((j) => (
                <Link key={j.id} href="/dashboard/jobs">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#0d0f1a] border border-white/7 hover:border-[rgba(255,101,36,0.3)] transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
                        <Briefcase size={13} className="text-[#10b981]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9] truncate">{j.title}</p>
                        <p className="text-xs text-[#64748b] truncate">{j.business_name ?? "Business"}{j.location ? ` · ${j.location}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {j.salary_min && <p className="text-xs font-semibold text-[#10b981]">₵{j.salary_min.toLocaleString()}/mo</p>}
                      <p className="text-[10px] text-[#374151] capitalize">{j.job_type ?? "Full-time"}</p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* AI Assistant Quick Actions */}
        <div className="rounded-2xl border border-[rgba(139,92,246,0.2)] bg-gradient-to-br from-[rgba(139,92,246,0.07)] to-[rgba(255,101,36,0.04)] p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
              <Sparkles size={14} className="text-[#a78bfa]" />
            </div>
            <p className="text-sm font-semibold text-[#f1f5f9]">AI Assistant</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AI_QUICK_ACTIONS.map((action) => (
              <Link key={action.label} href={action.href}>
                <button className="px-3 py-1.5 rounded-full border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.08)] text-[#a78bfa] text-xs hover:bg-[rgba(139,92,246,0.15)] transition-colors">
                  {action.label}
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Loyalty Banner */}
        <div className="rounded-2xl border border-[rgba(124,58,237,0.25)] bg-gradient-to-r from-[rgba(124,58,237,0.08)] to-[rgba(255,101,36,0.06)] p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(124,58,237,0.15)] flex items-center justify-center flex-shrink-0">
            <Gift size={22} className="text-[#8B5CF6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white">KENUXA Rewards</p>
            <p className="text-xs text-[#94a3b8] mt-0.5">
              {rewards > 0
                ? `You have ${rewards.toLocaleString()} points — redeem for discounts at partner stores.`
                : "Earn points with every purchase and unlock exclusive rewards."}
            </p>
          </div>
          <Link href="/dashboard/rewards">
            <button className="flex-shrink-0 px-3 py-2 bg-[rgba(124,58,237,0.2)] hover:bg-[rgba(124,58,237,0.3)] text-[#8B5CF6] text-xs font-semibold rounded-xl transition-colors flex items-center gap-1">
              Redeem <ArrowRight size={12} />
            </button>
          </Link>
        </div>

        {/* Unlock More Roles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[#374151] uppercase tracking-widest">Do More With KENUXA</h3>
            <Link href="/dashboard/roles" className="text-xs text-[#64748b] hover:text-[#FF8B5E] transition-colors">All roles →</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {ROLE_UNLOCK_CARDS.map((card) => (
              <Link key={card.label} href={card.href}>
                <div className="p-4 rounded-xl border border-white/7 hover:border-white/20 transition-all cursor-pointer group" style={{ background: card.bg }}>
                  <p className="text-sm font-semibold text-[#f1f5f9] mb-0.5">{card.label}</p>
                  <p className="text-xs" style={{ color: card.color }}>{card.sub}</p>
                  <ArrowRight size={12} className="mt-2 text-[#374151] group-hover:text-[#f1f5f9] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Job Seeker Home — Full Career Dashboard ──────────────────────────────────

const CAREER_WORKFLOW = ["Build Profile", "AI Review", "Job Match", "Apply", "Interview", "Hired ✓"];

function JobSeekerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<number>(0);
  const [savedJobs, setSavedJobs] = useState<number>(0);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"jobs" | "applications" | "insights">("jobs");

  const AI_SUGGESTIONS = [
    "Review my CV",
    "Match me to jobs",
    "Improve my headline",
    "What salary should I ask?",
    "Interview tips for me",
  ];

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [jobRes, appRes, profileRes] = await Promise.all([
        supabase.from("job_listings").select("id, title, business_name, location, salary_min, salary_max, job_type, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(10),
        supabase.from("job_applications").select("id", { count: "exact", head: true }).eq("applicant_id", profile?.id ?? ""),
        supabase.from("skill_profiles").select("id").eq("user_id", profile?.id ?? "").maybeSingle(),
      ]);
      setJobs((jobRes.data as JobListing[]) ?? []);
      setApplications(appRes.count ?? 0);
      setSavedJobs(0);
      setHasProfile(!!profileRes.data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <Header
        title="Career Dashboard"
        subtitle="Your AI-powered job search hub"
        actions={<Link href="/dashboard/jobs"><Button size="sm"><Search size={14} /> Browse Jobs</Button></Link>}
      />
      <div className="p-6 space-y-6">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(16,185,129,0.2)] bg-gradient-to-r from-[rgba(16,185,129,0.1)] via-[rgba(16,185,129,0.04)] to-transparent p-6">
          <h2 className="text-lg font-semibold text-[#f1f5f9]">{greeting()}, <span className="text-[#10b981]">{firstName}</span></h2>
          <p className="text-sm text-[#64748b] mt-1">
            {applications > 0 ? `${applications} active application${applications !== 1 ? "s" : ""} in progress.` : "Your next opportunity is waiting."}
          </p>
          <Briefcase size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#10b981] opacity-8" />
        </div>

        {/* Profile CTA if not set up */}
        {!hasProfile && !loading && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(16,185,129,0.25)] bg-[rgba(16,185,129,0.06)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(16,185,129,0.15)] flex items-center justify-center flex-shrink-0">
              <Briefcase size={18} className="text-[#10b981]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f1f5f9]">Complete your talent profile</p>
              <p className="text-xs text-[#64748b]">Unlock AI job matching and let employers find you.</p>
            </div>
            <Link href="/dashboard/onboarding/job-seeker">
              <button className="flex-shrink-0 px-3 py-2 bg-[#10b981] text-white text-xs font-semibold rounded-xl hover:bg-[#059669] transition-colors">
                Set up now
              </button>
            </Link>
          </div>
        )}

        {/* Career workflow progress */}
        <div>
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Career Workflow</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {CAREER_WORKFLOW.map((step, i) => {
              const done = (i === 0 && hasProfile) || (i === 1 && hasProfile) || (i >= 4 && applications > 0);
              const active = !done && ((i === 0 && !hasProfile) || (i === 2 && hasProfile));
              return (
                <div key={step} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    done   ? "bg-[rgba(16,185,129,0.15)] text-[#10b981]" :
                    active ? "bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.3)] text-[#10b981]" :
                    "bg-[#111624] text-[#374151]"
                  }`}>
                    {done && <CheckCircle2 size={11} />}
                    {step}
                  </div>
                  {i < CAREER_WORKFLOW.length - 1 && <div className={`w-4 h-px flex-shrink-0 ${done ? "bg-[#10b981]" : "bg-white/7"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111624] border border-white/7 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#10b981]">{loading ? "—" : applications}</p>
            <p className="text-xs text-[#64748b] mt-1">Applications</p>
          </div>
          <div className="bg-[#111624] border border-white/7 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#3b82f6]">{loading ? "—" : savedJobs}</p>
            <p className="text-xs text-[#64748b] mt-1">Saved Jobs</p>
          </div>
          <div className="bg-[#111624] border border-white/7 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#FF8B5E]">{loading ? "—" : jobs.length}</p>
            <p className="text-xs text-[#64748b] mt-1">Open Today</p>
          </div>
        </div>

        {/* AI Career Copilot */}
        <div className="rounded-2xl border border-[rgba(139,92,246,0.25)] bg-gradient-to-br from-[rgba(139,92,246,0.08)] to-[rgba(16,185,129,0.04)] p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
              <Sparkles size={14} className="text-[#a78bfa]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f1f5f9]">AI Career Copilot</p>
              <p className="text-xs text-[#64748b]">Powered by KENUXA AI</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {AI_SUGGESTIONS.map((s) => (
              <Link key={s} href={`/dashboard/ai?q=${encodeURIComponent(s)}`}>
                <button className="px-3 py-1.5 rounded-full border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.08)] text-[#a78bfa] text-xs hover:bg-[rgba(139,92,246,0.15)] transition-colors">
                  {s}
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Tab panel */}
        <div>
          <div className="flex gap-1 mb-4 bg-[#0a0c15] p-1 rounded-xl">
            {(["jobs", "applications", "insights"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                  activeTab === t ? "bg-[#111624] text-[#f1f5f9] shadow-sm" : "text-[#374151] hover:text-[#64748b]"
                }`}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === "jobs" && (
            <div className="space-y-2">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-[#111624] rounded-xl animate-pulse" />)
              ) : jobs.length === 0 ? (
                <p className="text-sm text-[#64748b] py-6 text-center">No open jobs right now.</p>
              ) : (
                jobs.map((j) => (
                  <Link key={j.id} href="/dashboard/jobs">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-[#111624] border border-white/7 hover:border-[rgba(16,185,129,0.3)] transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
                          <Briefcase size={14} className="text-[#10b981]" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f1f5f9] truncate">{j.title}</p>
                          <p className="text-xs text-[#64748b]">{j.business_name ?? "Company"}{j.location ? ` · ${j.location}` : ""}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        {j.salary_min && <p className="text-xs font-semibold text-[#10b981]">₵{j.salary_min.toLocaleString()}/mo</p>}
                        <p className="text-[10px] text-[#374151] capitalize">{j.job_type ?? "Full-time"}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
              <Link href="/dashboard/jobs">
                <button className="w-full mt-2 py-2.5 border border-white/7 rounded-xl text-xs text-[#64748b] hover:border-white/20 hover:text-[#f1f5f9] transition-all">
                  Browse all jobs →
                </button>
              </Link>
            </div>
          )}

          {activeTab === "applications" && (
            <div className="text-center py-12">
              <CheckCircle2 size={32} className="text-[#374151] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#64748b]">{applications > 0 ? `${applications} applications sent` : "No applications yet"}</p>
              <p className="text-xs text-[#374151] mt-1">Track status, interview dates, and offers.</p>
              <Link href="/dashboard/jobs"><button className="mt-4 px-4 py-2 bg-[#10b981] text-white text-xs font-semibold rounded-xl hover:bg-[#059669] transition-colors">Find Jobs to Apply</button></Link>
            </div>
          )}

          {activeTab === "insights" && (
            <div className="space-y-3">
              {[
                { label: "Profile Completion", value: hasProfile ? "80%" : "20%", color: "#10b981" },
                { label: "Job Match Score", value: hasProfile ? "High" : "Set up profile", color: "#3b82f6" },
                { label: "Market Demand", value: "Rising for your skills", color: "#f59e0b" },
                { label: "Avg. Response Time", value: "2–3 business days", color: "#64748b" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#111624] border border-white/7">
                  <p className="text-sm text-[#94a3b8]">{s.label}</p>
                  <p className="text-sm font-semibold" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
              <Link href="/dashboard/talent">
                <button className="w-full py-2.5 mt-1 border border-white/7 rounded-xl text-xs text-[#64748b] hover:border-white/20 hover:text-[#f1f5f9] transition-all">
                  View full talent profile →
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Delivery Rider Home ───────────────────────────────────────────────────────

function RiderHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [runs, setRuns] = useState<DeliveryRun[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("deliveries")
        .select("id, status, customer_name, delivery_address, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      const rows = (data as DeliveryRun[]) ?? [];
      setRuns(rows);
      const todayRows = rows.filter((r) => new Date(r.created_at) >= todayStart);
      setTodayCount(todayRows.length);
      setEarnings(todayRows.filter((r) => r.status === "delivered").length * 15); // estimate GHS 15 per delivery
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColor: Record<string, string> = {
    pending: "text-[#fbbf24]",
    in_transit: "text-[#3B82F6]",
    delivered: "text-[#10b981]",
    failed: "text-[#f87171]",
  };

  return (
    <>
      <Header title="Delivery Dashboard" subtitle={today} actions={<Link href="/dashboard/delivery"><Button size="sm"><Truck size={14} /> My Runs</Button></Link>} />
      <div className="p-6 space-y-6">
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(59,130,246,0.2)] bg-gradient-to-r from-[rgba(59,130,246,0.08)] to-transparent p-6">
          <h2 className="text-lg font-semibold text-[#f1f5f9]">{greeting()}, <span className="text-[#3B82F6]">{profile?.full_name?.split(" ")[0] ?? "Rider"}</span></h2>
          <p className="text-sm text-[#64748b] mt-1">Ready for today&apos;s deliveries.</p>
          <Truck size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#3B82F6] opacity-8" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Today's Runs"     value={loading ? 0 : todayCount} format="number"   color="blue"   icon={<Truck size={16} />} />
          <StatCard title="Est. Earnings"    value={loading ? 0 : earnings}   format="currency"  color="green"  icon={<DollarSign size={16} />} />
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Deliveries</CardTitle></CardHeader>
          <CardContent className="pt-0 divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 my-2 bg-white/3 rounded-lg animate-pulse" />)
            ) : runs.length === 0 ? (
              <p className="text-sm text-[#64748b] py-6 text-center">No deliveries assigned yet.</p>
            ) : (
              runs.slice(0, 6).map((r) => (
                <div key={r.id} className="py-3 px-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#f1f5f9] truncate">{r.customer_name ?? "Customer"}</p>
                    <p className="text-xs text-[#64748b] truncate flex items-center gap-1"><MapPin size={10} /> {r.delivery_address ?? "—"}</p>
                  </div>
                  <span className={`text-xs font-semibold capitalize flex-shrink-0 ml-3 ${statusColor[r.status] ?? "text-[#64748b]"}`}>{r.status.replace("_", " ")}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Recruiter Home ─────────────────────────────────────────────────────────────

function RecruiterHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [openJobs, setOpenJobs] = useState(0);
  const [pendingApps, setPendingApps] = useState(0);
  const [recentApps, setRecentApps] = useState<{ id: string; applicant_name: string | null; job_title: string | null; status: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [jobsRes, appsRes] = await Promise.all([
        supabase.from("job_listings").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("job_applications").select("id, applicant_name, job_title, status, created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
      ]);
      setOpenJobs(jobsRes.count ?? 0);
      const apps = appsRes.data as typeof recentApps ?? [];
      setPendingApps(apps.length);
      setRecentApps(apps);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header title="Talent Dashboard" subtitle="Recruit top talent in Ghana" actions={<Link href="/dashboard/jobs"><Button size="sm"><Briefcase size={14} /> Post Job</Button></Link>} />
      <div className="p-6 space-y-6">
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(245,158,11,0.2)] bg-gradient-to-r from-[rgba(245,158,11,0.08)] to-transparent p-6">
          <h2 className="text-lg font-semibold text-[#f1f5f9]">{greeting()}, <span className="text-[#F59E0B]">{profile?.full_name?.split(" ")[0] ?? "Recruiter"}</span></h2>
          <p className="text-sm text-[#64748b] mt-1">Manage your hiring pipeline.</p>
          <Users size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#F59E0B] opacity-8" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Open Positions"    value={loading ? 0 : openJobs}    format="number" color="amber" icon={<Briefcase size={16} />} />
          <StatCard title="Pending Applications" value={loading ? 0 : pendingApps} format="number" color="blue"  icon={<Clock size={16} />} />
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Pending Applications</CardTitle>
            <Link href="/dashboard/jobs"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 my-2 bg-white/3 rounded-lg animate-pulse" />)
            ) : recentApps.length === 0 ? (
              <p className="text-sm text-[#64748b] py-6 text-center">No pending applications.</p>
            ) : (
              recentApps.map((a) => (
                <div key={a.id} className="py-3 px-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[rgba(245,158,11,0.1)] flex items-center justify-center text-[#F59E0B] font-bold text-xs flex-shrink-0">
                      {(a.applicant_name ?? "A")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9] truncate">{a.applicant_name ?? "Applicant"}</p>
                      <p className="text-xs text-[#64748b] truncate">{a.job_title ?? "Position"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#64748b] flex-shrink-0 ml-2">{formatDate(a.created_at)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Financial Partner Home ─────────────────────────────────────────────────────

function FinancialPartnerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [bizCount, setBizCount] = useState(0);
  const [loanApps, setLoanApps] = useState(0);
  const [txVolume, setTxVolume] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [bizRes, loanRes, txRes] = await Promise.all([
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("loan_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("transactions").select("amount").limit(500),
      ]);
      setBizCount(bizRes.count ?? 0);
      setLoanApps(loanRes.count ?? 0);
      setTxVolume((txRes.data ?? []).reduce((s: number, r: { amount?: number }) => s + (r.amount ?? 0), 0));
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const PIPELINE_STAGES = [
    { label: "Loan Applications",  value: loading ? "–" : loanApps,            color: "#F59E0B", sub: "Awaiting review" },
    { label: "Active Businesses",  value: loading ? "–" : bizCount.toLocaleString(), color: "#10b981", sub: "On platform" },
    { label: "Transaction Volume", value: loading ? "–" : formatCurrency(txVolume),  color: "#3B82F6", sub: "Recent activity" },
    { label: "KENUXA Score Avg",   value: "712",                                color: "#FF6524", sub: "Network trust avg" },
  ];

  return (
    <>
      <Header
        title="Financial Partner Hub"
        subtitle="Platform financial intelligence"
        actions={<Link href="/dashboard/lending"><Button size="sm"><Landmark size={14} /> Lending Pipeline</Button></Link>}
      />
      <div className="p-6 space-y-6">
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(16,185,129,0.2)] bg-gradient-to-r from-[rgba(16,185,129,0.08)] to-transparent p-6">
          <h2 className="text-lg font-semibold text-[#f1f5f9]">{greeting()}, <span className="text-[#10b981]">{profile?.full_name?.split(" ")[0] ?? "Partner"}</span></h2>
          <p className="text-sm text-[#64748b] mt-1">Access economic intelligence, credit scores, and lending opportunities across the KENUXA network.</p>
          <BarChart2 size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#10b981] opacity-8" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.label} className="bg-[#131621] border border-white/7 rounded-2xl p-5">
              <p className="text-xs text-[#64748b] mb-2">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-[#374151] mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Key capabilities */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { href: "/dashboard/lending",   label: "Lending Pipeline",    sub: "Review loan applications & approve credit",  Icon: Landmark,  color: "rgba(16,185,129,0.1)",  tc: "#10b981" },
            { href: "/dashboard/finance",   label: "Financial Analytics", sub: "P&L, cash flow, and business health signals", Icon: BarChart2, color: "rgba(59,130,246,0.1)",  tc: "#3B82F6" },
            { href: "/dashboard/payments",  label: "Payment Flows",       sub: "Monitor transaction volumes and patterns",    Icon: CreditCard,color: "rgba(245,158,11,0.1)",  tc: "#F59E0B" },
            { href: "/dashboard/analytics", label: "Risk Intelligence",   sub: "KENUXA Scores, credit signals, fraud flags",  Icon: TrendingUp,color: "rgba(255,101,36,0.1)", tc: "#FF8B5E" },
          ].map(({ href, label, sub, Icon, color, tc }) => (
            <Link key={href} href={href}>
              <Card className="p-4 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color }}>
                    <Icon size={18} style={{ color: tc }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#f1f5f9]">{label}</p>
                    <p className="text-xs text-[#64748b]">{sub}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* Value proposition */}
        <Card className="border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.04)]">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-[#f1f5f9] mb-3">Why lend through KENUXA?</p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Real transaction history", desc: "Credit decisions backed by verified sales data" },
                { label: "KENUXA Trust Scores", desc: "Multi-factor business reputation scoring" },
                { label: "Embedded collections", desc: "Repayments linked to POS revenue flows" },
              ].map((b) => (
                <div key={b.label} className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#10b981] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-[#f1f5f9]">{b.label}</p>
                    <p className="text-xs text-[#64748b]">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ─── Supplier Home ──────────────────────────────────────────────────────────────

function SupplierHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [openRfqs, setOpenRfqs] = useState(0);
  const [myBids, setMyBids] = useState(0);
  const [awarded, setAwarded] = useState(0);
  const [rfqList, setRfqList] = useState<{ id: string; title: string; category: string | null; budget_max: number | null; bids_count: number; deadline: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [rfqRes, bidsRes, awardedRes, listRes] = await Promise.all([
        supabase.from("rfqs").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("rfq_bids").select("id", { count: "exact", head: true }).eq("bidder_id", profile?.id ?? ""),
        supabase.from("rfq_bids").select("id", { count: "exact", head: true }).eq("bidder_id", profile?.id ?? "").eq("status", "awarded"),
        supabase.from("rfqs").select("id, title, category, budget_max, bids_count, deadline, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(6),
      ]);
      setOpenRfqs(rfqRes.count ?? 0);
      setMyBids(bidsRes.count ?? 0);
      setAwarded(awardedRes.count ?? 0);
      setRfqList(listRes.data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Header
        title="Supplier Dashboard"
        subtitle="Win contracts across the KENUXA network"
        actions={<Link href="/dashboard/rfq"><Button size="sm"><Factory size={14} /> Browse RFQs</Button></Link>}
      />
      <div className="p-6 space-y-6">
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(59,130,246,0.2)] bg-gradient-to-r from-[rgba(59,130,246,0.1)] via-[rgba(59,130,246,0.04)] to-transparent p-6">
          <h2 className="text-lg font-semibold text-[#f1f5f9]">
            {greeting()}, <span className="text-[#60A5FA]">{profile?.full_name?.split(" ")[0] ?? "Supplier"}</span>
          </h2>
          <p className="text-sm text-[#64748b] mt-1">New procurement requests are live. Submit bids to grow your order book.</p>
          <Factory size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#3B82F6] opacity-8" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Open RFQs",   value: openRfqs, color: "text-emerald-400" },
            { label: "My Bids",     value: myBids,   color: "text-blue-400" },
            { label: "Won",         value: awarded,  color: "text-orange-400" },
          ].map((s) => (
            <div key={s.label} className="bg-[#131621] border border-white/7 rounded-2xl p-4 text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{loading ? "–" : s.value}</p>
              <p className="text-xs text-[#64748b] mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Latest RFQs to Bid On</CardTitle>
            <Link href="/dashboard/rfq"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </CardHeader>
          <CardContent className="pt-0 divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 my-2 bg-white/3 rounded-lg animate-pulse" />)
            ) : rfqList.length === 0 ? (
              <p className="text-sm text-[#64748b] py-6 text-center">No open RFQs right now. Check back soon.</p>
            ) : (
              rfqList.map((rfq) => (
                <Link key={rfq.id} href="/dashboard/rfq">
                  <div className="py-3 px-2 hover:bg-white/2 rounded-lg transition-colors flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#f1f5f9] truncate">{rfq.title}</p>
                      <p className="text-xs text-[#64748b]">
                        {rfq.category ?? "General"} · {rfq.bids_count} bid{rfq.bids_count !== 1 ? "s" : ""}
                        {rfq.deadline ? ` · Due ${new Date(rfq.deadline).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}` : ""}
                      </p>
                    </div>
                    {rfq.budget_max && (
                      <span className="text-xs text-[#10b981] font-semibold flex-shrink-0 ml-3">
                        Up to {formatCurrency(rfq.budget_max)}
                      </span>
                    )}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Link href="/dashboard/rfq">
            <Card className="p-4 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(59,130,246,0.1)] flex items-center justify-center">
                  <ClipboardList size={16} className="text-[#60A5FA]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f1f5f9]">Procurement Exchange</p>
                  <p className="text-xs text-[#64748b]">Browse & bid on RFQs</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/dashboard/profile">
            <Card className="p-4 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center">
                  <Star size={16} className="text-[#10b981]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f1f5f9]">Supplier Profile</p>
                  <p className="text-xs text-[#64748b]">Build trust with buyers</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}

// ─── Freelancer Home — Full Project Pipeline Dashboard ────────────────────────

const FREELANCER_WORKFLOW = ["Publish Services", "Receive Leads", "Submit Proposals", "Win Project", "Deliver", "Get Paid", "Earn Reviews"];

function FreelancerHome({ profile }: { profile: ReturnType<typeof useAuth>["profile"] }) {
  const supabase = createClient();
  const [services, setServices] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [rating, setRating] = useState(0);
  const [openJobs, setOpenJobs] = useState<JobListing[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"projects" | "proposals" | "earnings">("projects");

  const AI_ACTIONS = ["Find clients for me", "Write my proposal", "Price my services", "Improve my profile", "Find gigs near me"];

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [listRes, jobsRes, profileRes] = await Promise.all([
        supabase.from("skill_profiles").select("rating, reviews_count, hourly_rate").eq("user_id", profile?.id ?? "").maybeSingle(),
        supabase.from("job_listings").select("id, title, business_name, location, salary_min, salary_max, job_type, created_at").eq("status", "open").order("created_at", { ascending: false }).limit(6),
        supabase.from("skill_profiles").select("id").eq("user_id", profile?.id ?? "").maybeSingle(),
      ]);
      const p = listRes.data as { rating?: number; reviews_count?: number; hourly_rate?: number } | null;
      setServices(p ? 1 : 0);
      setRating(p?.rating ?? 0);
      setOpenJobs((jobsRes.data as JobListing[]) ?? []);
      setHasProfile(!!profileRes.data);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <Header
        title="Freelancer Hub"
        subtitle="Your project pipeline & earnings"
        actions={<Link href="/dashboard/skills"><Button size="sm"><Sparkles size={14} /> My Services</Button></Link>}
      />
      <div className="p-6 space-y-6">
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(139,92,246,0.2)] bg-gradient-to-r from-[rgba(139,92,246,0.1)] to-transparent p-6">
          <h2 className="text-lg font-semibold text-[#f1f5f9]">{greeting()}, <span className="text-[#a78bfa]">{firstName}</span></h2>
          <p className="text-sm text-[#64748b] mt-1">Your skills are your business. Build your reputation one project at a time.</p>
          <Sparkles size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#8B5CF6] opacity-8" />
        </div>

        {/* Profile CTA */}
        {!hasProfile && !loading && (
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.06)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center flex-shrink-0">
              <Pen size={17} className="text-[#8b5cf6]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#f1f5f9]">Set up your freelancer profile</p>
              <p className="text-xs text-[#64748b]">List your services and start receiving client inquiries.</p>
            </div>
            <Link href="/dashboard/onboarding/freelancer">
              <button className="flex-shrink-0 px-3 py-2 bg-[#8b5cf6] text-white text-xs font-semibold rounded-xl hover:bg-[#7c3aed] transition-colors">
                Set up now
              </button>
            </Link>
          </div>
        )}

        {/* Workflow progress */}
        <div>
          <p className="text-xs font-semibold text-[#374151] uppercase tracking-widest mb-3">Freelancer Workflow</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {FREELANCER_WORKFLOW.map((step, i) => {
              const done = hasProfile && i <= 1;
              const active = hasProfile && i === 2;
              return (
                <div key={step} className="flex items-center gap-1 flex-shrink-0">
                  <div className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 ${
                    done   ? "bg-[rgba(139,92,246,0.15)] text-[#a78bfa]" :
                    active ? "bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.3)] text-[#a78bfa]" :
                    "bg-[#111624] text-[#374151]"
                  }`}>
                    {done && <CheckCircle2 size={11} />}
                    {step}
                  </div>
                  {i < FREELANCER_WORKFLOW.length - 1 && <div className={`w-3 h-px flex-shrink-0 ${done ? "bg-[#8b5cf6]" : "bg-white/7"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#111624] border border-white/7 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#a78bfa]">{loading ? "—" : services}</p>
            <p className="text-xs text-[#64748b] mt-1">Active Services</p>
          </div>
          <div className="bg-[#111624] border border-white/7 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#10b981]">₵{loading ? "—" : totalEarned.toLocaleString()}</p>
            <p className="text-xs text-[#64748b] mt-1">Total Earned</p>
          </div>
          <div className="bg-[#111624] border border-white/7 rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-[#f59e0b]">{loading ? "—" : rating > 0 ? rating.toFixed(1) : "—"}</p>
            <p className="text-xs text-[#64748b] mt-1">Avg. Rating</p>
          </div>
        </div>

        {/* AI Business Assistant */}
        <div className="rounded-2xl border border-[rgba(139,92,246,0.25)] bg-gradient-to-br from-[rgba(139,92,246,0.07)] to-[rgba(255,101,36,0.04)] p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
              <Sparkles size={14} className="text-[#a78bfa]" />
            </div>
            <p className="text-sm font-semibold text-[#f1f5f9]">AI Business Assistant</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {AI_ACTIONS.map((a) => (
              <Link key={a} href={`/dashboard/ai?q=${encodeURIComponent(a)}`}>
                <button className="px-3 py-1.5 rounded-full border border-[rgba(139,92,246,0.25)] bg-[rgba(139,92,246,0.08)] text-[#a78bfa] text-xs hover:bg-[rgba(139,92,246,0.15)] transition-colors">
                  {a}
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Tab panel */}
        <div>
          <div className="flex gap-1 mb-4 bg-[#0a0c15] p-1 rounded-xl">
            {(["projects", "proposals", "earnings"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                  activeTab === t ? "bg-[#111624] text-[#f1f5f9] shadow-sm" : "text-[#374151] hover:text-[#64748b]"
                }`}>
                {t}
              </button>
            ))}
          </div>

          {activeTab === "projects" && (
            <div className="space-y-2">
              {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-[#111624] rounded-xl animate-pulse" />) :
              openJobs.length === 0 ? (
                <p className="text-sm text-[#64748b] py-6 text-center">No open opportunities right now.</p>
              ) : (
                openJobs.map((j) => (
                  <Link key={j.id} href="/dashboard/jobs">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[#111624] border border-white/7 hover:border-[rgba(139,92,246,0.3)] transition-all">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9] truncate">{j.title}</p>
                        <p className="text-xs text-[#64748b]">{j.business_name ?? "Client"}{j.location ? ` · ${j.location}` : ""}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        {j.salary_min && <p className="text-xs font-semibold text-[#a78bfa]">₵{j.salary_min.toLocaleString()}</p>}
                        <p className="text-[10px] text-[#374151] capitalize">{j.job_type ?? "Contract"}</p>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === "proposals" && (
            <div className="text-center py-10">
              <MessageSquare size={32} className="text-[#374151] mx-auto mb-2" />
              <p className="text-sm text-[#64748b]">No active proposals</p>
              <p className="text-xs text-[#374151] mt-1">Browse projects and submit proposals to win work.</p>
              <Link href="/dashboard/skills"><button className="mt-4 px-4 py-2 bg-[#8b5cf6] text-white text-xs font-semibold rounded-xl hover:bg-[#7c3aed] transition-colors">View My Services</button></Link>
            </div>
          )}

          {activeTab === "earnings" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] text-center">
                <p className="text-3xl font-bold text-[#10b981]">₵{totalEarned.toLocaleString()}</p>
                <p className="text-xs text-[#64748b] mt-1">Total Lifetime Earnings</p>
              </div>
              {[
                { label: "This Month", value: "₵0" },
                { label: "Pending Payout", value: "₵0" },
                { label: "Completed Projects", value: "0" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#111624] border border-white/7">
                  <p className="text-sm text-[#94a3b8]">{s.label}</p>
                  <p className="text-sm font-semibold text-[#f1f5f9]">{s.value}</p>
                </div>
              ))}
              <Link href="/dashboard/wallet"><button className="w-full py-2.5 border border-white/7 rounded-xl text-xs text-[#64748b] hover:border-white/20 hover:text-[#f1f5f9] transition-all">View Wallet →</button></Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Root Dashboard Page — Multi-Role Context Router ─────────────────────────

export default function DashboardPage() {
  const { profile, role: primaryRole, loading: authLoading } = useAuth();
  const { activeContext, loading: rolesLoading } = useRoles();

  const loading = authLoading || rolesLoading;

  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="h-16 border-b border-white/7 bg-[#0d0f1a]" />
        <div className="p-6 space-y-4">
          <div className="h-32 rounded-2xl bg-[#111624] animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-xl bg-[#111624] animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  // Context-aware routing: respects the active role context from the role switcher.
  // Falls back to primary role from user_profiles for backward compat.
  const context = activeContext || primaryRole || "customer";

  switch (context) {
    case "customer":
      return <div className="animate-fade-in"><ConsumerHome profile={profile} /></div>;
    case "job_seeker":
      return <div className="animate-fade-in"><JobSeekerHome profile={profile} /></div>;
    case "delivery_rider":
      return <div className="animate-fade-in"><RiderHome profile={profile} /></div>;
    case "recruiter":
      return <div className="animate-fade-in"><RecruiterHome profile={profile} /></div>;
    case "financial_partner":
      return <div className="animate-fade-in"><FinancialPartnerHome profile={profile} /></div>;
    case "supplier":
      return <div className="animate-fade-in"><SupplierHome profile={profile} /></div>;
    case "freelancer":
      return <div className="animate-fade-in"><FreelancerHome profile={profile} /></div>;
    default:
      return <div className="animate-fade-in"><BusinessHome profile={profile} role={context} /></div>;
  }
}
