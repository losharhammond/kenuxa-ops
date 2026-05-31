"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  Wrench, CheckCircle2, ClipboardList, Star, Search, MapPin,
  MessageCircle, FileText, X, Send, Package,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ServiceListing {
  id: string;
  name: string;
  provider_name: string;
  category: string;
  price: number;
  price_type: string;
  description: string | null;
  location: string | null;
  turnaround: string | null;
  is_verified: boolean;
  avg_rating: number | null;
  total_jobs: number | null;
  image_url: string | null;
}

const priceLabel: Record<string, string> = {
  fixed: "Fixed price",
  hourly: "Per hour",
  quote: "Quote required",
};

const INPUT_CLS = "w-full bg-[#07080f] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)] transition-colors";
const TEXTAREA_CLS = "w-full bg-[#07080f] border border-white/7 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)] resize-none";

export default function ServicesPage() {
  const supabase = createClient();
  const [services, setServices] = useState<ServiceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [bookingService, setBookingService] = useState<ServiceListing | null>(null);
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [totalProviders, setTotalProviders] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("service_listings")
      .select("id, name, provider_name, category, price, price_type, description, location, turnaround, is_verified, avg_rating, total_jobs, image_url")
      .eq("status", "active")
      .order("avg_rating", { ascending: false })
      .limit(48);

    if (search) q = q.ilike("name", `%${search}%`);
    if (activeCategory !== "All") q = q.eq("category", activeCategory);
    if (location !== "all") q = q.ilike("location", `%${location}%`);

    const { data, count } = await q;
    const rows = (data as ServiceListing[]) ?? [];
    setServices(rows);
    setTotalProviders(count ?? rows.length);
    setTotalJobs(rows.reduce((s, r) => s + (r.total_jobs ?? 0), 0));
    setLoading(false);
  }, [search, activeCategory, location]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const categories = ["All", ...Array.from(new Set(services.map((s) => s.category).filter(Boolean)))];

  return (
    <div className="animate-fade-in">
      <Header
        title="Service Marketplace"
        subtitle="Find professionals, book services & request quotes"
        actions={<Button size="sm">+ List a Service</Button>}
      />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Service Providers" value={totalProviders} format="number" color="orange" icon={<Wrench size={16} />} />
          <StatCard title="Completed Jobs"    value={totalJobs}      format="number" color="green"  icon={<CheckCircle2 size={16} />} />
          <StatCard title="Categories"        value={categories.length - 1} format="number" color="blue" icon={<ClipboardList size={16} />} />
          <StatCard title="Avg Rating"        value={services.length ? (services.reduce((s, r) => s + (r.avg_rating ?? 0), 0) / services.length).toFixed(1) : "—"} color="amber" icon={<Star size={16} />} />
        </div>

        {/* Search */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-64 flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-4 h-11">
            <Search size={15} className="text-[#64748b]" />
            <input
              className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151] text-[#f1f5f9]"
              placeholder="Electrician, developer, lawyer..."
              style={{ padding: 0 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 bg-[#111624] border border-white/7 rounded-lg px-3 h-11">
            <MapPin size={14} className="text-[#64748b]" />
            <select
              className="bg-transparent border-none outline-none text-sm text-[#64748b]"
              style={{ padding: 0 }}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="all">All Ghana</option>
              <option value="Accra">Accra</option>
              <option value="Kumasi">Kumasi</option>
              <option value="Takoradi">Takoradi</option>
              <option value="Remote">Remote</option>
            </select>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
                activeCategory === cat
                  ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                  : "bg-[#111624] border-white/7 text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Booking request panel */}
        {bookingService && !bookingSubmitted && (
          <Card className="border-[rgba(255,101,36,0.3)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Request — {bookingService.name}</CardTitle>
                <button onClick={() => setBookingService(null)} className="p-2 hover:bg-white/5 rounded-lg">
                  <X size={14} className="text-[#64748b]" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 bg-[#0d0f1a] rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,101,36,0.1)] flex items-center justify-center">
                  <Wrench size={18} className="text-[#FF8B5E]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#f1f5f9]">{bookingService.provider_name}</p>
                  <p className="text-xs text-[#64748b]">{priceLabel[bookingService.price_type] ?? "Custom"} · From {formatCurrency(bookingService.price)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Your Name *</label>
                  <input placeholder="Full name" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Phone / WhatsApp *</label>
                  <input placeholder="+233 24 000 0000" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Preferred Date</label>
                  <input type="date" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Preferred Time</label>
                  <input type="time" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Location / Address</label>
                  <input placeholder="Where should they come?" className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Budget (GHS)</label>
                  <input type="number" placeholder="Your budget" className={INPUT_CLS} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-[#64748b] mb-1.5">Describe What You Need *</label>
                  <textarea rows={4} placeholder="Explain the work required in detail." className={TEXTAREA_CLS} />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setBookingService(null)}>Cancel</Button>
                <Button size="sm" onClick={() => setBookingSubmitted(true)}>
                  <Send size={13} /> Send Request
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Booking success */}
        {bookingSubmitted && (
          <Card className="border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.04)]">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[rgba(52,211,153,0.15)] flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={32} className="text-[#34d399]" />
              </div>
              <h3 className="text-lg font-bold text-[#f1f5f9] mb-1">Request Sent!</h3>
              <p className="text-sm text-[#64748b] mb-4">
                Your service request has been sent to <strong className="text-[#f1f5f9]">{bookingService?.provider_name}</strong>.
                They will contact you within 2–4 hours.
              </p>
              <Button size="sm" onClick={() => { setBookingSubmitted(false); setBookingService(null); }}>Send Another Request</Button>
            </CardContent>
          </Card>
        )}

        {/* Services Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-16 text-center">
            <Package size={36} className="text-[#374151] mx-auto mb-4" />
            <p className="text-[#f1f5f9] font-semibold mb-1">No services found</p>
            <p className="text-sm text-[#64748b]">
              {search ? "Try different search terms." : "Be the first to list a service."}
            </p>
            <Button size="sm" className="mt-4">+ List a Service</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <Card key={s.id} className="overflow-hidden hover:border-white/20 hover:bg-[#161b2e] transition-all flex flex-col">
                {s.image_url && (
                  <div className="h-36 overflow-hidden bg-[#0d0f1a]">
                    <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h3 className="text-sm font-semibold text-[#f1f5f9] truncate">{s.name}</h3>
                      {s.is_verified && <CheckCircle2 size={12} className="text-[#34d399] flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-[#64748b]">{s.provider_name}</p>
                    {s.location && (
                      <p className="text-xs text-[#64748b] flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />{s.location}
                      </p>
                    )}
                  </div>
                  <Badge variant="default" className="flex-shrink-0">{s.category}</Badge>
                </div>

                {s.description && (
                  <p className="text-xs text-[#94a3b8] mb-3 leading-relaxed line-clamp-2">{s.description}</p>
                )}

                <div className="flex items-center justify-between mb-3 mt-auto">
                  <div>
                    <span className="text-base font-bold text-[#FF8B5E]">{formatCurrency(s.price)}</span>
                    <span className="text-xs text-[#64748b] ml-1">{priceLabel[s.price_type] ?? ""}</span>
                  </div>
                  <div className="text-right">
                    {s.avg_rating && (
                      <p className="text-xs text-[#f1f5f9] flex items-center gap-1">
                        <Star size={10} className="text-[#F59E0B]" />
                        {s.avg_rating.toFixed(1)}
                      </p>
                    )}
                    {s.total_jobs != null && (
                      <p className="text-xs text-[#64748b]">{s.total_jobs} jobs done</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => { setBookingService(s); setBookingSubmitted(false); }}
                  >
                    <FileText size={12} /> Get Quote
                  </Button>
                  <Button variant="ghost" size="sm">
                    <MessageCircle size={14} />
                  </Button>
                </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
