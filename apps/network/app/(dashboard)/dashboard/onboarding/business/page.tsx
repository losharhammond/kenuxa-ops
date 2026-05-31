"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import {
  Building2, CheckCircle, ArrowRight, ArrowLeft, Upload,
  Loader2, Store, Pill, UtensilsCrossed, GraduationCap,
  Stethoscope, Hotel, Smartphone, Sprout, Briefcase, Factory,
  ShoppingBag, Truck, Zap,
} from "lucide-react";

const STEPS = ["Business Details", "Business Type", "Verification", "Done"];

const BUSINESS_TYPES = [
  { value: "retail",        label: "Retail Shop",      icon: ShoppingBag },
  { value: "pharmacy",      label: "Pharmacy",         icon: Pill },
  { value: "restaurant",    label: "Restaurant / Food", icon: UtensilsCrossed },
  { value: "hotel",         label: "Hotel / Lodging",  icon: Hotel },
  { value: "school",        label: "School / Training", icon: GraduationCap },
  { value: "clinic",        label: "Clinic / Healthcare", icon: Stethoscope },
  { value: "agency",        label: "Agency / Consulting", icon: Briefcase },
  { value: "mobile_money",  label: "MoMo Agent",       icon: Smartphone },
  { value: "manufacturer",  label: "Manufacturer",     icon: Factory },
  { value: "distributor",   label: "Distributor",      icon: Truck },
  { value: "agriculture",   label: "Agriculture",      icon: Sprout },
  { value: "tech",          label: "Tech / Software",  icon: Zap },
];

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, profile } = useAuth();
  const { activateRole } = useRoles();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bizId, setBizId] = useState<string | null>(null);

  // Step 0 — details
  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [category, setCategory]   = useState("");
  const [bizPhone, setBizPhone]   = useState("");
  const [bizEmail, setBizEmail]   = useState("");

  // Step 1 — type
  const [bizType, setBizType] = useState("");

  // Step 2 — KYC
  const [regNumber, setRegNumber] = useState("");
  const [skipKyc, setSkipKyc]     = useState(false);

  const handleStep0 = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep(1);
  };

  const handleStep1 = () => {
    if (!bizType) { setError("Please select a business type."); return; }
    setError("");
    setStep(2);
  };

  const handleStep2 = async () => {
    setLoading(true);
    setError("");
    try {
      const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .insert({
          name,
          description,
          category: bizType || category,
          phone: bizPhone || null,
          email: bizEmail || null,
          owner_id: user?.id,
          registration_number: regNumber || null,
          slug: `${slug}-${Date.now()}`,
          status: "active",
          country: (profile as { country?: string } | null)?.country ?? null,
        })
        .select("id")
        .single();

      if (bizErr) throw bizErr;

      await supabase
        .from("user_profiles")
        .update({ business_id: biz.id, role: "business_owner" })
        .eq("id", user!.id);

      await activateRole("business_owner", { business_id: biz.id });
      setBizId(biz.id);
      setStep(3);
    } catch (err: unknown) {
      setError((err as Error)?.message ?? "Failed to create business");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151]";
  const textareaCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 py-3 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151] resize-none";

  return (
    <div className="min-h-screen bg-[#080a14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  i < step ? "bg-[#FF6524] text-white" :
                  i === step ? "bg-[rgba(255,101,36,0.2)] border-2 border-[#FF6524] text-[#FF8B5E]" :
                  "bg-[#111624] border border-white/10 text-[#374151]"
                }`}>
                  {i < step ? <CheckCircle size={13} /> : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-[#f1f5f9] font-medium" : "text-[#374151]"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px w-8 sm:w-16 mx-2 ${i < step ? "bg-[#FF6524]" : "bg-white/7"}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#111624] border border-white/7 rounded-2xl p-6 shadow-2xl">
          {/* Step 0 — Details */}
          {step === 0 && (
            <form onSubmit={handleStep0} className="space-y-4">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#f1f5f9]">Business Details</h2>
                    <p className="text-xs text-[#64748b]">Tell us about your business</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Business Name *</label>
                <input className={inputCls} placeholder="e.g. Kofi's Pharmacy" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Description</label>
                <textarea className={textareaCls} rows={3} placeholder="Briefly describe what your business does..." value={description} onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Business Phone</label>
                  <input type="tel" className={inputCls} placeholder="+233 20 000 0000" value={bizPhone} onChange={(e) => setBizPhone(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Business Email</label>
                  <input type="email" className={inputCls} placeholder="info@business.com" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={!name} className="w-full h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40">
                Continue <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Step 1 — Type */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Business Type</h2>
                <p className="text-xs text-[#64748b] mb-4">Select the type that best describes your business</p>
              </div>
              {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {BUSINESS_TYPES.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => { setBizType(value); setCategory(value); }}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                      bizType === value
                        ? "border-[#FF6524] bg-[rgba(255,101,36,0.1)] text-[#FF8B5E]"
                        : "border-white/7 bg-[#0d0f1a] text-[#64748b] hover:border-white/20 hover:text-[#94a3b8]"
                    }`}
                  >
                    <Icon size={20} />
                    <span className="text-[10px] font-medium leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(0)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 hover:text-[#94a3b8] flex items-center justify-center gap-2 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleStep1} className="flex-1 h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  Continue <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 — KYC */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Business Verification</h2>
                <p className="text-xs text-[#64748b] mb-4">Verify your business to unlock full features, payment processing, and trust badges.</p>
              </div>
              {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}

              {!skipKyc ? (
                <>
                  <div>
                    <label className="text-xs text-[#64748b] mb-1.5 block">Registration Number (optional)</label>
                    <input className={inputCls} placeholder="e.g. CS12345678" value={regNumber} onChange={(e) => setRegNumber(e.target.value)} />
                  </div>
                  <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-[rgba(255,101,36,0.3)] transition-colors cursor-pointer">
                    <Upload size={24} className="text-[#374151] mx-auto mb-2" />
                    <p className="text-sm text-[#64748b]">Upload Registration Document</p>
                    <p className="text-xs text-[#374151] mt-1">PDF, JPG, PNG — max 10MB</p>
                    <p className="text-xs text-[#FF8B5E] mt-2">Document upload available after setup</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSkipKyc(true)}
                    className="w-full text-xs text-[#374151] hover:text-[#64748b] py-1 transition-colors"
                  >
                    Skip for now — complete verification later
                  </button>
                </>
              ) : (
                <div className="p-4 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[rgba(245,158,11,0.05)]">
                  <p className="text-sm text-[#fbbf24] font-medium mb-1">You can verify later</p>
                  <p className="text-xs text-[#64748b]">Your business will be created immediately. Complete verification from Settings → KYC to unlock payments and trust badges.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 flex items-center justify-center gap-2 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleStep2} disabled={loading} className="flex-1 h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60 transition-all">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Creating...</> : <><span>Create Business</span><ArrowRight size={15} /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Done */}
          {step === 3 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#f1f5f9] mb-2">Business Created!</h2>
                <p className="text-sm text-[#64748b]">
                  <span className="text-[#FF8B5E] font-semibold">{name}</span> is live on KENUXA.
                  Your Business Owner role has been activated.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  { icon: Store, label: "Public Storefront", desc: "Your business page is live" },
                  { icon: ShoppingBag, label: "Marketplace", desc: "List & sell products" },
                  { icon: Briefcase, label: "CRM", desc: "Manage your customers" },
                  { icon: Zap, label: "POS System", desc: "Start processing sales" },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#0d0f1a] border border-white/7">
                    <Icon size={14} className="text-[#FF8B5E] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[#f1f5f9]">{label}</p>
                      <p className="text-[10px] text-[#374151]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm hover:border-white/20 hover:text-[#94a3b8] flex items-center justify-center gap-2 transition-all"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={() => bizId ? router.push(`/dashboard/profile?business=${bizId}`) : router.push("/dashboard/profile")}
                  className="flex-1 h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  Set Up Profile <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
