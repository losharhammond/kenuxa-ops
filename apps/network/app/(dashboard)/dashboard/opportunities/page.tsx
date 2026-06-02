"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import {
  Briefcase, Wrench, Factory, ClipboardList,
  MapPin, Clock, ChevronRight, Loader2, Zap, Star,
  DollarSign, Package, Globe, Filter,
  ArrowUpRight, Target, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface JobOpp {
  id: string;
  title: string;
  business_name: string | null;
  location: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
}

interface FreelanceOpp {
  id: string;
  title: string;
  budget_min: number | null;
  budget_max: number | null;
  category: string | null;
  deadline: string | null;
  created_at: string;
}

interface RFQOpp {
  id: string;
  rfq_no: string;
  title: string;
  category: string | null;
  deadline: string | null;
  budget_max: number | null;
  created_at: string;
}

interface SupplyOpp {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  is_verified: boolean;
  created_at: string;
}

type OppTab = "all" | "jobs" | "freelance" | "rfq" | "supply";

const TAB_CONFIG: { key: OppTab; label: string; icon: React.ElementType; color: string }[] = [
  { key: "all",      label: "All",        icon: Globe,       color: "#FF8B5E" },
  { key: "jobs",     label: "Jobs",       icon: Briefcase,   color: "#3b82f6" },
  { key: "freelance",label: "Gigs",       icon: Wrench,      color: "#a78bfa" },
  { key: "rfq",      label: "RFQs",       icon: ClipboardList, color: "#f59e0b" },
  { key: "supply",   label: "Supply",     icon: Factory,     color: "#10b981" },
];

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "Just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

function salaryLabel(min: number | null, max: number | null) {
  if (!min && !max) return "Negotiable";
  if (min && max) return `GH₵ ${min.toLocaleString()} – ${max.toLocaleString()}`;
  if (min) return `GH₵ ${min.toLocaleString()}+`;
  return `Up to GH₵ ${max!.toLocaleString()}`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobOpp }) {
  return (
    <Link href="/dashboard/jobs">
      <div className="group p-4 rounded-xl bg-[#0d1117] border border-white/7 hover:border-[rgba(59,130,246,0.3)] hover:bg-[#0f1520] transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(59,130,246,0.1)] flex items-center justify-center flex-shrink-0">
            <Briefcase size={14} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-blue-300 transition-colors truncate">{job.title}</p>
              <ArrowUpRight size={13} className="text-[#2d3450] group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-xs text-[#64748b] truncate mt-0.5">{job.business_name ?? "Company"}</p>
            <div className="flex items-center gap-3 mt-2">
              {job.location && (
                <span className="flex items-center gap-1 text-[10px] text-[#374151]">
                  <MapPin size={9} /> {job.location}
                </span>
              )}
              {job.job_type && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(59,130,246,0.1)] text-blue-400">{job.job_type}</span>
              )}
              <span className="text-[10px] text-[#FF8B5E] font-medium ml-auto">{salaryLabel(job.salary_min, job.salary_max)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2.5 text-[9px] text-[#2d3450]">
          <Clock size={8} /> {timeAgo(job.created_at)}
        </div>
      </div>
    </Link>
  );
}

