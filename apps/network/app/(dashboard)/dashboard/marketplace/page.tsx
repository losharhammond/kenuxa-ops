"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  Search, MapPin, LayoutGrid, List, Package, Store, ShoppingBag,
  Star, CheckCircle2, SlidersHorizontal, X, Loader2, AlertCircle, Send,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

interface Listing {
  id: string;
  name: string;
  price: number;
  compare_price: number | null;
  category: string | null;
  city: string | null;
  stock_qty: number;
  business_name: string | null;
  is_verified: boolean;
  avg_rating: number | null;
  total_sold: number | null;
  image_url: string | null;
}

const CATEGORIES = ["All", "Electronics", "Food & Groceries", "Fashion", "Health & Beauty", "Home", "Agriculture", "Construction", "Other"];
const INPUT_CLS = "w-full bg-[#07080f] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)] transition-colors";
const TEXTAREA_CLS = "w-full bg-[#07080f] border border-white/7 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)] resize-none";
const DEFAULT_PRODUCT = { name: "", category: "Electronics", price: "", compare_price: "", stock_qty: "10", city: "" };

export default function MarketplacePage() {
  const supabase = createClient();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showListModal, setShowListModal] = useState(false);
  const [productForm, setProductForm] = useState(DEFAULT_PRODUCT);
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("marketplace_listings")
      .select("id, name, price, compare_price, category, city, stock_qty, business_name, is_verified, avg_rating, total_sold, image_url")
      .eq("status", "active")
      .order("total_sold", { ascending: false })
      .limit(48);

    if (search) q = q.ilike("name", `%${search}%`);
    if (category !== "All") q = q.eq("category", category);
    if (location !== "all") q = q.ilike("city", `%${location}%`);

    const { data } = await q;
    setListings((data as Listing[]) ?? []);
    setLoading(false);
  }, [search, category, location]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-fade-in">
      <Header
        title="Product Marketplace"
        subtitle="Buy, sell & compare across thousands of merchants"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Package size={13} /> My Listings</Button>
            <Button size="sm" onClick={() => setShowListModal(true)}>+ List a Product</Button>
          </div>
        }
      />

      <div className="p-6 space-y-6">
        {/* Search */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-64 flex items-center gap-2 bg-[#111624] border border-white/10 rounded-lg px-4 h-11">
            <Search size={15} className="text-[#64748b]" />
            <input
              className="bg-transparent border-none outline-none flex-1 text-sm placeholder:text-[#374151] text-[#f1f5f9]"
              placeholder="Search products, sellers..."
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
              <option value="Tamale">Tamale</option>
            </select>
          </div>
          <div className="flex items-center gap-1 bg-[#111624] border border-white/7 rounded-lg px-1 h-11">
            <button
              onClick={() => setView("grid")}
              className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E]" : "text-[#64748b]"}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E]" : "text-[#64748b]"}`}
            >
              <List size={16} />
            </button>
          </div>
          <Button variant="secondary"><SlidersHorizontal size={13} /> Filters</Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition-colors ${
                category === cat
                  ? "bg-[rgba(255,101,36,0.15)] border-[rgba(255,101,36,0.3)] text-[#FF8B5E]"
                  : "bg-[#111624] border-white/7 text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-sm text-[#64748b]">
            <span className="text-[#f1f5f9] font-medium">{listings.length}</span> products found
          </p>
        )}

        {/* Product Grid / List */}
        {loading ? (
          <div className={view === "grid" ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-3"}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className={view === "grid" ? "h-56 rounded-2xl" : "h-24 rounded-xl"} />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-[#0d0f1a] border border-white/7 rounded-2xl p-16 text-center">
            <ShoppingBag size={36} className="text-[#374151] mx-auto mb-4" />
            <p className="text-[#f1f5f9] font-semibold mb-1">No products found</p>
            <p className="text-sm text-[#64748b]">
              {search ? "Try different search terms." : "Be the first to list a product in the marketplace."}
            </p>
            <Button size="sm" className="mt-4" onClick={() => setShowListModal(true)}>+ List a Product</Button>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {listings.map((p) => (
              <Card key={p.id} className="overflow-hidden hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer flex flex-col">
                <div className="w-full aspect-square bg-[rgba(255,101,36,0.06)] flex items-center justify-center">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={32} className="text-[#374151]" />
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#f1f5f9] leading-tight mb-1 line-clamp-2">{p.name}</p>
                  <div className="flex items-center gap-1 mb-2">
                    {p.business_name && (
                      <div className="flex items-center gap-1 text-xs text-[#64748b]">
                        <Store size={10} />
                        <span className="truncate">{p.business_name}</span>
                        {p.is_verified && <CheckCircle2 size={10} className="text-[#34d399] flex-shrink-0" />}
                      </div>
                    )}
                  </div>
                  {p.avg_rating && (
                    <div className="flex items-center gap-1 text-xs text-[#64748b] mb-2">
                      <Star size={10} className="text-[#F59E0B]" />
                      <span>{p.avg_rating.toFixed(1)}</span>
                      {p.total_sold && <span>· {p.total_sold} sold</span>}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-base font-black text-[#f1f5f9]">{formatCurrency(p.price)}</span>
                    {p.compare_price && (
                      <span className="text-xs text-[#374151] line-through">{formatCurrency(p.compare_price)}</span>
                    )}
                  </div>
                  {p.stock_qty <= 5 && p.stock_qty > 0 && (
                    <Badge variant="orange" className="text-[10px] mb-2">Only {p.stock_qty} left</Badge>
                  )}
                  <Button size="sm" className="w-full text-xs"><ShoppingBag size={12} /> Buy Now</Button>
                </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((p) => (
              <Card key={p.id} className="p-4 hover:border-white/20 hover:bg-[#161b2e] transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[rgba(255,101,36,0.06)] rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={24} className="text-[#374151]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#f1f5f9] mb-1">{p.name}</p>
                        <div className="flex items-center gap-3 text-xs text-[#64748b]">
                          {p.business_name && (
                            <div className="flex items-center gap-1">
                              <Store size={10} />
                              {p.business_name}
                              {p.is_verified && <CheckCircle2 size={10} className="text-[#34d399]" />}
                            </div>
                          )}
                          {p.city && <span className="flex items-center gap-1"><MapPin size={10} />{p.city}</span>}
                          {p.avg_rating && <span className="flex items-center gap-1"><Star size={10} className="text-[#F59E0B]" />{p.avg_rating.toFixed(1)}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-base font-black text-[#f1f5f9]">{formatCurrency(p.price)}</p>
                        {p.compare_price && (
                          <p className="text-xs text-[#374151] line-through">{formatCurrency(p.compare_price)}</p>
                        )}
                        <Button size="sm" className="mt-2 text-xs"><ShoppingBag size={12} /> Buy</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* List a Product Modal */}
      {showListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowListModal(false)}>
          <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/7">
              <h2 className="text-base font-bold text-[#f1f5f9]">List a Product</h2>
              <button onClick={() => setShowListModal(false)} className="p-1.5 hover:bg-white/5 rounded-lg"><X size={14} className="text-[#64748b]" /></button>
            </div>
            {submitSuccess ? (
              <div className="p-10 text-center">
                <div className="w-14 h-14 rounded-full bg-[rgba(52,211,153,0.1)] flex items-center justify-center mx-auto mb-3">
                  <CheckCircle2 size={28} className="text-[#34d399]" />
                </div>
                <p className="text-[#f1f5f9] font-semibold">Product Listed!</p>
                <p className="text-sm text-[#64748b] mt-1">Your product is now live in the marketplace.</p>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="flex justify-center">
                  <div>
                    <p className="text-xs text-[#64748b] mb-2 text-center">Product Image</p>
                    <ImageUpload value={productImageUrl} onChange={setProductImageUrl} bucket="marketplace" path="products" size="lg" placeholder="Upload product photo" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Product Name *</label>
                  <input value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Wireless Earbuds" className={INPUT_CLS} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Category</label>
                    <select value={productForm.category} onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))} className={INPUT_CLS}>
                      {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">City</label>
                    <input value={productForm.city} onChange={(e) => setProductForm((f) => ({ ...f, city: e.target.value }))} placeholder="Accra" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Price (GHS) *</label>
                    <input type="number" value={productForm.price} onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))} placeholder="299" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Compare Price</label>
                    <input type="number" value={productForm.compare_price} onChange={(e) => setProductForm((f) => ({ ...f, compare_price: e.target.value }))} placeholder="399" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Stock Qty</label>
                    <input type="number" value={productForm.stock_qty} onChange={(e) => setProductForm((f) => ({ ...f, stock_qty: e.target.value }))} placeholder="10" className={INPUT_CLS} />
                  </div>
                </div>
                {submitError && (
                  <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/5 border border-red-400/20 rounded-lg p-3">
                    <AlertCircle size={12} /> {submitError}
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setShowListModal(false)}>Cancel</Button>
                  <Button size="sm" disabled={submitting} onClick={async () => {
                    if (!productForm.name || !productForm.price) { setSubmitError("Name and price are required."); return; }
                    setSubmitting(true); setSubmitError("");
                    const { error: err } = await supabase.from("marketplace_listings").insert({
                      name: productForm.name.trim(),
                      category: productForm.category,
                      price: parseFloat(productForm.price),
                      compare_price: productForm.compare_price ? parseFloat(productForm.compare_price) : null,
                      stock_qty: parseInt(productForm.stock_qty) || 0,
                      city: productForm.city || null,
                      image_url: productImageUrl,
                      status: "active",
                      is_verified: false,
                      total_sold: 0,
                    });
                    setSubmitting(false);
                    if (err) { setSubmitError(err.message); return; }
                    setSubmitSuccess(true);
                    setTimeout(() => { setShowListModal(false); setSubmitSuccess(false); setProductForm(DEFAULT_PRODUCT); setProductImageUrl(null); load(); }, 2000);
                  }}>
                    {submitting ? <><Loader2 size={12} className="animate-spin" /> Listing…</> : <><Send size={12} /> Publish Product</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
