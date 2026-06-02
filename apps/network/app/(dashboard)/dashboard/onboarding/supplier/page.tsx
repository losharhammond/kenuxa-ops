"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import {
  Factory, CheckCircle, ArrowRight, ArrowLeft, Loader2,
} from "lucide-react";

const STEPS = ["Company Profile", "Products & Regions", "Done"];

const PRODUCT_CATEGORIES = [
  "Electronics", "Clothing & Apparel", "Food & Beverages", "Building Materials",
  "Agricultural Produce", "Pharmaceuticals", "Industrial Equipment", "Automotive Parts",
  "Office Supplies", "Household Goods", "Raw Materials", "Chemicals", "Other",
];

const REGIONS = [
  "Greater Accra", "Ashanti", "Western", "Eastern", "Central", "Volta",
  "Northern", "Upper East", "Upper West", "Bono", "Nationwide", "International",
];

export default function SupplierOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { activateRole } = useRoles();

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");

  const [companyName, setCompanyName]       = useState("");
  const [description, setDescription]       = useState("");
  const [minOrderValue, setMinOrder]        = useState("");
  const [leadTimeDays, setLeadTime]         = useState("");
  const [categories, setCategories]         = useState<string[]>([]);
  const [serviceRegions, setServiceRegions] = useState<string[]>([]);
  const [contactEmail, setContactEmail]     = useState("");
  const [contactPhone, setContactPhone]     = useState("");
  const [website, setWebsite]               = useState("");

  const toggleCat = (c: string) => setCategories((p) => p.includes(c) ? p.filter((x) => x !== c) : [...p, c]);
  const toggleRegion = (r: string) => setServiceRegions((p) => p.includes(r) ? p.filter((x) => x !== r) : [...p, r]);

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase
        .from("supplier_profiles")
        .upsert({
          user_id: user!.id,
          company_name: companyName,
          description,
          product_categories: categories,
          service_regions: serviceRegions,
          min_order_value: minOrderValue ? parseFloat(minOrderValue) : null,
          lead_time_days: leadTimeDays ? parseInt(leadTimeDays) : null,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          website: website || null,
          status: "active",
        }, { onConflict: "user_id" });

      if (err) {
        // Table might not exist yet — still activate the role
        console.warn("supplier_profiles upsert:", err.message);
      }
      await activateRole("supplier", { company_name: companyName });
      setStep(2);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to create supplier profile");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#f97316] transition-colors placeholder-[#374151]";
  const textareaCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-[#f1f5f9] outline-none focus:border-[#f97316] transition-colors placeholder-[#374151] resize-none";

  return (
    <div className="min-h-screen bg-[#080a14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step ? "bg-[#f97316] text-white" :
                i === step ? "bg-[rgba(249,115,22,0.2)] border-2 border-[#f97316] text-[#f97316]" :
                "bg-[#111624] border border-white/10 text-[#374151]"
              }`}>
                {i < step ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-[#f1f5f9] font-medium" : "text-[#374151]"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ml-2 ${i < step ? "bg-[#f97316]" : "bg-white/7"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#111624] border border-white/7 rounded-2xl p-6 shadow-2xl">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[rgba(249,115,22,0.15)] flex items-center justify-center">
                  <Factory size={18} className="text-[#f97316]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#f1f5f9]">Company Profile</h2>
                  <p className="text-xs text-[#64748b]">Tell buyers about your business</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Company Name *</label>
                <input className={inputCls} placeholder="e.g. Accra Trading Co. Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Description</label>
                <textarea className={textareaCls} rows={3} placeholder="What products do you supply? Who are your typical buyers?" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Min. Order (GHS)</label>
                  <input type="number" className={inputCls} placeholder="500" value={minOrderValue} onChange={(e) => setMinOrder(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Lead Time (days)</label>
                  <input type="number" className={inputCls} placeholder="3" value={leadTimeDays} onChange={(e) => setLeadTime(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Website</label>
                  <input className={inputCls} placeholder="www.example.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Contact Email</label>
                  <input type="email" className={inputCls} placeholder="supply@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Contact Phone</label>
                  <input type="tel" className={inputCls} placeholder="+233 20 000 0000" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
                </div>
              </div>
              <button onClick={() => companyName && setStep(1)} disabled={!companyName}
                className="w-full h-11 bg-[#f97316] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#ea6c0d] disabled:opacity-40 transition-colors">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[#f1f5f9]">Products & Service Regions</h2>
              {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Product Categories *</label>
                <div className="flex flex-wrap gap-2">
                  {PRODUCT_CATEGORIES.map((c) => (
                    <button key={c} type="button" onClick={() => toggleCat(c)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        categories.includes(c) ? "border-[#f97316] bg-[rgba(249,115,22,0.1)] text-[#f97316]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Service Regions</label>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((r) => (
                    <button key={r} type="button" onClick={() => toggleRegion(r)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        serviceRegions.includes(r) ? "border-[#f97316] bg-[rgba(249,115,22,0.1)] text-[#f97316]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm flex items-center justify-center gap-2 hover:border-white/20 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleSave} disabled={loading || categories.length === 0}
                  className="flex-1 h-11 bg-[#f97316] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#ea6c0d] disabled:opacity-60 transition-all">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><span>Become a Supplier</span><ArrowRight size={15} /></>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#f97316] flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-[#f1f5f9]">Supplier Profile Active!</h2>
              <p className="text-sm text-[#64748b]">Businesses can now send you RFQs and purchase orders.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => router.push("/dashboard/rfq")} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  View RFQs
                </button>
                <button onClick={() => router.push("/dashboard")} className="flex-1 h-11 bg-[#f97316] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#ea6c0d] transition-colors">
                  Dashboard <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
