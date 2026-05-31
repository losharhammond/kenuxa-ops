"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import Link from "next/link";
import {
  Search, MapPin, TrendingUp, ChevronRight, ShoppingBag, Wrench,
  Briefcase, Factory, UtensilsCrossed, Pill, Stethoscope, GraduationCap,
  BedDouble, Sprout, Building2, X, Compass, Flame, ArrowRight,
  Package, Globe, Sparkles, Filter,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Business {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  city: string | null;
  logo_url: string | null;
  banner_url: string | null;
  is_verified: boolean;
  created_at: string;
}

interface JobListing {
  id: string;
  title: string;
  business_name: string | null;
  location: string | null;
  job_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  created_at: string;
}

interface FreelancerListing {
  id: string;
  title: string;
  category: string;
  price: number;
  user_id: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  business_id: string;
  image_url: string | null;
  category: string | null;
}

type DiscoverTab = "all" | "businesses" | "jobs" | "freelancers" | "products";

// ─── Constants ────────────────────────────────────────────────────────────────
const DISCOVERY_CATEGORIES = [
  { label: "Restaurants",  icon: UtensilsCrossed, query: "restaurant", color: "text-orange-400", bg: "bg-orange-400/10" },
  { label: "Pharmacies",   icon: Pill,            query: "pharmacy",   color: "text-green-400",  bg: "bg-green-400/10" },
  { label: "Jobs",         icon: Briefcase,       query: "engineer",   color: "text-blue-400",   bg: "bg-blue-400/10" },
  { label: "Freelancers",  icon: Sparkles,        query: "design",     color: "text-purple-400", bg: "bg-purple-400/10" },
  { label: "Suppliers",    icon: Factory,         query: "wholesale",  color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { label: "Clinics",      icon: Stethoscope,     query: "clinic",     color: "text-red-400",    bg: "bg-red-400/10" },
  { label: "Schools",      icon: GraduationCap,   query: "school",     color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { label: "Hotels",       icon: BedDouble,       query: "hotel",      color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  { label: "Farms",        icon: Sprout,          query: "farm",       color: "text-lime-400",   bg: "bg-lime-400/10" },
  { label: "Retailers",    icon: ShoppingBag,     query: "retail",     color: "text-pink-400",   bg: "bg-pink-400/10" },
  { label: "Services",     icon: Wrench,          query: "service",    color: "text-amber-400",  bg: "bg-amber-400/10" },
  { label: "Logistics",    icon: Package,         query: "logistics",  color: "text-sky-400",    bg: "bg-sky-400/10" },
];

const EXAMPLE_SEARCHES = [
  "Electrician near me", "Restaurant in Accra", "Graphic designer",
  "Rice wholesaler", "Pharmacy open now", "Software developer",
  "Catering service", "Hotel in Kumasi", "Digital marketing", "Plumber",
];

const TRENDING = ["Web developer", "Caterer", "Accountant", "Electrician", "Driver", "Photographer"];

// ─── BusinessCard ──────────────────────────────────────────────────────────────
function BusinessCard({ biz }: { biz: Business }) {
  const initials = biz.name.slice(0, 2).toUpperCase();
  const catMatch = DISCOVERY_CATEGORIES.find((c) => biz.category?.toLowerCase().includes(c.query));
  return (
    <Link href={`/find?q=${encodeURIComponent(biz.name)}`}>
      <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden hover:border-white/20 hover:bg-white/5 transition-all group cursor-pointer">
        <div className="h-20 bg-gradient-to-br from-[#FF6524]/15 via-purple-500/8 to-blue-500/8 relative flex items-center justify-center">
          {biz.logo_url
            ? <img src={biz.logo_url} alt={biz.name} className="w-12 h-12 rounded-xl object-cover border-2 border-white/20 relative z-10" />
            : <div className="w-12 h-12 rounded-xl bg-[#FF6524]/20 border border-[#FF6524]/30 flex items-center justify-center text-[#FF8B5E] font-bold text-sm relative z-10">{initials}</div>
          }
          {biz.is_verified && (
            <div className="absolute top-2 right-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-1.5 py-0.5 flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span className="text-[9px] text-blue-400 font-medium">Verified</span>
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="text-white font-medium text-sm truncate group-hover:text-[#FF8B5E] transition-colors">{biz.name}</p>
          {biz.category && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${catMatch?.bg ?? "bg-white/5"} ${catMatch?.color ?? "text-white/40"}`}>
              {biz.category}
            </span>
          )}
          {biz.city && (
            <div className="flex items-center gap-1 mt-1.5 text-xs text-white/30">
              <MapPin size={10} /> {biz.city}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── JobCard ──────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: JobListing }) {
  return (
    <Link href="/dashboard/jobs">
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/20 hover:bg-white/5 transition-all group">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate group-hover:text-[#FF8B5E] transition-colors">{job.title}</p>
            <p className="text-xs text-white/40 mt-0.5">{job.business_name ?? "Company"}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {job.location && <span className="text-[10px] text-white/30 flex items-center gap-0.5"><MapPin size={9} />{job.location}</span>}
              {job.job_type && <span className="text-[10px] bg-blue-400/10 text-blue-400 px-1.5 py-0.5 rounded-full capitalize">{job.job_type}</span>}
            </div>
          </div>
          {job.salary_min && (
            <div className="text-right ml-2 flex-shrink-0">
              <p className="text-xs text-[#FF6524] font-medium">GHS {job.salary_min.toLocaleString()}{job.salary_max ? `–${job.salary_max.toLocaleString()}` : "+"}</p>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [tab, setTab] = useState<DiscoverTab>("all");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [freelancers, setFreelancers] = useState<FreelancerListing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [rotating, setRotating] = useState(0);

  // Featured (shown when no search)
  const [featured, setFeatured] = useState<Business[]>([]);
  const [featuredJobs, setFeaturedJobs] = useState<JobListing[]>([]);

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => setRotating((r) => (r + 1) % EXAMPLE_SEARCHES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Debounce query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  // Search
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setHasSearched(false);
      setBusinesses([]); setJobs([]); setFreelancers([]); setProducts([]);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    const t = `%${q}%`;
    const [bR, jR, fR, pR] = await Promise.all([
      supabase.from("businesses").select("id,name,category,description,city,logo_url,banner_url,is_verified,created_at")
        .or(`name.ilike.${t},category.ilike.${t},city.ilike.${t}`).eq("is_active", true).limit(12),
      supabase.from("job_listings").select("id,title,business_name,location,job_type,salary_min,salary_max,created_at")
        .or(`title.ilike.${t},business_name.ilike.${t},location.ilike.${t}`).eq("status", "open").limit(8),
      supabase.from("freelancer_listings").select("id,title,category,price,user_id,created_at")
        .or(`title.ilike.${t},category.ilike.${t}`).limit(8),
      supabase.from("inventory_items").select("id,name,description,price,business_id,image_url,category")
        .or(`name.ilike.${t},category.ilike.${t}`).limit(8),
    ]);
    setBusinesses((bR.data ?? []) as Business[]);
    setJobs((jR.data ?? []) as JobListing[]);
    setFreelancers((fR.data ?? []) as FreelancerListing[]);
    setProducts((pR.data ?? []) as Product[]);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { search(debounced); }, [debounced, search]);

  // Load featured on mount
  useEffect(() => {
    async function load() {
      const [bR, jR] = await Promise.all([
        supabase.from("businesses").select("id,name,category,description,city,logo_url,banner_url,is_verified,created_at")
          .eq("is_active", true).order("created_at", { ascending: false }).limit(8),
        supabase.from("job_listings").select("id,title,business_name,location,job_type,salary_min,salary_max,created_at")
          .eq("status", "open").order("created_at", { ascending: false }).limit(6),
      ]);
      setFeatured((bR.data ?? []) as Business[]);
      setFeaturedJobs((jR.data ?? []) as JobListing[]);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = businesses.length + jobs.length + freelancers.length + products.length;
  const tabs: { key: DiscoverTab; label: string; count: number }[] = [
    { key: "all",         label: "All",        count: total },
    { key: "businesses",  label: "Businesses", count: businesses.length },
    { key: "jobs",        label: "Jobs",       count: jobs.length },
    { key: "freelancers", label: "Freelancers",count: freelancers.length },
    { key: "products",    label: "Products",   count: products.length },
  ];

  return (
    <div className="min-h-screen">
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#0d0f1a] via-[#10132a]/50 to-[#0d0f1a] border-b border-white/7 px-6 py-10">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-[#FF6524]/5 blur-3xl" />
          <div className="absolute -bottom-10 left-1/4 w-64 h-64 rounded-full bg-purple-500/5 blur-3xl" />
        </div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Compass size={16} className="text-[#FF6524]" />
            <span className="text-[11px] font-semibold text-[#FF6524] uppercase tracking-widest">KENUXA Discovery Engine</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Find anything across<br />
            <span className="bg-gradient-to-r from-[#FF6524] to-[#FF8B5E] bg-clip-text text-transparent">
              The KENUXA Network
            </span>
          </h1>
          <p className="text-white/40 text-sm mb-6">Businesses · Products · Jobs · Freelancers · Services · Suppliers</p>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 z-10" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Try "${EXAMPLE_SEARCHES[rotating]}"`}
              className="w-full bg-white/8 border border-white/15 rounded-2xl pl-11 pr-12 py-4 text-white placeholder-white/25 text-sm focus:outline-none focus:border-[#FF6524]/60 focus:bg-white/10 transition-all"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Trending tags */}
          {!hasSearched && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              <span className="flex items-center gap-1 text-xs text-white/30">
                <Flame size={11} className="text-[#FF6524]" /> Trending:
              </span>
              {TRENDING.map((t) => (
                <button key={t} onClick={() => setQuery(t)}
                  className="text-xs bg-white/5 hover:bg-[#FF6524]/10 border border-white/8 hover:border-[#FF6524]/30 text-white/50 hover:text-[#FF8B5E] px-2.5 py-1 rounded-full transition-all">
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-7xl mx-auto">
        {/* ── CATEGORY PILLS ─────────────────────────────────────────────────── */}
        {!hasSearched && (
          <div>
            <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4">Browse by Category</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3">
              {DISCOVERY_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button key={cat.label} onClick={() => setQuery(cat.query)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/6 transition-all group text-center">
                    <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon size={15} className={cat.color} />
                    </div>
                    <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors leading-tight">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SEARCH RESULTS ─────────────────────────────────────────────────── */}
        {hasSearched && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {loading ? "Searching the network…" : `${total} result${total !== 1 ? "s" : ""} for "${debounced}"`}
                </p>
                {!loading && total > 0 && (
                  <p className="text-xs text-white/40 mt-0.5">
                    {businesses.length} businesses · {jobs.length} jobs · {freelancers.length} freelancers · {products.length} products
                  </p>
                )}
              </div>
              <button onClick={() => { setQuery(""); }} className="text-xs text-white/30 hover:text-white/70 flex items-center gap-1">
                <X size={12} /> Clear search
              </button>
            </div>

            {total > 0 && (
              <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit flex-wrap">
                {tabs.filter((t) => t.key === "all" || t.count > 0).map((t) => (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all flex items-center gap-1.5 ${
                      tab === t.key ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
                    }`}>
                    {t.label}
                    {t.count > 0 && <span className={`text-[9px] px-1 py-0.5 rounded-full ${tab === t.key ? "bg-white/20" : "bg-white/10 text-white/40"}`}>{t.count}</span>}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}
              </div>
            ) : total === 0 ? (
              <div className="text-center py-16 border border-white/8 rounded-2xl">
                <Search size={48} className="mx-auto mb-4 text-white/10" />
                <p className="text-white/40 font-medium">No results found for &quot;{debounced}&quot;</p>
                <p className="text-white/20 text-sm mt-1">Try a different search or browse categories above</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Businesses */}
                {(tab === "all" || tab === "businesses") && businesses.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Building2 size={14} className="text-[#FF6524]" /> Businesses
                        <span className="text-xs text-white/30 font-normal">{businesses.length}</span>
                      </h3>
                      <Link href="/dashboard/directory" className="text-xs text-[#FF6524] flex items-center gap-1">View all <ChevronRight size={12} /></Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {businesses.slice(0, tab === "all" ? 4 : 12).map((b) => <BusinessCard key={b.id} biz={b} />)}
                    </div>
                  </section>
                )}

                {/* Jobs */}
                {(tab === "all" || tab === "jobs") && jobs.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Briefcase size={14} className="text-blue-400" /> Jobs
                        <span className="text-xs text-white/30 font-normal">{jobs.length}</span>
                      </h3>
                      <Link href="/dashboard/jobs" className="text-xs text-[#FF6524] flex items-center gap-1">View all <ChevronRight size={12} /></Link>
                    </div>
                    <div className="space-y-2">
                      {jobs.slice(0, tab === "all" ? 4 : 8).map((j) => <JobCard key={j.id} job={j} />)}
                    </div>
                  </section>
                )}

                {/* Freelancers */}
                {(tab === "all" || tab === "freelancers") && freelancers.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Sparkles size={14} className="text-purple-400" /> Freelancers
                      </h3>
                      <Link href="/dashboard/freelancers" className="text-xs text-[#FF6524] flex items-center gap-1">View all <ChevronRight size={12} /></Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {freelancers.slice(0, tab === "all" ? 4 : 8).map((f) => (
                        <Link key={f.id} href="/dashboard/freelancers">
                          <div className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/20 transition-all">
                            <p className="text-white font-medium text-sm">{f.title}</p>
                            <p className="text-xs text-white/40 mt-0.5">{f.category}</p>
                            <p className="text-sm text-[#FF6524] font-medium mt-2">GHS {f.price.toLocaleString()}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Products */}
                {(tab === "all" || tab === "products") && products.length > 0 && (
                  <section>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Package size={14} className="text-green-400" /> Products
                      </h3>
                      <Link href="/dashboard/marketplace" className="text-xs text-[#FF6524] flex items-center gap-1">View all <ChevronRight size={12} /></Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {products.slice(0, tab === "all" ? 4 : 8).map((p) => (
                        <Link key={p.id} href="/dashboard/marketplace">
                          <div className="bg-white/3 border border-white/8 rounded-xl overflow-hidden hover:border-white/20 transition-all group">
                            <div className="h-28 bg-white/3 flex items-center justify-center">
                              {p.image_url
                                ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                                : <Package size={24} className="text-white/15" />}
                            </div>
                            <div className="p-3">
                              <p className="text-white text-xs font-medium truncate group-hover:text-[#FF8B5E] transition-colors">{p.name}</p>
                              <p className="text-[#FF6524] text-sm font-bold mt-1">GHS {p.price.toLocaleString()}</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── FEATURED (no search active) ─────────────────────────────────────── */}
        {!hasSearched && (
          <div className="space-y-8">
            {/* Featured businesses */}
            {featured.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <TrendingUp size={15} className="text-[#FF6524]" /> Featured Businesses
                  </h2>
                  <Link href="/dashboard/directory" className="text-xs text-[#FF6524] flex items-center gap-1">View directory <ArrowRight size={12} /></Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {featured.map((b) => <BusinessCard key={b.id} biz={b} />)}
                </div>
              </section>
            )}

            {/* Open jobs */}
            {featuredJobs.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Briefcase size={15} className="text-blue-400" /> Latest Opportunities
                  </h2>
                  <Link href="/dashboard/jobs" className="text-xs text-[#FF6524] flex items-center gap-1">All jobs <ArrowRight size={12} /></Link>
                </div>
                <div className="space-y-2">
                  {featuredJobs.map((j) => <JobCard key={j.id} job={j} />)}
                </div>
              </section>
            )}

            {/* Network stats */}
            <section className="bg-gradient-to-br from-[#FF6524]/8 to-purple-500/5 border border-[#FF6524]/15 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-[#FF6524]" />
                <h2 className="text-sm font-semibold text-white">KENUXA Economic Network</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[
                  { label: "Businesses",  value: `${featured.length}+`,      icon: Building2, color: "text-[#FF6524]" },
                  { label: "Live Jobs",   value: `${featuredJobs.length}+`,   icon: Briefcase, color: "text-blue-400" },
                  { label: "Categories", value: `${DISCOVERY_CATEGORIES.length}`, icon: Filter, color: "text-purple-400" },
                  { label: "Countries",  value: "54",                         icon: Globe,     color: "text-green-400" },
                ].map((s) => (
                  <div key={s.label}>
                    <s.icon size={18} className={`mx-auto mb-1 ${s.color}`} />
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick links */}
            <section>
              <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest mb-4">Explore Markets</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { href: "/dashboard/marketplace", label: "Product Market",   sub: "Buy & sell products",    Icon: Package,   color: "text-green-400",  bg: "bg-green-400/10" },
                  { href: "/dashboard/services",    label: "Service Market",   sub: "Book professionals",     Icon: Wrench,    color: "text-orange-400", bg: "bg-orange-400/10" },
                  { href: "/dashboard/freelancers", label: "Freelancers",      sub: "Hire creative talent",   Icon: Sparkles,  color: "text-purple-400", bg: "bg-purple-400/10" },
                  { href: "/dashboard/suppliers",   label: "Supplier Network", sub: "B2B procurement",        Icon: Factory,   color: "text-yellow-400", bg: "bg-yellow-400/10" },
                ].map(({ href, label, sub, Icon, color, bg }) => (
                  <Link key={href} href={href}>
                    <div className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/20 hover:bg-white/5 transition-all group">
                      <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform`}>
                        <Icon size={16} className={color} />
                      </div>
                      <p className="text-white text-sm font-medium">{label}</p>
                      <p className="text-xs text-white/40 mt-0.5">{sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
