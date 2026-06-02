"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Flame, TrendingUp, ShoppingBag, Briefcase, Building2,
  Star, ArrowUpRight, Eye, BarChart2,
} from "lucide-react";

interface TrendingBusiness {
  id: string;
  name: string;
  category: string | null;
  total_reviews: number | null;
  avg_rating: number | null;
}

interface TrendingProduct {
  id: string;
  name: string;
  price: number;
  category: string | null;
}

interface TrendingJob {
  id: string;
  title: string;
  business_name: string | null;
  location: string | null;
  job_type: string | null;
  created_at: string;
}

export default function TrendingPage() {
  const supabase = createClient();
  const [businesses, setBusinesses] = useState<TrendingBusiness[]>([]);
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [jobs, setJobs] = useState<TrendingJob[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [bizRes, prodRes, jobRes] = await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, category, total_reviews, avg_rating")
        .eq("status", "active")
        .order("total_reviews", { ascending: false })
        .limit(6),
      supabase
        .from("products")
        .select("id, name, price, category")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("job_listings")
        .select("id, title, business_name, location, job_type, created_at")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    setBusinesses((bizRes.data as TrendingBusiness[]) ?? []);
    setProducts((prodRes.data as TrendingProduct[]) ?? []);
    setJobs((jobRes.data as TrendingJob[]) ?? []);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      <Header
        title="Trending"
        subtitle="What's hot on KENUXA right now"
        actions={<Link href="/dashboard/discover"><Button size="sm" variant="secondary"><Eye size={13} /> Explore All</Button></Link>}
      />

      <div className="p-6 space-y-6">
        {/* Hero banner */}
        <div className="relative rounded-2xl overflow-hidden border border-[rgba(239,68,68,0.2)] bg-gradient-to-r from-[rgba(239,68,68,0.08)] via-[rgba(255,101,36,0.06)] to-transparent p-6">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-[#f87171]" />
            <span className="text-sm font-bold text-[#f87171] uppercase tracking-wider">Trending Now</span>
          </div>
          <p className="text-[#94a3b8] text-sm max-w-md">Discover what businesses, products, and opportunities are gaining momentum across Ghana today.</p>
          <TrendingUp size={80} className="absolute right-6 top-1/2 -translate-y-1/2 text-[#f87171] opacity-8" />
        </div>

        {/* Trending Businesses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#f1f5f9] flex items-center gap-2">
              <Building2 size={14} className="text-[#FF8B5E]" /> Trending Businesses
            </h3>
            <Link href="/dashboard/directory"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">View all →</Button></Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-[#111624] rounded-xl animate-pulse" />)}
            </div>
          ) : businesses.length === 0 ? (
            <div className="bg-[#0d0f1a] border border-white/7 rounded-xl p-8 text-center">
              <p className="text-sm text-[#64748b]">No trending businesses yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {businesses.map((b, idx) => (
                <Link key={b.id} href={`/dashboard/directory?id=${b.id}`}>
                  <div className="p-4 bg-[#0d0f1a] border border-white/7 hover:border-[rgba(255,101,36,0.3)] rounded-xl transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl font-black text-[#1a1f35]">#{idx + 1}</span>
                      {b.avg_rating && (
                        <div className="flex items-center gap-1">
                          <Star size={10} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="text-xs text-[#94a3b8]">{b.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-[#f1f5f9] group-hover:text-[#FF8B5E] transition-colors truncate">{b.name}</p>
                    <p className="text-xs text-[#64748b] truncate mt-0.5">{b.category ?? "Business"}</p>
                    {b.total_reviews !== null && (
                      <p className="text-xs text-[#374151] mt-1.5">{b.total_reviews} reviews</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trending Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2"><ShoppingBag size={14} className="text-[#3B82F6]" /> Hot Products</CardTitle>
              <Link href="/dashboard/marketplace"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">Shop →</Button></Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 m-3 bg-white/3 rounded-lg animate-pulse" />)
              ) : products.length === 0 ? (
                <p className="text-sm text-[#64748b] py-6 text-center px-5">No trending products yet.</p>
              ) : (
                products.slice(0, 6).map((p, idx) => (
                  <Link key={p.id} href="/dashboard/marketplace">
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-white/2 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-[#374151] w-4 flex-shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f1f5f9] truncate">{p.name}</p>
                          <p className="text-xs text-[#64748b]">{p.category ?? "Product"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-sm font-bold text-[#FF8B5E]">{formatCurrency(p.price)}</span>
                        <ArrowUpRight size={12} className="text-[#374151]" />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Trending Jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2"><Briefcase size={14} className="text-[#10b981]" /> In-Demand Jobs</CardTitle>
              <Link href="/dashboard/jobs"><Button variant="ghost" size="sm" className="text-xs text-[#64748b]">Browse →</Button></Link>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 m-3 bg-white/3 rounded-lg animate-pulse" />)
              ) : jobs.length === 0 ? (
                <p className="text-sm text-[#64748b] py-6 text-center px-5">No trending jobs yet.</p>
              ) : (
                jobs.map((j, idx) => (
                  <Link key={j.id} href="/dashboard/jobs">
                    <div className="flex items-start justify-between px-5 py-3 hover:bg-white/2 transition-colors gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-[#374151] w-4 flex-shrink-0">{idx + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#f1f5f9] truncate">{j.title}</p>
                          <p className="text-xs text-[#64748b] truncate">{j.business_name ?? "Business"}{j.location ? ` · ${j.location}` : ""}</p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-[9px] flex-shrink-0">{j.job_type ?? "Full-time"}</Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Ghana insight */}
        <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 size={14} className="text-[#FF8B5E]" />
            <h3 className="text-sm font-semibold text-[#f1f5f9]">Ghana Economy Pulse</h3>
            <Badge variant="amber" className="text-[9px]">LIVE</Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Top Sector",     value: "Retail",    trend: "+12%"  },
              { label: "Fastest Growing",value: "Tech",      trend: "+28%"  },
              { label: "Most Jobs",      value: "Transport", trend: "+9%"   },
              { label: "Top Region",     value: "Greater Accra", trend: "+15%" },
            ].map((item) => (
              <div key={item.label} className="p-3 bg-[#07080f] rounded-xl border border-white/5">
                <p className="text-xs text-[#64748b]">{item.label}</p>
                <p className="text-sm font-semibold text-[#f1f5f9] mt-1">{item.value}</p>
                <p className="text-xs text-[#10b981] font-medium">{item.trend}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
