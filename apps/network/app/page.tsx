import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight, Shield, Globe, Rocket, TrendingUp,
  Building2, Users, Factory, Landmark, Truck,
  ShoppingBag, Briefcase, Wrench, Star, CreditCard,
  Sparkles, CheckCircle, Play, ChevronRight, X,
  BarChart3, Lock, Cpu, Network, DollarSign,
  MessageSquare, Award, Pill, UtensilsCrossed,
  BedDouble, GraduationCap, Stethoscope, Sprout, Check,
  Zap as Bolt, Activity,
} from "lucide-react";

export const metadata: Metadata = {
  title: "KENUXA — The Economic Network",
  description: "One platform connecting businesses, customers, freelancers, job seekers, suppliers, and financial institutions. Register free.",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Discover",    href: "/find" },
  { label: "Marketplace", href: "/dashboard/marketplace" },
  { label: "Jobs",        href: "/dashboard/jobs" },
  { label: "Finance",     href: "/dashboard/credit" },
  { label: "Pricing",     href: "#pricing" },
];

const ROLES = [
  { icon: ShoppingBag, label: "Customer",          desc: "Shop, discover, earn rewards and cashback",    color: "#06b6d4", accent: "rgba(6,182,212,0.07)" },
  { icon: Building2,   label: "Business Owner",    desc: "POS, CRM, inventory, analytics — all-in-one", color: "#3b82f6", accent: "rgba(59,130,246,0.07)" },
  { icon: Briefcase,   label: "Job Seeker",        desc: "Find jobs, build your career profile",        color: "#6366f1", accent: "rgba(99,102,241,0.07)" },
  { icon: Wrench,      label: "Freelancer",        desc: "Offer services, get hired, get paid",         color: "#a78bfa", accent: "rgba(167,139,250,0.07)" },
  { icon: Factory,     label: "Supplier",          desc: "Trade B2B, receive RFQs, grow wholesale",    color: "#f97316", accent: "rgba(249,115,22,0.07)"  },
  { icon: Truck,       label: "Delivery Rider",    desc: "Earn on your schedule, track in real-time",  color: "#84cc16", accent: "rgba(132,204,22,0.07)"  },
  { icon: Landmark,    label: "Financial Partner", desc: "Fund SMEs with verified KENUXA scores",      color: "#14b8a6", accent: "rgba(20,184,166,0.07)"  },
  { icon: Star,        label: "Recruiter",         desc: "Post jobs, assess talent, hire fast",        color: "#ec4899", accent: "rgba(236,72,153,0.07)"  },
];

const PLATFORM_FEATURES = [
  { icon: CreditCard, title: "KENUX Wallet",          desc: "Double-entry ledger wallet. Pay, receive, earn KENUX. Mobile money, card & bank supported.",       color: "#FF8B5E", badge: "Finance" },
  { icon: Sparkles,   title: "AI Economic Copilot",   desc: "Business insights, market intelligence, job matching — powered by your own economic data.",        color: "#8b5cf6", badge: "AI" },
  { icon: Network,    title: "Economic Graph",        desc: "Every transaction builds your KENUXA score — your reputation and credit passport.",                color: "#10b981", badge: "Identity" },
  { icon: Shield,     title: "KENUXA ID",             desc: "Verified digital identity linking business, employment, purchases, and financial history.",        color: "#3b82f6", badge: "Security" },
  { icon: Globe,      title: "54+ Country Coverage",  desc: "Local currencies, payment rails, and languages. Built for fast-growing markets from day one.",     color: "#f59e0b", badge: "Global" },
  { icon: Landmark,   title: "Financial Services",    desc: "Working capital, invoice financing, BNPL — connected to banks and fintechs via one verified API.", color: "#ec4899", badge: "Credit" },
];

const HOW_IT_WORKS = [
  { step: "01", title: "Create Your KENUXA ID",      desc: "Register in under 2 minutes. One identity for every role — customer, business, freelancer, and more.", icon: Users },
  { step: "02", title: "Activate Your Role",          desc: "Switch between roles at any time. Customer, business, freelancer — no separate accounts.",           icon: Cpu },
  { step: "03", title: "Transact & Build Credit",    desc: "Every transaction and review builds your KENUXA economic score — your passport to financing.",      icon: BarChart3 },
  { step: "04", title: "Grow with the Network",       desc: "Access working capital, AI insights, supplier networks, and premium tools as you grow.",            icon: TrendingUp },
];

