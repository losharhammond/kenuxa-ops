"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  CheckCircle2, MessageCircle, Phone, MapPin, Mail, Star,
  Globe, Package, FileText, Building2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Business {
  id: string;
  name: string;
  business_type: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  tagline: string | null;
  tags: string[] | null;
  is_verified: boolean;
  trust_score: number | null;
  avg_rating: number | null;
  total_reviews: number | null;
  year_established: number | null;
  employee_count: string | null;
  status: string;
}

interface Product {
  id: string;
  name: string;
  selling_price: number;
  unit: string | null;
  stock_qty: number;
}

interface Review {
  id: string;
  reviewer_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface SimilarBusiness {
  id: string;
  name: string;
  business_type: string | null;
  city: string | null;
  avg_rating: number | null;
}

interface HourRow {
  day_of_week: string;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} size={12} className={i <= Math.round(rating) ? "text-[#F59E0B] fill-[#F59E0B]" : "text-[#374151]"} />
      ))}
    </span>
  );
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [biz, setBiz] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<SimilarBusiness[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: bizData }, { data: prodData }, { data: revData }] = await Promise.all([
        supabase.from("businesses").select("id, name, business_type, category, city, region, address, phone, whatsapp, email, website, description, tagline, tags, is_verified, trust_score, avg_rating, total_reviews, year_established, employee_count, status, business_hours").eq("id", id).single(),
        supabase.from("inventory_items").select("id, name, selling_price, unit, stock_qty").eq("business_id", id).eq("is_active", true).limit(6),
        supabase.from("business_reviews").select("id, reviewer_name, rating, comment, created_at").eq("business_id", id).order("created_at", { ascending: false }).limit(5),
      ]);

      const b = bizData as (Business & { business_hours?: HourRow[] | null }) | null;
      setBiz(b);
      setProducts((prodData as Product[]) ?? []);
      setReviews((revData as Review[]) ?? []);
      // business_hours is a JSONB column on the businesses table
      if (b?.business_hours && Array.isArray(b.business_hours)) {
        setHours(b.business_hours as HourRow[]);
      }

      if (b?.category) {
        const { data: simData } = await supabase
          .from("businesses")
          .select("id, name, business_type, city, avg_rating")
          .eq("category", b.category)
          .eq("status", "active")
          .neq("id", id)
          .limit(3);
        setSimilar((simData as SimilarBusiness[]) ?? []);
      }
      setLoading(false);
    })();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen bg-[#07080f] pb-16">
      <div className="h-48 bg-gradient-to-br from-[rgba(255,101,36,0.15)] to-[rgba(245,158,11,0.08)] border-b border-white/7" />
      <div className="max-w-6xl mx-auto px-4 -mt-8 space-y-4">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );

  if (!biz) return (
    <div className="min-h-screen bg-[#07080f] flex items-center justify-center">
      <div className="text-center">
        <Building2 size={48} className="mx-auto text-[#374151] mb-4" />
        <p className="text-[#f1f5f9] font-semibold">Business not found</p>
        <Link href="/dashboard/directory" className="text-sm text-[#FF8B5E] mt-2 block hover:underline">Back to Directory</Link>
      </div>
    </div>
  );

  const tags = Array.isArray(biz.tags) ? biz.tags : [];

  return (
    <div className="min-h-screen bg-[#07080f]">
      {/* Banner */}
      <div className="relative h-48 bg-gradient-to-br from-[rgba(255,101,36,0.15)] to-[rgba(245,158,11,0.08)] border-b border-white/7">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#07080f] to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8 pb-16">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* LEFT — main content */}
          <div className="flex-1 min-w-0">

            {/* Business header */}
            <Card className="mb-4">
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[rgba(255,101,36,0.08)] border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Building2 size={28} className="text-[#FF8B5E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h1 className="text-xl font-bold text-[#f1f5f9]">{biz.name}</h1>
                      {biz.is_verified && (
                        <Badge variant="verified"><CheckCircle2 size={10} className="inline mr-0.5" /> Verified</Badge>
                      )}
                      {biz.status === "active" && <Badge variant="green">Open</Badge>}
                    </div>
                    <p className="text-sm text-[#64748b] mb-2">
                      {biz.category ?? biz.business_type}
                      {biz.city ? ` · ${biz.city}` : ""}
                      {biz.region ? `, ${biz.region}` : ""}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {biz.avg_rating != null && (
                        <div className="flex items-center gap-1.5">
                          <Stars rating={biz.avg_rating} />
                          <span className="text-sm font-semibold text-[#f1f5f9]">{biz.avg_rating.toFixed(1)}</span>
                          {biz.total_reviews != null && (
                            <span className="text-xs text-[#64748b]">({biz.total_reviews} reviews)</span>
                          )}
                        </div>
                      )}
                      {biz.year_established && (
                        <><span className="text-[#374151]">·</span><span className="text-xs text-[#64748b]">Since {biz.year_established}</span></>
                      )}
                      {biz.employee_count && (
                        <><span className="text-[#374151]">·</span><span className="text-xs text-[#64748b]">{biz.employee_count} employees</span></>
                      )}
                    </div>
                  </div>
                  {biz.trust_score != null && (
                    <div className="hidden md:flex flex-col items-center bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.15)] rounded-xl px-4 py-3 flex-shrink-0">
                      <span className="text-2xl font-black text-[#34d399]">{biz.trust_score}</span>
                      <span className="text-[10px] text-[#64748b] mt-0.5">Trust Score</span>
                    </div>
                  )}
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {tags.map((t) => (
                      <span key={t} className="text-xs bg-white/5 text-[#64748b] border border-white/7 px-2.5 py-1 rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-4">
                  {biz.whatsapp && (
                    <a href={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-1.5"><MessageCircle size={13} /> WhatsApp</Button>
                    </a>
                  )}
                  {biz.phone && (
                    <a href={`tel:${biz.phone}`}>
                      <Button size="sm" variant="secondary" className="gap-1.5"><Phone size={13} /> Call</Button>
                    </a>
                  )}
                  {biz.address && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(biz.address)}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="secondary" className="gap-1.5"><MapPin size={13} /> Directions</Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About */}
            {(biz.description || biz.address || biz.website || biz.email || biz.phone) && (
              <Card className="mb-4">
                <CardHeader><CardTitle>About</CardTitle></CardHeader>
                <CardContent>
                  {biz.description && (
                    <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">{biz.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {biz.address && (
                      <div>
                        <p className="text-xs text-[#374151] mb-0.5">Address</p>
                        <p className="text-[#94a3b8]">{biz.address}</p>
                      </div>
                    )}
                    {biz.website && (
                      <div>
                        <p className="text-xs text-[#374151] mb-0.5">Website</p>
                        <a href={biz.website.startsWith("http") ? biz.website : `https://${biz.website}`} className="text-[#FF8B5E] hover:underline" target="_blank" rel="noopener noreferrer">
                          {biz.website}
                        </a>
                      </div>
                    )}
                    {biz.email && (
                      <div>
                        <p className="text-xs text-[#374151] mb-0.5">Email</p>
                        <a href={`mailto:${biz.email}`} className="text-[#FF8B5E] hover:underline">{biz.email}</a>
                      </div>
                    )}
                    {biz.phone && (
                      <div>
                        <p className="text-xs text-[#374151] mb-0.5">Phone</p>
                        <p className="text-[#94a3b8]">{biz.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products */}
            {products.length > 0 && (
              <Card className="mb-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Products</CardTitle>
                    <button className="text-xs text-[#FF8B5E] hover:underline">See all →</button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center justify-between gap-3 bg-[#0d0f1a] border border-white/7 rounded-xl p-3">
                        <div className="min-w-0 flex items-center gap-2">
                          <Package size={14} className="text-[#374151] flex-shrink-0" />
                          <div>
                            <p className="text-sm text-[#f1f5f9] font-medium truncate">{p.name}</p>
                            <p className="text-xs text-[#64748b] mt-0.5">{formatCurrency(p.selling_price)}{p.unit ? ` / ${p.unit}` : ""}</p>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {p.stock_qty > 0
                            ? <Badge variant="green" className="text-[10px]">In stock</Badge>
                            : <Badge variant="red" className="text-[10px]">Out</Badge>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Reviews</CardTitle>
                  {biz.total_reviews != null && (
                    <span className="text-sm text-[#64748b]">{biz.total_reviews} total</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-sm text-[#374151] text-center py-6">No reviews yet. Be the first to review.</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-7 h-7 rounded-full bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-xs font-bold text-[#FF8B5E]">
                            {(r.reviewer_name ?? "A")[0]}
                          </div>
                          <span className="text-sm font-medium text-[#f1f5f9]">{r.reviewer_name ?? "Anonymous"}</span>
                          <Stars rating={r.rating} />
                          <span className="text-xs text-[#374151] ml-auto">
                            {new Date(r.created_at).toLocaleDateString("en-GH")}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-[#94a3b8] leading-relaxed pl-9">{r.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="w-full mt-3">
                  <FileText size={13} /> Write a Review
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — sidebar */}
          <div className="lg:w-72 flex-shrink-0 space-y-4">

            {/* Business Hours */}
            {hours.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Business Hours</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {hours.map((h) => (
                    <div key={h.day_of_week} className="flex items-center justify-between text-sm">
                      <span className="text-[#64748b] capitalize">{h.day_of_week}</span>
                      <span className={h.is_closed ? "text-[#374151]" : "text-[#f1f5f9]"}>
                        {h.is_closed ? "Closed" : `${h.open_time} – ${h.close_time}`}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Contact */}
            <Card>
              <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {biz.whatsapp && (
                  <a href={`https://wa.me/${biz.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button className="w-full gap-2" size="sm"><MessageCircle size={13} /> Chat on WhatsApp</Button>
                  </a>
                )}
                {biz.email && (
                  <a href={`mailto:${biz.email}`} className="block">
                    <Button variant="secondary" className="w-full gap-2" size="sm"><Mail size={13} /> Send Email</Button>
                  </a>
                )}
                {biz.website && (
                  <a href={biz.website.startsWith("http") ? biz.website : `https://${biz.website}`} target="_blank" rel="noopener noreferrer" className="block">
                    <Button variant="ghost" className="w-full gap-2" size="sm"><Globe size={13} /> Visit Website</Button>
                  </a>
                )}
                <Button variant="ghost" className="w-full gap-2" size="sm"><FileText size={13} /> Request Quote</Button>
              </CardContent>
            </Card>

            {/* Similar businesses */}
            {similar.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Similar Businesses</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {similar.map((b) => (
                    <Link key={b.id} href={`/dashboard/directory/${b.id}`} className="flex items-center gap-3 group">
                      <div className="w-9 h-9 rounded-lg bg-[rgba(255,101,36,0.06)] flex items-center justify-center flex-shrink-0">
                        <Building2 size={16} className="text-[#FF8B5E]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#f1f5f9] group-hover:text-[#FF8B5E] transition-colors truncate">{b.name}</p>
                        <p className="text-xs text-[#64748b] flex items-center gap-1">
                          {b.city}
                          {b.avg_rating != null && (
                            <><span className="text-[#374151]">·</span><Star size={11} className="text-[#F59E0B]" />{b.avg_rating.toFixed(1)}</>
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
