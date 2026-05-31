"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Save, Camera, Store, Pencil, CheckCircle2, Circle, Star,
  Eye, MapPin, Map, Facebook, Instagram, Twitter, MessageCircle,
  Linkedin, Youtube, Music, Globe, TrendingUp, Landmark, Target, Shield,
  Upload, Loader2,
} from "lucide-react";
import { useIndustry } from "@/lib/hooks/use-industry";
import { IndustryBanner } from "@/components/ui/industry-banner";
import { KenuxaScoreCard } from "@/components/ui/kenuxa-score";

const INPUT_CLS = "w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)] transition-colors";
const SELECT_CLS = "w-full bg-[#111624] border border-white/7 rounded-lg px-3 h-9 text-sm text-[#f1f5f9] outline-none focus:border-[rgba(255,101,36,0.4)] transition-colors";
const TEXTAREA_CLS = "w-full bg-[#111624] border border-white/7 rounded-lg px-3 py-2 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.4)] transition-colors resize-none";
const LABEL_CLS = "block text-xs font-medium text-[#64748b] mb-1.5";

const GHANA_REGIONS = [
  "Greater Accra","Ashanti","Western","Central","Eastern","Northern",
  "Upper East","Upper West","Volta","Oti","Bono","Bono East","Ahafo",
  "Savannah","North East","Western North",
];

const BUSINESS_TYPES = [
  "Retailer","Supermarket","Pharmacy","Restaurant","Hotel","Manufacturer",
  "Distributor","Service Provider","Professional","Freelancer","Agency",
  "Contractor","Wholesaler","Importer",
];

// Verification items defined without hardcoded done — computed from profile data below
const VERIFICATION_ITEM_DEFS = [
  { key: "biz_reg",    label: "Business Registration (GRA)", action: null         },
  { key: "phone",      label: "Phone Number Verified",        action: null         },
  { key: "email",      label: "Email Address Verified",       action: null         },
  { key: "location",   label: "Location / GPS Verified",      action: null         },
  { key: "bank",       label: "Bank Account Linked",          action: "Link Account" },
  { key: "ghana_card", label: "Ghana Card (Owner ID)",        action: "Upload ID"  },
  { key: "tin",        label: "TIN Number Verified",          action: "Add TIN"    },
  { key: "photos",     label: "Storefront Photos",            action: "Upload Photos" },
];

interface BusinessProfile {
  name: string;
  business_type: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  year_established: string;
  tagline: string;
  description: string;
  tags: string;
  address: string;
  city: string;
  region: string;
  latitude: string;
  longitude: string;
}

const EMPTY_PROFILE: BusinessProfile = {
  name: "", business_type: "Retailer", phone: "", whatsapp: "", email: "",
  website: "", year_established: "", tagline: "", description: "", tags: "",
  address: "", city: "", region: "Greater Accra", latitude: "", longitude: "",
};