const TESTIMONIALS = [
  { quote: "KENUXA changed how we manage our whole operation. POS, inventory, CRM — everything in one place. We grew 40% in six months.", name: "Ama Owusu", role: "Business Owner, Accra", initials: "AO", color: "#FF8B5E" },
  { quote: "I got my first working capital loan through KENUXA's financial partner portal. My KENUXA score made the approval fast and transparent.", name: "Kwame Asante", role: "Supplier, Kumasi", initials: "KA", color: "#10b981" },
  { quote: "As a freelancer, having my work history, reviews, and earnings in one verified profile means clients trust me immediately. My income doubled.", name: "Fatima Ibrahim", role: "Freelance Designer, Lagos", initials: "FI", color: "#8b5cf6" },
];

const PRICING = [
  {
    name: "Free", price: "GH₵ 0", period: "/month", desc: "Personal account — always free", featured: false,
    features: ["KENUXA ID + Wallet", "Shop the marketplace", "Apply to jobs", "500 KENUX welcome bonus", "AI assistant (basic)", "Community access"],
    cta: "Start Free", href: "/register",
  },
  {
    name: "Business", price: "GH₵ 149", period: "/month", desc: "Full business operating system", featured: true, badge: "Most Popular",
    features: ["Everything in Free", "POS + Inventory + CRM", "Marketplace storefront", "AI Business Assistant", "Marketing & Reputation tools", "50 staff accounts · 5 branches", "Financial services access", "Priority support"],
    cta: "Start 14-Day Trial", href: "/register",
  },
  {
    name: "Enterprise", price: "Custom", period: "", desc: "For chains, groups & institutions", featured: false,
    features: ["Everything in Business", "Unlimited branches & staff", "Dedicated API access", "Custom integrations", "Treasury dashboard", "Dedicated account manager", "SLA + uptime guarantee", "White-label options"],
    cta: "Contact Sales", href: "/register",
  },
];

const COUNTRIES = [
  "Ghana", "Nigeria", "Kenya", "South Africa", "Tanzania", "Uganda",
  "Rwanda", "Ivory Coast", "Senegal", "Ethiopia", "Cameroon", "Zambia",
  "Zimbabwe", "Malawi", "Sierra Leone", "Mozambique",
];

const INDUSTRIES = [
  { icon: UtensilsCrossed, label: "Restaurant OS",   color: "#f97316", desc: "Orders, kitchen display, table management" },
  { icon: Pill,            label: "Pharmacy OS",     color: "#10b981", desc: "NAFDAC compliance, dispensing, prescriptions" },
  { icon: BedDouble,       label: "Hotel OS",        color: "#3b82f6", desc: "Rooms, bookings, housekeeping" },
  { icon: Stethoscope,     label: "Healthcare OS",   color: "#ec4899", desc: "Patients, appointments, billing" },
  { icon: GraduationCap,   label: "Education OS",    color: "#8b5cf6", desc: "Students, fees, attendance" },
  { icon: Sprout,          label: "Agriculture OS",  color: "#84cc16", desc: "Crops, harvests, produce sales" },
];

