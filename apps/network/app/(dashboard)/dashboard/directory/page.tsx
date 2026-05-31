"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Globe, ShoppingCart, Utensils, Pill, Briefcase, Laptop, Hammer, Truck,
  Search, MapPin, Building2, CheckCircle2, Star, Phone, MessageCircle,
  SlidersHorizontal, X,
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  all:          Globe,
  retail:       ShoppingCart,
  food:         Utensils,
  health:       Pill,
  professional: Briefcase,
  technology:   Laptop,
  construction: Hammer,
  transport:    Truck,
};

const CATEGORY_SLUGS = [
  { name: "All",           slug: "all" },
  { name: "Retail",        slug: "retail" },
  { name: "Food & Dining", slug: "food" },
  { name: "Health",        slug: "health" },
  { name: "Professional",  slug: "professional" },
  { name: "Technology",    slug: "technology" },
  { name: "Construction",  slug: "construction" },
  { name: "Transport",     slug: "transport" },
];

interface Business {
  id: string;
  name: string;
  business_type: string | null;
  city: string | null;
  region: string | null;
  avg_rating: number | null;
  total_reviews: number | null;
  is_verified: boolean | null;
  description: string | null;
  tags: string[] | null;
  phone: string | null;
  whatsapp: string | null;
  logo_url: string | null;
}

function DirectoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const [query, setQuery]       = useState(searchParams.get("q") ?? "");
  const [city, setCity]         = useState(searchParams.get("city") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [sort, setSort]         = useState<"rating" | "newest" | "name">("rating");

  const load = useCallback(async () => {
    setLoading(true);

    let q = supabase
      .from("businesses")
      .select("id, name, business_type, city, region, avg_rating, total_reviews, is_verified, description, tags, phone, whatsapp, logo_url", { count: "exact" })
      .order(sort === "rating" ? "avg_rating" : sort === "newest" ? "created_at" : "name", { ascending: sort === "name" })
      .limit(30);

    if (query)              q = q.ilike("name", `%${query}%`);
    if (city)               q = q.ilike("city", `%${city}%`);
    if (category !== "all") q = q.ilike("business_type", `%${category}%`);

    const { data, count } = await q;
    setBusinesses((data as Business[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city, category, sort]);

  // Load category counts once
  useEffect(() => {
    async function loadCounts() {
      const { data } = await supabase.from("businesses").select("business_type");
      const map: Record<string, number> = { all: data?.length ?? 0 };
      for (const row of data ?? []) {
        const t = (row.business_type ?? "").toLowerCase();
        for (const cat of CATEGORY_SLUGS.slice(1)) {
          if (t.includes(cat.slug)) {
            map[cat.slug] = (map[cat.slug] ?? 0) + 1;
          }
        }
      }
      setCategoryCounts(map);
    }
    loadCounts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { load(); }, [load]);

  // Sync URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query)              params.set("q", query);
    if (city)               params.set("city", city);
    if (category !== "all") params.set("category", category);
    router.replace(`/dashboard/directory?${params.toString()}`, { scroll: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, city, category]);

  function clearFilters() {
    setQuery("");
    setCity("");
    setCategory("all");
  }

  const hasFilters = query || city || category !== "all";

  return (
    <div className="animate-fade-in">
      <Header title="Business Directory" subtitle="Ghana's largest business network" />

      <div className="p-6 space-y-6">
        {/* Search Hero */}
        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-gradient-to-r from-[rgba(255,101,36,0.12)] to-transparent p-8">
          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-1">Find Any Business in Ghana</h2>
          <p className="text-[#64748b] mb-6 text-sm">
            {total > 0 ? `${formatNumber(total)} businesses found` : "Search from verified businesses across 16 regions"}
          </p>
          <div className="flex gap-3 max-w-2xl flex-wrap sm:flex-nowrap">
            <div className="flex-1 flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-4 h-11 min-w-[180px]">
              <Search size={14} className="text-[#64748b] flex-shrink-0" />
              <input
                className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151] text-[#f1f5f9]"
                placeholder="Search businesses, services..."
                style={{ padding: 0 }}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
              {query && (
                <button onClick={() => setQuery("")} className="text-[#374151] hover:text-[#64748b]">
                  <X size={12} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-4 h-11 w-44">
              <MapPin size={14} className="text-[#64748b] flex-shrink-0" />
              <select
                className="bg-transparent border-none outline-none text-sm text-[#64748b] flex-1"
                style={{ padding: 0 }}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All Ghana</option>
                <option>Accra</option>
                <option>Kumasi</option>
                <option>Takoradi</option>
                <option>Tamale</option>
                <option>Cape Coast</option>
                <option>Sunyani</option>
              </select>
            </div>
            <Button onClick={load} className="h-11 px-6">
              <Search size={14} />
              Search
            </Button>
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_SLUGS.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.slug] ?? Globe;
            const count = categoryCounts[cat.slug];
            return (
              <button
                key={cat.slug}
                onClick={() => setCategory(cat.slug)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors flex-shrink-0
                  ${category === cat.slug
                    ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                    : "bg-[#111624] border-white/7 text-[#64748b] hover:text-[#f1f5f9] hover:border-white/20"
                  }`}
              >
                <Icon size={13} />
                <span>{cat.name}</span>
                {count != null && <span className="text-xs opacity-60">{formatNumber(count)}</span>}
              </button>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-[#64748b]">
              {loading
                ? "Searching..."
                : <><span className="text-[#f1f5f9] font-medium">{formatNumber(total)}</span> businesses</>}
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-[#64748b] hover:text-[#f87171] border border-white/7 px-2 py-1 rounded-full transition-colors"
              >
                <SlidersHorizontal size={10} />
                Clear filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748b]">Sort:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="bg-[#111624] border border-white/7 rounded-lg text-xs px-3 py-1.5 text-[#f1f5f9] outline-none"
            >
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
              <option value="name">Name A–Z</option>
            </select>
          </div>
        </div>

        {/* Business Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-5 space-y-3">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-white/5 rounded animate-pulse" />
                <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
              </Card>
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-20 border border-white/7 rounded-xl bg-[#0d0f1a]">
            <Building2 size={40} className="mx-auto mb-4 text-[#374151]" />
            <h3 className="text-base font-semibold text-[#64748b] mb-2">No businesses found</h3>
            <p className="text-sm text-[#374151] mb-4">Try adjusting your search or clearing the filters</p>
            {hasFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((biz) => (
              <Link key={biz.id} href={`/dashboard/directory/${biz.id}`}>
                <Card className="p-5 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[rgba(255,101,36,0.12)] overflow-hidden flex items-center justify-center flex-shrink-0">
                        {biz.logo_url ? (
                          <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 size={20} className="text-[#FF8B5E]" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-[#f1f5f9]">{biz.name}</h3>
                          {biz.is_verified && <CheckCircle2 size={12} className="text-[#34d399]" />}
                        </div>
                        <p className="text-xs text-[#64748b]">
                          {biz.business_type ?? "Business"}
                          {biz.city && <> · {biz.city}</>}
                        </p>
                      </div>
                    </div>
                    {biz.avg_rating != null && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-[#f1f5f9] flex items-center gap-1 justify-end">
                          <Star size={11} className="text-[#F59E0B] fill-[#F59E0B]" />
                          {biz.avg_rating.toFixed(1)}
                        </p>
                        {biz.total_reviews != null && (
                          <p className="text-xs text-[#64748b]">{biz.total_reviews} reviews</p>
                        )}
                      </div>
                    )}
                  </div>

                  {biz.description && (
                    <p className="text-xs text-[#64748b] mb-3 leading-relaxed line-clamp-2">{biz.description}</p>
                  )}

                  {Array.isArray(biz.tags) && biz.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {biz.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs bg-white/5 text-[#64748b] px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-white/7 flex items-center gap-2">
                    {biz.phone && (
                      <button
                        onClick={(e) => { e.preventDefault(); window.open(`tel:${biz.phone}`, "_self"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <Phone size={11} /> Call
                      </button>
                    )}
                    {biz.whatsapp && (
                      <button
                        onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/${(biz.whatsapp ?? "").replace(/\D/g, "")}`, "_blank"); }}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#64748b] hover:text-[#34d399] py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <MessageCircle size={11} /> WhatsApp
                      </button>
                    )}
                    <span className="flex-1 flex items-center justify-center gap-1.5 text-xs text-[#64748b] py-1.5 rounded-lg">
                      <MapPin size={11} />
                      {biz.city ?? "Ghana"}
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && businesses.length > 0 && businesses.length < total && (
          <div className="text-center pt-4">
            <Button variant="secondary" onClick={load}>Load More Businesses</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DirectoryPage() {
  return (
    <Suspense fallback={
      <div className="animate-fade-in">
        <Header title="Business Directory" subtitle="Ghana's largest business network" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <DirectoryContent />
    </Suspense>
  );
}
