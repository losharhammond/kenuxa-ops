import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart, UtensilsCrossed, Pill, Briefcase, Laptop, HardHat,
  Truck, Wheat, Landmark, Sparkles, Building2, GraduationCap,
  CheckCircle2, Star, MapPin, Rocket,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "./SearchBar";

export const metadata: Metadata = {
  title: "Business Directory — Find Any Business in Ghana",
  description: "Search Ghana's largest business directory. Find retailers, pharmacies, restaurants, professionals, and more near you.",
  keywords: ["Ghana business directory", "find businesses Ghana", "local business search", "Accra directory"],
  openGraph: {
    title: "KENUXA Business Directory — Ghana",
    description: "Ghana's largest searchable business network.",
  },
};

const CATEGORIES = [
  { name: "Retail & Shops",         slug: "retail",        Icon: ShoppingCart },
  { name: "Food & Restaurants",     slug: "food",          Icon: UtensilsCrossed },
  { name: "Health & Pharmacy",      slug: "health",        Icon: Pill },
  { name: "Professional Services",  slug: "professional",  Icon: Briefcase },
  { name: "Technology",             slug: "technology",    Icon: Laptop },
  { name: "Construction",           slug: "construction",  Icon: HardHat },
  { name: "Transport & Logistics",  slug: "transport",     Icon: Truck },
  { name: "Agriculture",            slug: "agriculture",   Icon: Wheat },
  { name: "Finance & Insurance",    slug: "finance",       Icon: Landmark },
  { name: "Beauty & Wellness",      slug: "beauty",        Icon: Sparkles },
  { name: "Hospitality",            slug: "hospitality",   Icon: Building2 },
  { name: "Education",              slug: "education",     Icon: GraduationCap },
];

const CITIES = ["Accra", "Kumasi", "Takoradi", "Tamale", "Cape Coast", "Sunyani"];

interface FeaturedBusiness {
  id: string;
  name: string;
  business_type: string | null;
  city: string | null;
  avg_rating: number | null;
  is_verified: boolean | null;
  whatsapp: string | null;
}