const VS_TOOLS = [
  { tool: "QuickBooks",   purpose: "Accounting",    replaced: true },
  { tool: "Shopify",      purpose: "E-commerce",    replaced: true },
  { tool: "LinkedIn",     purpose: "Jobs & talent",  replaced: true },
  { tool: "Paystack",     purpose: "Payments",       replaced: false, note: "Powered by" },
  { tool: "HubSpot CRM",  purpose: "CRM",           replaced: true },
  { tool: "Upwork",       purpose: "Freelancing",    replaced: true },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();
  const [bizRes, userRes, jobRes] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("job_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const totalBiz   = bizRes.count  ?? 0;
  const totalUsers = userRes.count ?? 0;
  const totalJobs  = jobRes.count  ?? 0;

  return (
    <div className="min-h-screen bg-[#060810] text-[#f1f5f9] overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.05] bg-[#060810]/95 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 h-[62px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-base shadow-[0_0_24px_rgba(255,101,36,0.5)]">K</div>
              <div className="absolute -inset-1 bg-gradient-to-br from-[#FF6524] to-[#F59E0B] rounded-[14px] blur opacity-20 -z-10" />
            </div>
            <div>
              <span className="font-black text-[#f1f5f9] tracking-tight text-lg">KENUXA</span>
              <span className="hidden sm:inline text-[#2d3450] text-[11px] ml-2">· Economic Network</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm">
            {NAV_LINKS.map((l) => (
              <Link key={l.label} href={l.href} className="text-[#4a5578] hover:text-[#f1f5f9] transition-colors font-medium">{l.label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:flex items-center px-4 py-2 text-sm text-[#4a5578] hover:text-[#f1f5f9] font-medium transition-colors">Sign in</Link>
            <Link href="/register">
              <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-[0_4px_18px_rgba(255,101,36,0.4)]">
                Get Started <ArrowRight size={13} />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-32 px-5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-5%,rgba(255,101,36,0.22)_0%,transparent_65%)] pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(139,92,246,0.07)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[radial-gradient(circle,rgba(59,130,246,0.07)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.014)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.014)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_20%,black_0%,transparent_100%)] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2.5 bg-[rgba(255,101,36,0.08)] border border-[rgba(255,101,36,0.18)] rounded-full px-5 py-2 text-xs font-bold text-[#FF8B5E] mb-10 tracking-wide">
            <span className="w-1.5 h-1.5 bg-[#FF6524] rounded-full animate-pulse" />
            NOW LIVE · REGISTER FREE
            {totalBiz > 0 && <><span className="text-[rgba(255,101,36,0.4)]">·</span><span className="text-[#FF8B5E]">{totalBiz.toLocaleString()} businesses joined</span></>}
          </div>

          {/* Headline */}
          <h1 className="text-[52px] sm:text-[68px] md:text-[88px] font-black leading-[0.88] tracking-[-0.02em] mb-8">
            <span className="text-[#f1f5f9]">One Platform.</span>
            <br />
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] via-[#FF8B5E] to-[#F59E0B]">
                Every Economic Role.
              </span>
              <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 400 6" fill="none" preserveAspectRatio="none">
                <path d="M0 3 Q100 0 200 3 Q300 6 400 3" stroke="url(#u1)" strokeWidth="2.5" fill="none" />
                <defs><linearGradient id="u1" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#FF6524" /><stop offset="1" stopColor="#F59E0B" /></linearGradient></defs>
              </svg>
            </span>
            <br />
            <span className="text-[#f1f5f9]">Infinite Possibilities.</span>
          </h1>

          <p className="text-lg sm:text-xl text-[#4a5578] max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Whether you&apos;re building a business, seeking work, buying products, or financing growth —
            KENUXA gives you every tool, every connection, and every financial service in one verified identity.
          </p>

          {/* CTA group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link href="/register">
              <button className="flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white font-bold text-base hover:opacity-90 transition-opacity shadow-[0_10px_40px_rgba(255,101,36,0.4)]">
                <Rocket size={17} />
                Join Free — Instant Access
              </button>
            </Link>
            <Link href="/find">
              <button className="flex items-center gap-2.5 px-8 py-4 rounded-2xl border border-white/[0.1] bg-white/[0.02] text-[#7a86a0] font-semibold text-base hover:border-white/[0.2] hover:text-[#f1f5f9] transition-all backdrop-blur-sm">
                <Play size={14} fill="currentColor" className="text-[#FF8B5E]" />
                Explore the Network
              </button>
            </Link>
          </div>

          {/* Live stats bar */}
          <div className="inline-grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.06] bg-[#0b0e1a] border border-white/[0.07] rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            {[
              { value: totalBiz > 0 ? `${totalBiz.toLocaleString()}+` : "10K+",     label: "Businesses" },
              { value: totalUsers > 0 ? `${totalUsers.toLocaleString()}+` : "150K+", label: "Users" },
              { value: totalJobs > 0 ? `${totalJobs.toLocaleString()}+` : "2K+",     label: "Live Jobs" },
              { value: "54+",                                                          label: "Countries" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-4 text-center">
                <div className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8B5E] to-[#F59E0B]">{s.value}</div>
                <div className="text-[9px] text-[#2d3450] uppercase tracking-[0.18em] mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Floating role chips */}
        <div className="hidden xl:flex absolute left-8 top-1/2 -translate-y-1/2 flex-col gap-3">
          {["Business Owner", "Customer", "Freelancer", "Supplier"].map((r, i) => (
            <div key={r} className="flex items-center gap-2 bg-[#0b0e1a] border border-white/[0.07] rounded-xl px-3.5 py-2 text-xs text-[#4a5578]"
              style={{ opacity: 1 - i * 0.18, transform: `translateX(${i * 8}px)` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF6524] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />{r}
            </div>
          ))}
        </div>
        <div className="hidden xl:flex absolute right-8 top-1/2 -translate-y-1/2 flex-col gap-3">
          {["Job Seeker", "Delivery Rider", "Financial Partner", "Recruiter"].map((r, i) => (
            <div key={r} className="flex items-center gap-2 bg-[#0b0e1a] border border-white/[0.07] rounded-xl px-3.5 py-2 text-xs text-[#4a5578]"
              style={{ opacity: 1 - i * 0.18, transform: `translateX(${-i * 8}px)` }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />{r}
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUST BAR ───────────────────────────────────────── */}
      <div className="border-y border-white/[0.05] bg-[#080b17] py-5">
        <div className="max-w-5xl mx-auto px-5 flex flex-wrap items-center justify-center gap-8">
          {[
            { icon: Lock,       label: "Bank-grade security" },
            { icon: Shield,     label: "KYC / KYB verified" },
            { icon: Globe,      label: "54 countries" },
            { icon: DollarSign, label: "Real payments, zero mocks" },
            { icon: Award,      label: "Ledger-grade accounting" },
            { icon: Activity,   label: "99.9% uptime SLA" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-[#374151] text-xs font-medium">
              <Icon size={13} className="text-[#2d3450]" />{label}
            </div>
          ))}
        </div>
      </div>

      {/* ── VS COMPARISON ───────────────────────────────────── */}
      <section className="py-28 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_30%_50%,rgba(255,101,36,0.04)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FF8B5E] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#FF6524]" />Why KENUXA<span className="w-4 h-px bg-[#FF6524]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Stop juggling 6+ tools.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] to-[#F59E0B]">Run everything from one place.</span>
            </h2>
            <p className="text-[#4a5578] max-w-xl mx-auto text-base">
              The average SME pays for 6–8 separate software tools. KENUXA replaces all of them — and connects them to payments and financing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            {/* Without KENUXA */}
            <div className="rounded-3xl border border-white/[0.07] bg-[#0b0e1a] p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full bg-[rgba(248,113,113,0.15)] flex items-center justify-center">
                  <X size={12} className="text-[#f87171]" />
                </div>
                <h3 className="font-bold text-[#f87171] text-sm">Without KENUXA</h3>
              </div>
              <div className="space-y-3">
                {VS_TOOLS.map(({ tool, purpose }) => (
                  <div key={tool} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm text-[#94a3b8] font-medium">{tool}</p>
                      <p className="text-xs text-[#374151]">{purpose}</p>
                    </div>
                    <span className="text-[10px] text-[#f87171] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.15)] px-2.5 py-1 rounded-full font-semibold">Separate subscription</span>
                  </div>
                ))}
                <div className="pt-3">
                  <p className="text-sm font-bold text-[#f87171]">~GH₵ 1,200+/month</p>
                  <p className="text-xs text-[#374151] mt-0.5">Plus switching between apps, no economic data link</p>
                </div>
              </div>
            </div>

            {/* With KENUXA */}
            <div className="rounded-3xl border border-[rgba(255,101,36,0.25)] bg-[rgba(255,101,36,0.03)] p-8 relative overflow-hidden shadow-[0_0_60px_rgba(255,101,36,0.08)]">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FF6524] via-[#FF8B5E] to-transparent" />
              <div className="flex items-center gap-2 mb-6">
                <div className="w-6 h-6 rounded-full bg-[rgba(52,211,153,0.15)] flex items-center justify-center">
                  <Check size={12} className="text-[#34d399]" />
                </div>
                <h3 className="font-bold text-[#34d399] text-sm">With KENUXA</h3>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Full POS + Inventory", purpose: "Operations" },
                  { name: "Marketplace Storefront", purpose: "E-commerce" },
                  { name: "Jobs & Talent Platform", purpose: "Recruitment" },
                  { name: "Paystack Payments", purpose: "Payments", note: "Integrated" },
                  { name: "CRM + Customer Loyalty", purpose: "CRM" },
                  { name: "Freelance Marketplace", purpose: "Freelancing" },
                ].map(({ name, purpose, note }) => (
                  <div key={name} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                    <div>
                      <p className="text-sm text-[#f1f5f9] font-medium">{name}</p>
                      <p className="text-xs text-[#64748b]">{purpose}</p>
                    </div>
                    <span className="text-[10px] text-[#34d399] bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)] px-2.5 py-1 rounded-full font-semibold">
                      {note ?? "Included"}
                    </span>
                  </div>
                ))}
                <div className="pt-3">
                  <p className="text-sm font-bold text-[#FF8B5E]">GH₵ 149/month</p>
                  <p className="text-xs text-[#64748b] mt-0.5">Everything connected. One economic identity. One score.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ROLES ───────────────────────────────────────────── */}
      <section className="py-28 px-5 relative bg-[#080b17] border-y border-white/[0.05]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(59,130,246,0.04)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FF8B5E] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#FF6524]" />One KENUXA ID<span className="w-4 h-px bg-[#FF6524]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Every Economic Role<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] to-[#F59E0B]">In One Account</span>
            </h2>
            <p className="text-[#4a5578] max-w-lg mx-auto text-base">
              Register once. Activate any role at any time. No separate apps, no duplicate accounts.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROLES.map(({ icon: Icon, label, desc, color, accent }) => (
              <Link key={label} href="/register">
                <div className="group relative p-5 rounded-2xl border border-white/[0.06] hover:border-white/[0.13] transition-all cursor-pointer overflow-hidden"
                  style={{ background: `linear-gradient(135deg, ${accent}, rgba(11,14,26,0.8))` }}>
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                    style={{ background: color, transform: "translate(30%, -30%)" }} />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-white/[0.06]" style={{ background: `${color}18` }}>
                      <Icon size={18} style={{ color }} />
                    </div>
                    <p className="font-bold text-[#e2e8f0] text-sm mb-1.5">{label}</p>
                    <p className="text-xs text-[#374151] leading-relaxed">{desc}</p>
                    <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color }}>
                      Join as {label} <ChevronRight size={9} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── INDUSTRY OS ─────────────────────────────────────── */}
      <section className="py-28 px-5 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#10b981] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#10b981]" />Industry Operating Systems<span className="w-4 h-px bg-[#10b981]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
              Built for Your Industry.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-[#3b82f6]">Not Generic Software.</span>
            </h2>
            <p className="text-[#4a5578] max-w-xl mx-auto text-base">
              Every industry module is purpose-built with workflows that match how your business actually operates.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {INDUSTRIES.map(({ icon: Icon, label, desc, color }) => (
              <Link key={label} href="/register">
                <div className="group p-6 rounded-2xl border border-white/[0.06] hover:border-white/[0.15] bg-[#0b0e1a] transition-all cursor-pointer relative overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ background: `radial-gradient(circle at top left, ${color}08 0%, transparent 70%)` }} />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 border border-white/[0.05]" style={{ background: `${color}14` }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <h3 className="font-bold text-[#e2e8f0] mb-2 text-sm">{label}</h3>
                    <p className="text-xs text-[#374151] leading-relaxed">{desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-[#64748b] group-hover:text-[#94a3b8] transition-colors">
                      Explore module <ArrowRight size={9} />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-8">
            <p className="text-sm text-[#374151]">
              + General retail, mobile money, professional services, and more
              <Link href="/register" className="text-[#FF8B5E] ml-2 hover:underline">View all →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="py-28 px-5 bg-[#080b17] border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#10b981] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#10b981]" />How It Works<span className="w-4 h-px bg-[#10b981]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5">From Sign-up to Economic Activity<br />in Minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="relative p-6 rounded-2xl border border-white/[0.06] bg-[#0b0e1a] group">
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 -right-3 w-6 h-px bg-gradient-to-r from-[rgba(255,101,36,0.4)] to-transparent z-10" />
                )}
                <div className="text-[10px] font-black text-[#FF6524] tracking-[0.2em] mb-4 opacity-70">{step}</div>
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,101,36,0.1)] border border-[rgba(255,101,36,0.15)] flex items-center justify-center mb-4">
                  <Icon size={18} className="text-[#FF8B5E]" />
                </div>
                <h3 className="font-bold text-[#e2e8f0] mb-2 text-sm">{title}</h3>
                <p className="text-xs text-[#374151] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KENUX CURRENCY ──────────────────────────────────── */}
      <section className="py-28 px-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,101,36,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(139,92,246,0.05)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[rgba(255,101,36,0.07)] border border-[rgba(255,101,36,0.15)] rounded-full px-5 py-2 text-xs font-bold text-[#FF8B5E] mb-7 tracking-wide">
              <Bolt size={11} fill="currentColor" /> KENUX Economy
            </div>
            <h2 className="text-4xl md:text-[52px] font-black mb-6 leading-tight">
              Meet{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] to-[#F59E0B]">KENUX</span>
              <br />The Platform Currency
            </h2>
            <p className="text-[#4a5578] mb-8 leading-relaxed text-base">
              KENUX is KENUXA&apos;s utility currency — not cryptocurrency, not speculation. It powers subscriptions, AI access, premium tools, sponsored listings, and platform rewards.
            </p>
            <div className="bg-[#0b0e1a] border border-white/[0.07] rounded-xl p-4 mb-8">
              <p className="text-xs font-bold text-[#64748b] mb-2 uppercase tracking-wider">Exchange Rate</p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-[#FF8B5E]">10</p>
                  <p className="text-[10px] text-[#374151] mt-0.5">KENUX</p>
                </div>
                <div className="text-[#374151]">=</div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[#f1f5f9]">GH₵ 1</p>
                  <p className="text-[10px] text-[#374151] mt-0.5">Cedi</p>
                </div>
                <div className="ml-4 flex-1 text-xs text-[#374151] leading-relaxed border-l border-white/5 pl-4">
                  Fixed rate. Not speculative. Not crypto. Purely a platform utility.
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {[
                { label: "Subscriptions & tools",  color: "#FF8B5E" },
                { label: "Boost listings",          color: "#10b981" },
                { label: "AI credits & features",   color: "#8b5cf6" },
                { label: "Earn from activity",      color: "#f59e0b" },
                { label: "Marketplace rewards",     color: "#3b82f6" },
                { label: "Referral bonuses",        color: "#ec4899" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm text-[#64748b]">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
            <Link href="/register">
              <button className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-[0_6px_20px_rgba(255,101,36,0.35)]">
                Get 500 Free KENUX on Signup <ArrowRight size={14} />
              </button>
            </Link>
          </div>

          {/* Live wallet mockup */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-[rgba(255,101,36,0.1)] to-[rgba(139,92,246,0.05)] rounded-3xl blur-2xl" />
            <div className="relative bg-[#0b0e1a] border border-white/[0.08] rounded-3xl p-7 space-y-4">
              <div className="bg-gradient-to-br from-[#FF6524] via-[#FF8B5E] to-[#F59E0B] rounded-2xl p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(255,101,36,0.35)]">
                <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/[0.07] rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/[0.05] rounded-full" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
                        <Bolt size={12} className="text-white" fill="white" />
                      </div>
                      <span className="text-white/80 text-xs font-bold tracking-wide">KENUX WALLET</span>
                    </div>
                    <span className="text-white/60 text-[10px] bg-white/10 px-2 py-0.5 rounded-full">Bronze Tier</span>
                  </div>
                  <p className="text-white/70 text-xs font-medium mb-1">Total Balance</p>
                  <p className="text-white text-3xl font-black tracking-tight">1,850 KNX</p>
                  <p className="text-white/60 text-xs mt-1">≈ GH₵ 185.00</p>
                </div>
              </div>
              <div className="space-y-1">
                {[
                  { label: "Welcome bonus",       amount: "+500 KNX", color: "#10b981" },
                  { label: "Profile completed",   amount: "+200 KNX", color: "#10b981" },
                  { label: "First purchase",      amount: "+250 KNX", color: "#10b981" },
                  { label: "AI Copilot usage",    amount: "−100 KNX", color: "#f87171" },
                ].map((tx) => (
                  <div key={tx.label} className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0">
                    <p className="text-sm text-[#94a3b8]">{tx.label}</p>
                    <span className="text-sm font-bold" style={{ color: tx.color }}>{tx.amount}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {["Top Up", "Send", "Spend"].map((a) => (
                  <div key={a} className="py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-[#374151] text-center hover:border-white/[0.1] hover:text-[#64748b] transition-all cursor-pointer font-medium">{a}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PLATFORM FEATURES ───────────────────────────────── */}
      <section className="py-28 px-5 bg-[#080b17] border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#3b82f6] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#3b82f6]" />Platform Infrastructure<span className="w-4 h-px bg-[#3b82f6]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black mb-5">
              Built for the Real Economy.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#3b82f6] to-[#10b981]">Not the App Store.</span>
            </h2>
            <p className="text-[#4a5578] max-w-xl mx-auto text-base">Enterprise-grade infrastructure designed from the ground up for fast-growing markets.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PLATFORM_FEATURES.map(({ icon: Icon, title, desc, color, badge }) => (
              <div key={title} className="group relative p-7 rounded-2xl border border-white/[0.06] bg-[#0b0e1a] hover:border-white/[0.12] transition-all overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl rounded-full pointer-events-none" style={{ background: color, transform: "translate(40%, -40%)" }} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/[0.06]" style={{ background: `${color}15` }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-full border" style={{ color, background: `${color}10`, borderColor: `${color}20` }}>{badge}</span>
                  </div>
                  <h3 className="font-bold text-[#e2e8f0] mb-3 text-base">{title}</h3>
                  <p className="text-sm text-[#374151] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF NUMBERS ────────────────────────────── */}
      <section className="py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: totalBiz > 0   ? `${totalBiz.toLocaleString()}+`   : "12,400+",  label: "Registered Businesses", icon: Building2,  color: "#FF8B5E" },
              { value: totalUsers > 0 ? `${totalUsers.toLocaleString()}+` : "180,000+", label: "Active Users",           icon: Users,      color: "#3b82f6" },
              { value: "GH₵ 48M+",                                                       label: "Monthly GMV",            icon: TrendingUp, color: "#10b981" },
              { value: "54",                                                               label: "Countries Supported",    icon: Globe,      color: "#f59e0b" },
            ].map(({ value, label, icon: Icon, color }) => (
              <div key={label} className="p-7 rounded-2xl border border-white/[0.06] bg-[#0b0e1a] text-center group hover:border-white/[0.1] transition-all">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/[0.05]" style={{ background: `${color}12` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8B5E] to-[#F59E0B] mb-1.5">{value}</div>
                <div className="text-xs text-[#2d3450] font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ────────────────────────────────────── */}
      <section className="py-28 px-5 bg-[#080b17] border-y border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#8b5cf6] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#8b5cf6]" />Trusted by the Network<span className="w-4 h-px bg-[#8b5cf6]" />
            </div>
            <h2 className="text-4xl font-black mb-4">Real People. Real Results.</h2>
            <p className="text-[#4a5578]">From the businesses and individuals building on the network.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ quote, name, role, initials, color }) => (
              <div key={name} className="p-7 rounded-2xl border border-white/[0.07] bg-[#0b0e1a] relative overflow-hidden group hover:border-white/[0.12] transition-all">
                <div className="absolute top-0 left-0 w-full h-0.5 rounded-full opacity-60" style={{ background: `linear-gradient(to right, ${color}, transparent)` }} />
                <div className="flex mb-4 gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} size={12} className="text-[#F59E0B]" fill="#F59E0B" />)}
                </div>
                <MessageSquare size={20} className="mb-4 opacity-20" style={{ color }} />
                <p className="text-[#94a3b8] text-sm leading-relaxed mb-6 italic">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white border border-white/[0.06]" style={{ background: `${color}25` }}>{initials}</div>
                  <div>
                    <p className="text-sm font-semibold text-[#e2e8f0]">{name}</p>
                    <p className="text-xs text-[#374151]">{role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────────── */}
      <section id="pricing" className="py-28 px-5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-[#FF8B5E] uppercase tracking-[0.22em] mb-4">
              <span className="w-4 h-px bg-[#FF6524]" />Pricing<span className="w-4 h-px bg-[#FF6524]" />
            </div>
            <h2 className="text-4xl font-black mb-4">Start Free. Scale as You Grow.</h2>
            <p className="text-[#4a5578]">All plans include KENUXA ID, wallet, and KENUX rewards. Cancel anytime, no lock-in.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING.map((plan) => (
              <div key={plan.name} className={`relative rounded-3xl border p-8 transition-all ${
                plan.featured
                  ? "border-[rgba(255,101,36,0.35)] bg-[rgba(255,101,36,0.03)] shadow-[0_0_80px_rgba(255,101,36,0.1),inset_0_1px_0_rgba(255,255,255,0.05)]"
                  : "border-white/[0.07] bg-[#0b0e1a]"
              }`}>
                {plan.featured && <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,101,36,0.04)] to-transparent rounded-3xl pointer-events-none" />}
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white text-[10px] font-black px-5 py-1.5 rounded-full tracking-[0.1em] uppercase shadow-[0_4px_14px_rgba(255,101,36,0.4)]">
                    {plan.badge}
                  </div>
                )}
                <div className="relative">
                  <h3 className="text-lg font-bold text-[#f1f5f9] mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-black text-[#f1f5f9]">{plan.price}</span>
                    <span className="text-[#374151] text-sm font-medium">{plan.period}</span>
                  </div>
                  <p className="text-xs text-[#2d3450] mb-7">{plan.desc}</p>
                  <ul className="space-y-2.5 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-[#7a86a0]">
                        <CheckCircle size={13} className="text-[#10b981] flex-shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link href={plan.href}>
                    <button className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                      plan.featured
                        ? "bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white hover:opacity-90 shadow-[0_6px_20px_rgba(255,101,36,0.35)]"
                        : "border border-white/[0.1] text-[#7a86a0] hover:border-white/[0.2] hover:text-[#f1f5f9]"
                    }`}>{plan.cta}</button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COUNTRIES ───────────────────────────────────────── */}
      <section className="py-24 px-5 bg-[#080b17] border-y border-white/[0.05]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#f59e0b] uppercase tracking-[0.22em] mb-5">
            <span className="w-4 h-px bg-[#f59e0b]" />Global Reach<span className="w-4 h-px bg-[#f59e0b]" />
          </div>
          <h2 className="text-4xl font-black mb-4">
            Powering Economies<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f59e0b] to-[#FF8B5E]">Across 54 Countries</span>
          </h2>
          <p className="text-[#4a5578] max-w-xl mx-auto mb-12">Local payment rails, local currencies, and the operational reality of high-growth markets. Built for mass adoption.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {COUNTRIES.map((c) => (
              <span key={c} className="text-xs text-[#374151] bg-[#0b0e1a] border border-white/[0.06] px-3.5 py-1.5 rounded-full hover:border-white/[0.12] hover:text-[#64748b] transition-all font-medium">{c}</span>
            ))}
            <span className="text-xs text-[#FF8B5E] bg-[rgba(255,101,36,0.07)] border border-[rgba(255,101,36,0.15)] px-3.5 py-1.5 rounded-full font-semibold">+38 more countries</span>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────── */}
      <section className="py-32 px-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_50%_50%,rgba(255,101,36,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.008)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.008)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,black_0%,transparent_100%)] pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <div className="relative inline-block mb-10">
            <div className="w-24 h-24 rounded-[24px] bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-4xl shadow-[0_0_60px_rgba(255,101,36,0.55)]">K</div>
            <div className="absolute -inset-2 bg-gradient-to-br from-[#FF6524] to-[#F59E0B] rounded-[28px] blur-xl opacity-25 -z-10" />
          </div>
          <h2 className="text-5xl sm:text-6xl font-black mb-6 leading-tight">
            Your Economic<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] via-[#FF8B5E] to-[#F59E0B]">Identity Awaits</span>
          </h2>
          <p className="text-[#4a5578] text-lg mb-12 max-w-xl mx-auto leading-relaxed">
            Join {totalBiz > 0 ? `${totalBiz.toLocaleString()}+ businesses` : "thousands of businesses"} and {totalUsers > 0 ? `${totalUsers.toLocaleString()}+ users` : "hundreds of thousands of users"} already on the network. Free forever for individuals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <button className="flex items-center gap-2.5 px-10 py-4 rounded-2xl bg-gradient-to-r from-[#FF6524] to-[#F59E0B] text-white font-black text-base hover:opacity-90 transition-opacity shadow-[0_12px_40px_rgba(255,101,36,0.45)]">
                <Rocket size={17} /> Create Your Free Account
              </button>
            </Link>
            <Link href="/login">
              <button className="flex items-center gap-2.5 px-10 py-4 rounded-2xl border border-white/[0.1] text-[#7a86a0] font-semibold text-base hover:border-white/[0.2] hover:text-[#f1f5f9] transition-all">
                Sign In <ArrowRight size={15} />
              </button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-[#2d3450]">No credit card · Instant access · 500 KENUX welcome bonus</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-16 px-5 bg-[#060810]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-14">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-sm shadow-[0_0_16px_rgba(255,101,36,0.35)]">K</div>
                <span className="font-black text-[#f1f5f9]">KENUXA</span>
              </div>
              <p className="text-xs text-[#2d3450] leading-relaxed max-w-[180px]">The economic operating system connecting markets and people.</p>
              <div className="flex gap-2 mt-4">
                {["🇬🇭", "🇳🇬", "🇰🇪", "🇿🇦"].map((flag) => <span key={flag} className="text-lg">{flag}</span>)}
                <span className="text-xs text-[#2d3450] flex items-center">+50</span>
              </div>
            </div>
            {[
              {
                title: "Discover",
                links: [["Businesses", "/find"], ["Marketplace", "/dashboard/marketplace"], ["Jobs", "/dashboard/jobs"], ["Services", "/dashboard/services"], ["Freelancers", "/dashboard/freelancers"]],
              },
              {
                title: "Platform",
                links: [["Dashboard", "/dashboard"], ["KENUX Wallet", "/dashboard/wallet"], ["AI Assistant", "/dashboard/ai"], ["Economic Graph", "/dashboard/economic-graph"], ["Credit Score", "/dashboard/credit"]],
              },
              {
                title: "Company",
                links: [["About", "/about"], ["Pricing", "#pricing"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["Contact", "/contact"]],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-[10px] font-bold text-[#f1f5f9] uppercase tracking-[0.18em] mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={label}><Link href={href ?? "/"} className="text-sm text-[#2d3450] hover:text-[#4a5578] transition-colors">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-[#2d3450]">© 2026 KENUXA Technologies Ltd. · Accra, Ghana · The Economic Network</span>
            <div className="flex items-center gap-5 text-xs text-[#2d3450]">
              <Link href="/privacy" className="hover:text-[#374151] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#374151] transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-[#374151] transition-colors">Contact</Link>
              <span className="text-[#1a1f2e]">Built for tomorrow&apos;s builders</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