export default function ProfilePage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<"info" | "location" | "social" | "hours" | "verification">("info");
  const [form, setForm] = useState<BusinessProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<Record<string, boolean>>({});
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const industry = useIndustry(form.business_type);

  const set = (k: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const load = useCallback(async () => {
    if (!profile?.business_id) return;
    const [{ data }, { data: kycData }] = await Promise.all([
      supabase
        .from("businesses")
        .select("name, business_type, phone, whatsapp, email, website, year_established, tagline, description, tags, address, city, region, latitude, longitude, verification_status, tin")
        .eq("id", profile.business_id)
        .single(),
      supabase
        .from("kyc_submissions")
        .select("document_type, status")
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (data) {
      setForm({
        name: data.name ?? "",
        business_type: data.business_type ?? "Retailer",
        phone: data.phone ?? "",
        whatsapp: data.whatsapp ?? "",
        email: data.email ?? "",
        website: data.website ?? "",
        year_established: data.year_established ? String(data.year_established) : "",
        tagline: data.tagline ?? "",
        description: data.description ?? "",
        tags: Array.isArray(data.tags) ? data.tags.join(", ") : (data.tags ?? ""),
        address: data.address ?? "",
        city: data.city ?? "",
        region: data.region ?? "Greater Accra",
        latitude: data.latitude ? String(data.latitude) : "",
        longitude: data.longitude ? String(data.longitude) : "",
      });

      // Compute verification status dynamically
      const kyc = (kycData ?? []) as { document_type: string; status: string }[];
      const kycApproved = (docType: string) => kyc.some((k) => k.document_type === docType && k.status === "approved");

      setVerificationStatus({
        biz_reg:    data.verification_status === "verified",
        phone:      !!data.phone,
        email:      !!data.email,
        location:   !!(data.address && data.latitude),
        bank:       false, // set to true when bank account integration is live
        ghana_card: kycApproved("ghana_card"),
        tin:        !!data.tin,
        photos:     false, // set to true when storefront photos are uploaded
      });
    }
  }, [profile?.business_id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const uploadImage = async (file: File, type: "logo" | "banner") => {
    if (!profile?.business_id) return;
    if (type === "logo") setUploadingLogo(true); else setUploadingBanner(true);
    const ext = file.name.split(".").pop();
    const path = `businesses/${profile.business_id}/${type}.${ext}`;
    const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true });
    if (!error) {
      const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
      const url = data.publicUrl;
      if (type === "logo") {
        setLogoUrl(url);
        await supabase.from("businesses").update({ logo_url: url }).eq("id", profile.business_id);
      } else {
        setBannerUrl(url);
        await supabase.from("businesses").update({ banner_url: url }).eq("id", profile.business_id);
      }
    }
    if (type === "logo") setUploadingLogo(false); else setUploadingBanner(false);
  };

  const saveInfo = async () => {
    if (!profile?.business_id) return;
    setSaving(true);
    await supabase.from("businesses").update({
      name: form.name,
      business_type: form.business_type,
      phone: form.phone,
      whatsapp: form.whatsapp,
      email: form.email,
      website: form.website,
      year_established: form.year_established ? parseInt(form.year_established) : null,
      tagline: form.tagline,
      description: form.description,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      address: form.address,
      city: form.city,
      region: form.region,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
    }).eq("id", profile.business_id);
    setSaving(false);
  };

  const VERIFICATION_ITEMS = VERIFICATION_ITEM_DEFS.map((v) => ({ ...v, done: !!verificationStatus[v.key] }));
  const completedVerifications = VERIFICATION_ITEMS.filter((v) => v.done).length;
  const verificationPct = Math.round((completedVerifications / VERIFICATION_ITEMS.length) * 100);

  return (
    <div className="animate-fade-in">
      <Header
        title="Business Profile"
        subtitle="Your digital headquarters on KENUXA"
        actions={<Button size="sm" onClick={saveInfo} disabled={saving}><Save size={13} /> {saving ? "Saving..." : "Save Changes"}</Button>}
      />

      <div className="p-6 space-y-6">
        {/* Hidden file inputs */}
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "logo")} />
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "banner")} />

        {/* Banner + Logo */}
        <div
          className="relative h-44 rounded-2xl border border-white/10 overflow-hidden cursor-pointer group"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "linear-gradient(to right, rgba(255,101,36,0.3), rgba(245,158,11,0.15), transparent)" }}
          onClick={() => bannerRef.current?.click()}
        >
          {!bannerUrl && <div className="absolute inset-0 grid-bg opacity-40" />}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            {uploadingBanner ? <Loader2 size={20} className="animate-spin text-white" /> : <><Camera size={16} className="text-white mr-2" /><span className="text-white text-sm font-medium">Change Banner</span></>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); bannerRef.current?.click(); }}
            className="absolute top-4 right-4 bg-black/40 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-black/60 transition-colors flex items-center gap-1.5 z-10"
          >
            {uploadingBanner ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />} Change Banner
          </button>
          <div className="absolute -bottom-10 left-6">
            <div
              className="relative w-20 h-20 rounded-2xl bg-[#0d0f1a] border-4 border-[#07080f] shadow-xl overflow-hidden cursor-pointer group/logo"
              onClick={(e) => { e.stopPropagation(); logoRef.current?.click(); }}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store size={32} className="text-[#FF8B5E]" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingLogo ? <Loader2 size={14} className="animate-spin text-white" /> : <Upload size={14} className="text-white" />}
              </div>
              <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#FF6524] rounded-full flex items-center justify-center text-white shadow z-10">
                <Pencil size={10} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-[#f1f5f9]">{form.name || "My Business"}</h2>
              <Badge variant="green"><CheckCircle2 size={10} className="inline mr-0.5" /> Verified</Badge>
              <Badge variant="orange">Featured</Badge>
            </div>
            <p className="text-sm text-[#64748b] mt-1">{form.business_type}{form.city ? ` · ${form.city}, Ghana` : ""}</p>
            <p className="text-xs text-[#64748b] mt-0.5 flex items-center gap-1"><Star size={11} className="text-[#F59E0B]" /> 4.8 · 142 reviews · Member since Jan 2025</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm"><Eye size={13} /> Preview Public Page</Button>
          </div>
        </div>

        {/* Industry Mode */}
        <IndustryBanner industry={industry} />

        {/* KENUXA Business Score */}
        <KenuxaScoreCard
          factors={{
            verificationStatus: verificationStatus.biz_reg ? "verified" : "unverified",
            profileComplete: !!(form.name && form.description && form.address),
            hasLogo: !!logoUrl,
            hasBanner: !!bannerUrl,
            yearsInBusiness: form.year_established ? new Date().getFullYear() - parseInt(form.year_established) : 0,
          }}
          showBreakdown={false}
        />

        {/* Verification progress banner */}
        <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.2)] rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-semibold text-[#f1f5f9]">Profile Completeness — {verificationPct}%</p>
              <p className="text-xs text-[#64748b]">{completedVerifications}/{VERIFICATION_ITEMS.length} verified</p>
            </div>
            <div className="h-2 bg-[#111624] rounded-full overflow-hidden">
              <div className="h-full bg-[#FF6524] rounded-full transition-all" style={{ width: `${verificationPct}%` }} />
            </div>
            <p className="text-xs text-[#64748b] mt-1.5">Verified businesses get 3× more visibility in search results</p>
          </div>
          <Button size="sm" onClick={() => setActiveTab("verification")}>Complete Verification →</Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111624] border border-white/7 rounded-xl p-1 w-fit overflow-x-auto">
          {[
            { key: "info" as const,         label: "Basic Info" },
            { key: "location" as const,     label: "Location & GPS" },
            { key: "social" as const,       label: "Social Links" },
            { key: "hours" as const,        label: "Business Hours" },
            { key: "verification" as const, label: "Verification" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key ? "bg-[#FF6524] text-white" : "text-[#64748b] hover:text-[#f1f5f9]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Basic Info */}
        {activeTab === "info" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Business Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Business Name *</label>
                    <input value={form.name} onChange={set("name")} placeholder="Your business name" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Business Type</label>
                    <select className={SELECT_CLS} value={form.business_type} onChange={set("business_type")}>
                      {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Phone *</label>
                    <input value={form.phone} onChange={set("phone")} placeholder="+233 24 000 0000" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>WhatsApp</label>
                    <input value={form.whatsapp} onChange={set("whatsapp")} placeholder="+233 24 000 0000" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Email</label>
                    <input type="email" value={form.email} onChange={set("email")} placeholder="business@email.com" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Website</label>
                    <input type="url" value={form.website} onChange={set("website")} placeholder="https://mybusiness.com" className={INPUT_CLS} />
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Year Established</label>
                    <input value={form.year_established} onChange={set("year_established")} placeholder="2020" className={INPUT_CLS} />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Tagline</label>
                    <input value={form.tagline} onChange={set("tagline")} placeholder="Quality products, fair prices" className={INPUT_CLS} />
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Business Description</label>
                    <textarea
                      rows={4}
                      value={form.description}
                      onChange={set("description")}
                      placeholder="Tell customers about your business, what you sell, and what makes you unique..."
                      className={TEXTAREA_CLS}
                    />
                    <p className="text-xs text-[#374151] mt-1">{form.description.length}/500 characters</p>
                  </div>
                  <div className="col-span-2">
                    <label className={LABEL_CLS}>Tags / Keywords (comma-separated)</label>
                    <input value={form.tags} onChange={set("tags")} placeholder="groceries, wholesale, fresh produce" className={INPUT_CLS} />
                    <p className="text-xs text-[#374151] mt-1">Help customers find you via search</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={saveInfo} disabled={saving}>{saving ? "Saving..." : "Save Details"}</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Business Categories</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-[#64748b]">Select up to 3 categories that best describe your business.</p>
                <div className="grid grid-cols-2 gap-2">
                  {["Retail & Shops","Food & Groceries","Health & Pharmacy","Electronics","Fashion & Apparel","Construction","Transport","Professional Services","Technology","Agriculture","Finance","Beauty & Wellness"].map((cat) => (
                    <label key={cat} className="flex items-center gap-2 p-2.5 bg-[#111624] border border-white/7 rounded-lg cursor-pointer hover:border-[rgba(255,101,36,0.3)] transition-colors text-xs text-[#64748b] hover:text-[#f1f5f9]">
                      <input type="checkbox" className="w-3.5 h-3.5 accent-[#FF6524]" />
                      {cat}
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button size="sm">Save Categories</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Location & GPS */}
        {activeTab === "location" && (
          <Card>
            <CardHeader><CardTitle>Location & GPS Coordinates</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={LABEL_CLS}>Street Address *</label>
                  <input value={form.address} onChange={set("address")} placeholder="123 High Street, Osu" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>City *</label>
                  <input value={form.city} onChange={set("city")} placeholder="Accra" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Region *</label>
                  <select className={SELECT_CLS} value={form.region} onChange={set("region")}>
                    {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={LABEL_CLS}>Digital Address (Ghana Post)</label>
                  <input placeholder="GA-123-4567" className={INPUT_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Country</label>
                  <select className={SELECT_CLS} defaultValue="Ghana">
                    <option>Ghana</option>
                    <option>Nigeria</option>
                    <option>Kenya</option>
                    <option>South Africa</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/7 pt-4">
                <h4 className="text-sm font-semibold text-[#f1f5f9] mb-1">GPS Coordinates</h4>
                <p className="text-xs text-[#64748b] mb-3">
                  Add your exact GPS coordinates to appear in &quot;Nearby&quot; searches and on the map.
                  Use Google Maps or your phone to get these.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLS}>Latitude</label>
                    <input type="number" step="0.000001" placeholder="5.603717" value={form.latitude} onChange={set("latitude")} className={INPUT_CLS} />
                    <p className="text-xs text-[#374151] mt-1">e.g. 5.603717 (North is positive)</p>
                  </div>
                  <div>
                    <label className={LABEL_CLS}>Longitude</label>
                    <input type="number" step="0.000001" placeholder="-0.186964" value={form.longitude} onChange={set("longitude")} className={INPUT_CLS} />
                    <p className="text-xs text-[#374151] mt-1">e.g. -0.186964 (West is negative)</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="secondary"><MapPin size={13} /> Use My Current Location</Button>
                  <Button size="sm" variant="ghost"><Map size={13} /> Open in Maps</Button>
                </div>
              </div>

              {/* Map preview placeholder */}
              <div className="h-48 bg-[#111624] border border-white/7 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <Map size={32} className="mx-auto mb-2 text-[#374151]" />
                  <p className="text-sm text-[#64748b]">Map preview</p>
                  <p className="text-xs text-[#374151]">5.6037, -0.1870 · Accra, Ghana</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={saveInfo} disabled={saving}>{saving ? "Saving..." : "Save Location"}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Social Links */}
        {activeTab === "social" && (
          <Card>
            <CardHeader><CardTitle>Social Media & Online Presence</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#64748b]">Add your social media links so customers can follow you and connect across platforms.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: <Facebook size={13} className="text-[#3B82F6]" />,      platform: "Facebook",    placeholder: "facebook.com/mybusiness" },
                  { icon: <Instagram size={13} className="text-[#ec4899]" />,     platform: "Instagram",   placeholder: "instagram.com/mybusiness" },
                  { icon: <Twitter size={13} className="text-[#64748b]" />,       platform: "Twitter / X", placeholder: "x.com/mybusiness" },
                  { icon: <MessageCircle size={13} className="text-[#10b981]" />, platform: "WhatsApp",    placeholder: "+233 24 000 0000" },
                  { icon: <Linkedin size={13} className="text-[#3B82F6]" />,      platform: "LinkedIn",    placeholder: "linkedin.com/company/..." },
                  { icon: <Youtube size={13} className="text-[#f87171]" />,       platform: "YouTube",     placeholder: "youtube.com/@mybusiness" },
                  { icon: <Music size={13} className="text-[#64748b]" />,         platform: "TikTok",      placeholder: "tiktok.com/@mybusiness" },
                  { icon: <Globe size={13} className="text-[#64748b]" />,         platform: "Website",     placeholder: "https://mybusiness.com" },
                ].map((s) => (
                  <div key={s.platform}>
                    <label className={`${LABEL_CLS} flex items-center gap-1.5`}>{s.icon} {s.platform}</label>
                    <input type="url" placeholder={s.placeholder} className={INPUT_CLS} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button size="sm">Save Social Links</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Business Hours */}
        {activeTab === "hours" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Business Hours</CardTitle>
                <Button size="sm" variant="secondary">Set All Same</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map((day, i) => (
                <div key={day} className="flex items-center gap-4 py-1.5 border-b border-white/5 last:border-0">
                  <div className="w-24 text-sm text-[#f1f5f9] flex-shrink-0">{day}</div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked={i !== 6} className="sr-only peer" />
                    <div className="w-9 h-5 bg-[#0d0f1a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-[#374151] after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#FF6524] peer-checked:after:bg-white border border-white/10 relative" />
                  </label>
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" defaultValue="08:00" className="bg-[#111624] border border-white/7 rounded-lg px-2 h-8 text-xs text-[#f1f5f9] outline-none focus:border-[rgba(255,101,36,0.4)] w-28" />
                    <span className="text-[#374151] text-xs">to</span>
                    <input type="time" defaultValue={i === 6 ? "14:00" : "18:00"} className="bg-[#111624] border border-white/7 rounded-lg px-2 h-8 text-xs text-[#f1f5f9] outline-none focus:border-[rgba(255,101,36,0.4)] w-28" />
                    {i === 6 && <span className="text-xs text-[#64748b]">Half day</span>}
                  </div>
                </div>
              ))}
              <div className="flex justify-end pt-2">
                <Button size="sm">Save Hours</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification */}
        {activeTab === "verification" && (
          <div className="space-y-4">
            <div className="bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.2)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-[#f1f5f9]">Verification Status</h3>
                  <p className="text-xs text-[#64748b] mt-0.5">Complete verification to unlock higher search rankings and trust badges</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#34d399]">{verificationPct}%</p>
                  <p className="text-xs text-[#64748b]">{completedVerifications}/{VERIFICATION_ITEMS.length} done</p>
                </div>
              </div>
              <div className="h-2 bg-[#111624] rounded-full overflow-hidden">
                <div className="h-full bg-[#34d399] rounded-full" style={{ width: `${verificationPct}%` }} />
              </div>
            </div>

            <Card>
              <CardContent className="p-0 divide-y divide-white/5">
                {VERIFICATION_ITEMS.map((v) => (
                  <div key={v.key} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                        v.done ? "bg-[rgba(52,211,153,0.15)] text-[#34d399]" : "bg-[rgba(255,255,255,0.04)] text-[#374151]"
                      }`}>
                        {v.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${v.done ? "text-[#f1f5f9]" : "text-[#64748b]"}`}>{v.label}</p>
                        {v.done && <p className="text-xs text-[#34d399]">Verified</p>}
                      </div>
                    </div>
                    {v.action && !v.done && (
                      <Button size="sm" variant="secondary">{v.action}</Button>
                    )}
                    {v.done && (
                      <Badge variant="green" className="text-[10px]"><CheckCircle2 size={9} className="inline mr-0.5" /> Done</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="bg-[rgba(255,101,36,0.06)] border border-[rgba(255,101,36,0.15)] rounded-xl p-4">
              <h4 className="text-sm font-semibold text-[#FF8B5E] mb-2 flex items-center gap-2">
                <Star size={14} /> Why Verification Matters
              </h4>
              <ul className="text-xs text-[#64748b] space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle2 size={11} className="text-[#34d399] flex-shrink-0" /> Verified badge increases customer trust by 40%</li>
                <li className="flex items-center gap-2"><TrendingUp size={11} className="text-[#34d399] flex-shrink-0" /> Verified businesses appear 3× higher in search results</li>
                <li className="flex items-center gap-2"><Landmark size={11} className="text-[#F59E0B] flex-shrink-0" /> Access to financial services (BNPL, loans, insurance)</li>
                <li className="flex items-center gap-2"><Target size={11} className="text-[#FF8B5E] flex-shrink-0" /> Featured business placement opportunities</li>
                <li className="flex items-center gap-2"><Shield size={11} className="text-[#3B82F6] flex-shrink-0" /> Fraud protection and dispute priority handling</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