export default async function DirectoryPage() {
  const supabase = await createClient();

  const [{ data: featured }, { data: allBizData }, { data: catData }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, business_type, city, avg_rating, is_verified, whatsapp")
      .eq("is_verified", true)
      .order("avg_rating", { ascending: false })
      .limit(6),
    supabase.from("businesses").select("city").not("city", "is", null),
    supabase.from("businesses").select("business_type").not("business_type", "is", null),
  ]);

  const cityCountMap: Record<string, number> = {};
  for (const row of allBizData ?? []) {
    if (row.city) cityCountMap[row.city] = (cityCountMap[row.city] ?? 0) + 1;
  }

  const catCountMap: Record<string, number> = {};
  for (const row of catData ?? []) {
    if (row.business_type) catCountMap[row.business_type] = (catCountMap[row.business_type] ?? 0) + 1;
  }

  const totalBusinesses = (allBizData ?? []).length;

  const featuredList: FeaturedBusiness[] = featured ?? [];

  return (
    <div className="min-h-screen bg-[#07080f]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[#07080f]/90 backdrop-blur-xl border-b border-white/7">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-sm">K</div>
            <span className="font-bold text-[#f1f5f9]">KENUXA</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[#64748b]">
            <Link href="/find" className="text-[#FF8B5E] font-medium">Directory</Link>
            <Link href="/" className="hover:text-[#f1f5f9]">Platform</Link>
            <Link href="/login" className="hover:text-[#f1f5f9]">Sign In</Link>
          </nav>
          <Link href="/register">
            <Button size="sm">List Your Business</Button>
          </Link>
        </div>
      </header>

      {/* Hero search */}
      <section className="relative py-20 px-4 grid-bg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(255,101,36,0.18)_0%,transparent_70%)]" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-black text-[#f1f5f9] mb-4 leading-tight">
            Find Any Business<br />
            <span className="gradient-text">Across Ghana</span>
          </h1>
          <p className="text-lg text-[#64748b] mb-8">
            Ghana&apos;s largest verified business directory
            {totalBusinesses > 0 && ` — ${totalBusinesses.toLocaleString()}+ businesses across 16 regions`}
          </p>
          <SearchBar />
        </div>
      </section>

      {/* Categories */}
      <section className="py-14 px-4 border-t border-white/7 bg-[#0d0f1a]">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-[#f1f5f9] mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CATEGORIES.map((cat) => {
              const count = catCountMap[cat.slug] ?? catCountMap[cat.name] ?? null;
              return (
                <Link key={cat.slug} href={`/dashboard/directory?category=${cat.slug}`}>
                  <div className="bg-[#111624] border border-white/7 hover:border-[rgba(255,101,36,0.3)] hover:bg-[rgba(255,101,36,0.04)] rounded-xl p-4 text-center transition-all group cursor-pointer">
                    <div className="flex justify-center mb-2 group-hover:scale-110 transition-transform">
                      <cat.Icon size={22} className="text-[#FF8B5E]" />
                    </div>
                    <p className="text-xs font-semibold text-[#f1f5f9] leading-tight mb-1">{cat.name}</p>
                    {count !== null && <p className="text-xs text-[#374151]">{count.toLocaleString()}</p>}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured businesses */}
      {featuredList.length > 0 && (
        <section className="py-14 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#f1f5f9]">Featured Businesses</h2>
              <Link href="/dashboard/directory" className="text-sm text-[#FF8B5E] hover:underline">View all</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredList.map((biz) => (
                <Link key={biz.id} href={`/dashboard/directory/${biz.id}`}>
                  <div className="bg-[#111624] border border-white/7 hover:border-white/20 rounded-xl p-5 transition-all cursor-pointer hover:bg-[#161b2e]">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[rgba(255,101,36,0.08)] flex items-center justify-center flex-shrink-0">
                        <Building2 size={22} className="text-[#FF8B5E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className="text-sm font-semibold text-[#f1f5f9] truncate">{biz.name}</h3>
                          {biz.is_verified && <CheckCircle2 size={13} className="text-[#34d399] flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-[#64748b]">
                          {biz.business_type ?? "Business"}
                          {biz.city && <> · <MapPin size={10} className="inline" /> {biz.city}</>}
                        </p>
                      </div>
                      {biz.avg_rating != null && (
                        <div className="text-right flex-shrink-0 flex items-center gap-1">
                          <Star size={13} className="text-[#F59E0B] fill-[#F59E0B]" />
                          <span className="text-sm font-bold text-[#f1f5f9]">{biz.avg_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="flex-1 text-center text-xs py-2 bg-[rgba(255,101,36,0.1)] text-[#FF8B5E] rounded-lg font-medium">View Profile</span>
                      {biz.whatsapp && (
                        <span className="flex-1 text-center text-xs py-2 bg-white/5 text-[#64748b] rounded-lg">WhatsApp</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Browse by city */}
      <section className="py-14 px-4 bg-[#0d0f1a] border-t border-white/7">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-xl font-bold text-[#f1f5f9] mb-6">Browse by City</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {CITIES.map((cityName) => {
              const count = cityCountMap[cityName] ?? 0;
              return (
                <Link key={cityName} href={`/dashboard/directory?city=${cityName}`}>
                  <div className="bg-[#111624] border border-white/7 hover:border-[rgba(255,101,36,0.3)] rounded-xl p-4 text-center transition-all cursor-pointer">
                    <p className="text-sm font-semibold text-[#f1f5f9] mb-1">{cityName}</p>
                    <p className="text-xs text-[#374151]">
                      {count > 0 ? `${count.toLocaleString()} businesses` : "businesses"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[#f1f5f9] mb-3">Is your business listed?</h2>
          <p className="text-[#64748b] mb-6">
            Join{totalBusinesses > 0 ? ` ${totalBusinesses.toLocaleString()}+` : ""} businesses on Ghana&apos;s largest business network. Free to list.
          </p>
          <Link href="/register">
            <Button size="xl" className="gap-2">
              <Rocket size={16} />
              List Your Business — Free
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/7 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[#374151]">
          <p>© 2026 KENUXA · Ghana&apos;s Business Network</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[#64748b]">Privacy</Link>
            <Link href="/terms"   className="hover:text-[#64748b]">Terms</Link>
            <Link href="/contact" className="hover:text-[#64748b]">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
