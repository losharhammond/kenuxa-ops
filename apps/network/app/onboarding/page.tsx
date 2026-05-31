"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { User, Building2, ClipboardList, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

const STEPS = [
  { id: 1, label: "Account",  Icon: User },
  { id: 2, label: "Business", Icon: Building2 },
  { id: 3, label: "Details",  Icon: ClipboardList },
  { id: 4, label: "Done",     Icon: CheckCircle2 },
];

const BUSINESS_TYPES = [
  "Retail & Shop", "Food & Restaurant", "Pharmacy", "Professional Services",
  "Technology", "Construction", "Transport & Logistics", "Agriculture",
  "Finance & Insurance", "Beauty & Wellness", "Hospitality", "Education", "Other",
];

const CITIES = ["Accra", "Kumasi", "Takoradi", "Tamale", "Cape Coast", "Sunyani", "Ho", "Koforidua", "Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "", email: "", password: "",
    businessName: "", businessType: "", phone: "",
    city: "", address: "", description: "",
  });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    if (error) setError("");
  }

  async function handleNext() {
    setError("");

    if (step === 1) {
      if (!form.fullName || !form.email || !form.password) {
        setError("Please fill in all fields.");
        return;
      }
      if (form.password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
    }

    if (step === 2) {
      if (!form.businessName || !form.businessType || !form.phone) {
        setError("Please fill in all fields.");
        return;
      }
    }

    if (step < 3) {
      setStep((s) => s + 1);
      return;
    }

    // Step 3 — submit
    if (!form.city) {
      setError("Please select your city.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // 1. Sign up
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            phone: form.phone,
          },
        },
      });
      if (authErr) { setError(authErr.message); setLoading(false); return; }

      const userId = authData.user?.id;
      if (!userId) { setError("Registration failed. Please try again."); setLoading(false); return; }

      // 2. Create business record
      const { error: bizErr } = await supabase.from("businesses").insert({
        name: form.businessName,
        business_type: form.businessType,
        phone: form.phone,
        city: form.city,
        address: form.address,
        description: form.description,
        owner_id: userId,
        status: "active",
        verification_status: "unverified",
      });
      if (bizErr) { setError(bizErr.message); setLoading(false); return; }

      setStep(4);
      setTimeout(() => router.push("/dashboard"), 2500);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#07080f] grid-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,101,36,0.12)_0%,transparent_70%)]" />

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black">K</div>
            <span className="font-bold text-[#f1f5f9] text-lg">KENUXA</span>
          </Link>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.id < step ? CheckCircle2 : s.Icon;
            return (
              <div key={s.id} className="flex items-center">
                <div className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  step === s.id
                    ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] border border-[rgba(255,101,36,0.3)]"
                    : s.id < step
                    ? "text-[#34d399]"
                    : "text-[#374151]"
                )}>
                  <Icon size={13} />
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn("w-8 h-px mx-1", step > s.id ? "bg-[#34d399]" : "bg-white/10")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl p-6 shadow-[0_24px_64px_rgba(0,0,0,0.4)]">

          {/* Step 1 — Account */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[#f1f5f9]">Create your account</h2>
                <p className="text-sm text-[#64748b] mt-1">Free forever. No credit card required.</p>
              </div>
              <Input label="Full Name" placeholder="Kwame Mensah" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
              <Input label="Email Address" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => set("email", e.target.value)} />
              <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={(e) => set("password", e.target.value)} />
              <p className="text-xs text-[#374151]">
                By continuing you agree to our{" "}
                <Link href="/terms" className="text-[#FF8B5E] hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-[#FF8B5E] hover:underline">Privacy Policy</Link>.
              </p>
            </div>
          )}

          {/* Step 2 — Business */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[#f1f5f9]">Tell us about your business</h2>
                <p className="text-sm text-[#64748b] mt-1">This helps us personalise your experience.</p>
              </div>
              <Input label="Business Name" placeholder="Medcare Pharmacy" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
              <Select label="Business Type" value={form.businessType} onChange={(e) => set("businessType", e.target.value)}>
                <option value="">Select a type...</option>
                {BUSINESS_TYPES.map((t) => <option key={t}>{t}</option>)}
              </Select>
              <Input label="Business Phone" placeholder="+233 24 000 0000" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          )}

          {/* Step 3 — Details */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="mb-5">
                <h2 className="text-xl font-bold text-[#f1f5f9]">Location &amp; description</h2>
                <p className="text-sm text-[#64748b] mt-1">Help customers find and understand your business.</p>
              </div>
              <Select label="City" value={form.city} onChange={(e) => set("city", e.target.value)}>
                <option value="">Select your city...</option>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
              <Input label="Address" placeholder="Street, neighbourhood..." value={form.address} onChange={(e) => set("address", e.target.value)} />
              <div>
                <label className="text-xs font-medium text-[#94a3b8] block mb-1.5">Brief Description</label>
                <textarea
                  rows={3}
                  placeholder="What does your business do? What makes it special?"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  className="w-full bg-[#07080f] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f1f5f9] placeholder:text-[#374151] outline-none focus:border-[rgba(255,101,36,0.5)] resize-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Step 4 — Done */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)] flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={32} className="text-[#34d399]" />
              </div>
              <h2 className="text-xl font-bold text-[#f1f5f9] mb-2">Welcome to KENUXA!</h2>
              <p className="text-sm text-[#64748b] mb-6">
                <span className="text-[#f1f5f9] font-medium">{form.businessName || "Your business"}</span> is being set up. Redirecting to your dashboard...
              </p>
              <div className="bg-[#111624] border border-white/7 rounded-xl p-4 text-left space-y-2 mb-6">
                {[
                  "Business profile created",
                  "Inventory module ready",
                  "POS terminal activated",
                  "AI assistant enabled",
                ].map((s) => (
                  <div key={s} className="flex items-center gap-2 text-sm text-[#34d399]">
                    <CheckCircle2 size={14} />
                    {s}
                  </div>
                ))}
              </div>
              <Link href="/dashboard">
                <Button size="lg" className="w-full gap-2">
                  Go to Dashboard
                  <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="mt-3 text-xs text-[#f87171] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Nav buttons */}
          {step < 4 && (
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/7">
              {step > 1 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep((s) => s - 1)} className="gap-1.5">
                  <ArrowLeft size={13} /> Back
                </Button>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="sm">Already have an account?</Button>
                </Link>
              )}
              <Button onClick={handleNext} loading={loading} className="gap-1.5">
                {step === 3 ? "Create Account" : "Continue"}
                <ArrowRight size={13} />
              </Button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {step < 4 && (
          <div className="mt-4 h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-full transition-all duration-500"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