function FreelanceCard({ gig }: { gig: FreelanceOpp }) {
  return (
    <Link href="/dashboard/freelancers">
      <div className="group p-4 rounded-xl bg-[#0d1117] border border-white/7 hover:border-[rgba(167,139,250,0.3)] hover:bg-[#0f0f1a] transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(167,139,250,0.1)] flex items-center justify-center flex-shrink-0">
            <Wrench size={14} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-purple-300 transition-colors truncate">{gig.title}</p>
              <ArrowUpRight size={13} className="text-[#2d3450] group-hover:text-purple-400 transition-colors flex-shrink-0 mt-0.5" />
            </div>
            {gig.category && <p className="text-xs text-[#64748b] mt-0.5">{gig.category}</p>}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[10px] text-[#FF8B5E] font-medium">{salaryLabel(gig.budget_min, gig.budget_max)}</span>
              {gig.deadline && (
                <span className="flex items-center gap-1 text-[10px] text-[#374151]">
                  <Clock size={9} /> Due {new Date(gig.deadline).toLocaleDateString("en-GH")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2.5 text-[9px] text-[#2d3450]">
          <Clock size={8} /> {timeAgo(gig.created_at)}
        </div>
      </div>
    </Link>
  );
}

function RFQCard({ rfq }: { rfq: RFQOpp }) {
  return (
    <Link href="/dashboard/rfq">
      <div className="group p-4 rounded-xl bg-[#0d1117] border border-white/7 hover:border-[rgba(245,158,11,0.3)] hover:bg-[#0f0e10] transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(245,158,11,0.1)] flex items-center justify-center flex-shrink-0">
            <ClipboardList size={14} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-amber-300 transition-colors truncate">{rfq.title}</p>
              <ArrowUpRight size={13} className="text-[#2d3450] group-hover:text-amber-400 transition-colors flex-shrink-0 mt-0.5" />
            </div>
            <p className="text-[10px] text-[#374151] mt-0.5 font-mono">{rfq.rfq_no}</p>
            <div className="flex items-center gap-3 mt-2">
              {rfq.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(245,158,11,0.1)] text-amber-400">{rfq.category}</span>}
              {rfq.budget_max && <span className="text-[10px] text-[#FF8B5E] font-medium">Budget: GH₵ {rfq.budget_max.toLocaleString()}</span>}
              {rfq.deadline && (
                <span className="flex items-center gap-1 text-[10px] text-[#374151] ml-auto">
                  <Clock size={9} /> Closes {new Date(rfq.deadline).toLocaleDateString("en-GH")}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2.5 text-[9px] text-[#2d3450]">
          <Clock size={8} /> {timeAgo(rfq.created_at)}
        </div>
      </div>
    </Link>
  );
}

function SupplyCard({ biz }: { biz: SupplyOpp }) {
  return (
    <Link href="/dashboard/suppliers">
      <div className="group p-4 rounded-xl bg-[#0d1117] border border-white/7 hover:border-[rgba(16,185,129,0.3)] hover:bg-[#0a1210] transition-all cursor-pointer">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(16,185,129,0.1)] flex items-center justify-center flex-shrink-0">
            <Factory size={14} className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-emerald-300 transition-colors truncate">{biz.name}</p>
              {biz.is_verified && <Star size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {biz.category && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(16,185,129,0.1)] text-emerald-400">{biz.category}</span>}
              {biz.city && (
                <span className="flex items-center gap-1 text-[10px] text-[#374151]">
                  <MapPin size={9} /> {biz.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2.5 text-[9px] text-[#2d3450]">
          <Clock size={8} /> {timeAgo(biz.created_at)}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OpportunitiesPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [tab, setTab] = useState<OppTab>("all");
  const [jobs, setJobs] = useState<JobOpp[]>([]);
  const [gigs, setGigs] = useState<FreelanceOpp[]>([]);
  const [rfqs, setRFQs] = useState<RFQOpp[]>([]);
  const [supply, setSupply] = useState<SupplyOpp[]>([]);
  const [counts, setCounts] = useState({ jobs: 0, gigs: 0, rfqs: 0, supply: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);

    const [jobsRes, gigsRes, rfqsRes,] = await Promise.all([
      supabase.from("job_listings")
        .select("id,title,business_name,location,job_type,salary_min,salary_max,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("freelance_requests")
        .select("id,title,budget_min,budget_max,category,deadline,created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("rfqs")
        .select("id,rfq_no,title,category,deadline,budget_max,created_at")
        .eq("status", "sent")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("supplier_profiles")
        .select("id,name:user_id,category,city,is_verified,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const jobData = (jobsRes.data ?? []) as JobOpp[];
    const gigData = (gigsRes.data ?? []) as FreelanceOpp[];
    const rfqData = (rfqsRes.data ?? []) as RFQOpp[];

    // supplier_profiles may not have direct name — use businesses table instead
    const [bizSupplyRes] = await Promise.all([
      supabase.from("businesses")
        .select("id,name,category,city,is_verified,created_at")
        .eq("is_active", true)
        .order("is_verified", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    const supplyData = (bizSupplyRes.data ?? []) as SupplyOpp[];

    setJobs(jobData);
    setGigs(gigData);
    setRFQs(rfqData);
    setSupply(supplyData);
    setCounts({ jobs: jobData.length, gigs: gigData.length, rfqs: rfqData.length, supply: supplyData.length });
    setLoading(false);
    setRefreshing(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const totalCount = counts.jobs + counts.gigs + counts.rfqs + counts.supply;

  const renderCards = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-[#374151]" />
        </div>
      );
    }
    if (totalCount === 0) {
      return (
        <div className="text-center py-16">
          <Target size={32} className="mx-auto text-[#2d3450] mb-3" />
          <p className="text-sm text-[#374151]">No opportunities yet — check back soon</p>
        </div>
      );
    }

    const allCards: React.ReactNode[] = [];

    if (tab === "all" || tab === "jobs") {
      jobs.forEach((j) => allCards.push(<JobCard key={`j-${j.id}`} job={j} />));
    }
    if (tab === "all" || tab === "freelance") {
      gigs.forEach((g) => allCards.push(<FreelanceCard key={`g-${g.id}`} gig={g} />));
    }
    if (tab === "all" || tab === "rfq") {
      rfqs.forEach((r) => allCards.push(<RFQCard key={`r-${r.id}`} rfq={r} />));
    }
    if (tab === "all" || tab === "supply") {
      supply.forEach((s) => allCards.push(<SupplyCard key={`s-${s.id}`} biz={s} />));
    }

    if (allCards.length === 0) {
      return (
        <div className="text-center py-16">
          <Target size={32} className="mx-auto text-[#2d3450] mb-3" />
          <p className="text-sm text-[#374151]">No {tab} opportunities right now</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {allCards}
      </div>
    );
  };

  return (
    <>
      <Header
        title="Opportunities"
        subtitle="Jobs, gigs, RFQs & supply deals — all in one place"
        actions={
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5 transition-all"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      />

      <div className="p-6 space-y-5">

        {/* Network opportunity stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Open Jobs",    value: counts.jobs,   icon: Briefcase,    color: "#3b82f6",  bg: "rgba(59,130,246,0.08)",   href: "/dashboard/jobs" },
            { label: "Gig Requests", value: counts.gigs,   icon: Wrench,       color: "#a78bfa",  bg: "rgba(167,139,250,0.08)",  href: "/dashboard/freelancers" },
            { label: "Active RFQs",  value: counts.rfqs,   icon: ClipboardList,color: "#f59e0b",  bg: "rgba(245,158,11,0.08)",   href: "/dashboard/rfq" },
            { label: "Suppliers",    value: counts.supply, icon: Factory,      color: "#10b981",  bg: "rgba(16,185,129,0.08)",   href: "/dashboard/suppliers" },
          ].map(({ label, value, icon: Icon, color, bg, href }) => (
            <Link key={label} href={href}>
              <div className="p-4 rounded-xl border border-white/7 hover:border-white/15 transition-all cursor-pointer" style={{ background: bg }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={14} style={{ color }} />
                  <p className="text-[10px] text-[#64748b] uppercase tracking-wider font-semibold">{label}</p>
                </div>
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* AI match banner */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[rgba(139,92,246,0.06)] border border-[rgba(139,92,246,0.15)]">
          <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.15)] flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#f1f5f9]">AI Opportunity Matching</p>
            <p className="text-xs text-[#64748b]">
              {profile?.full_name
                ? `We're matching opportunities to your profile, ${profile.full_name.split(" ")[0]}.`
                : "Complete your profile to get AI-matched opportunities."}
            </p>
          </div>
          <Link href="/dashboard/ai">
            <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 flex-shrink-0 font-medium">
              Ask AI <ChevronRight size={11} />
            </button>
          </Link>
        </div>

        {/* Tab filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {TAB_CONFIG.map(({ key, label, icon: Icon, color }) => {
            const count = key === "all" ? totalCount
              : key === "jobs" ? counts.jobs
              : key === "freelance" ? counts.gigs
              : key === "rfq" ? counts.rfqs
              : counts.supply;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold flex-shrink-0 transition-all"
                style={tab === key ? { background: `${color}18`, color, border: `1px solid ${color}40` } : { background: "transparent", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <Icon size={11} />
                {label}
                {count > 0 && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ background: tab === key ? `${color}25` : "rgba(255,255,255,0.06)", color: tab === key ? color : "#374151" }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-[#374151] border border-white/7 hover:text-[#f1f5f9] transition-all ml-auto flex-shrink-0">
            <Filter size={10} /> Filter
          </button>
        </div>

        {/* Cards */}
        {renderCards()}

        {/* Quick links */}
        <div className="pt-2">
          <p className="text-[10px] font-semibold text-[#2d3450] uppercase tracking-widest mb-3">Explore More</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/dashboard/jobs",       label: "Browse All Jobs",        icon: Briefcase,   color: "#3b82f6" },
              { href: "/dashboard/freelancers", label: "Hire Freelancers",       icon: Wrench,      color: "#a78bfa" },
              { href: "/dashboard/rfq",         label: "Send an RFQ",            icon: ClipboardList, color: "#f59e0b" },
              { href: "/dashboard/marketplace", label: "Shop Products",          icon: Package,     color: "#10b981" },
              { href: "/dashboard/services",    label: "Book a Service",         icon: Target,      color: "#ec4899" },
              { href: "/dashboard/lending",     label: "Get Financing",          icon: DollarSign,  color: "#FF8B5E" },
            ].map(({ href, label, icon: Icon, color }) => (
              <Link key={href} href={href}>
                <div className="flex items-center gap-2.5 p-3 rounded-xl border border-white/7 hover:border-white/15 hover:bg-white/3 transition-all cursor-pointer group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
                    <Icon size={12} style={{ color }} />
                  </div>
                  <span className="text-xs font-medium text-[#64748b] group-hover:text-[#f1f5f9] transition-colors">{label}</span>
                  <ChevronRight size={10} className="text-[#2d3450] group-hover:text-[#64748b] ml-auto transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
