"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowRight, Eye, EyeOff,
  Briefcase, ShoppingBag, Zap, Users, Truck, Sparkles,
  CheckCircle, ChevronDown,
} from "lucide-react";

const WHAT_YOU_GET = [
  { icon: ShoppingBag, label: "Shop & discover",     desc: "Browse products, services & local businesses" },
  { icon: Briefcase,   label: "Find opportunities",  desc: "Jobs, freelance gigs & contracts" },
  { icon: Sparkles,    label: "AI assistant",         desc: "Personal economic intelligence copilot" },
  { icon: Zap,         label: "Earn rewards",         desc: "Points on every transaction" },
  { icon: Users,       label: "Business tools",       desc: "POS, CRM, inventory — activate anytime" },
  { icon: Truck,       label: "Sell & supply",        desc: "List products, accept orders, deliver" },
];

const COUNTRIES = [
  "Ghana", "Nigeria", "Kenya", "South Africa", "Tanzania", "Uganda", "Rwanda",
  "Ivory Coast", "Senegal", "Ethiopia", "Cameroon", "Zimbabwe", "Zambia",
  "United Kingdom", "United States", "Canada", "Germany", "France", "Other",
];

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");
  const [password, setPassword]   = useState("");
  const [country, setCountry]     = useState("");
  const [region, setRegion]       = useState("");
  const [city, setCity]           = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    setError("");

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          phone: phone || null,
          country: country || null,
          region: region || null,
          city: city || null,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
    } else {
      try { await fetch("/api/onboarding/provision", { method: "POST" }); } catch { /* non-blocking */ }
      router.push("/dashboard");
    }
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple" | "azure") => {
    setOauthLoading(provider);
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
  };

  const inputCls = "w-full bg-[#111624] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151]";
  const selectCls = `${inputCls} appearance-none cursor-pointer`;

  return (
    <div className="w-full max-w-5xl mx-auto animate-slide-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* Left — value prop */}
        <div className="hidden lg:block pt-4">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-lg">K</div>
            <span className="text-xl font-bold text-[#f1f5f9]">KENUXA</span>
          </div>
          <h2 className="text-3xl font-bold text-[#f1f5f9] leading-tight mb-3">
            One identity.<br />
            <span className="text-[#FF8B5E]">Unlimited roles.</span>
          </h2>
          <p className="text-[#64748b] text-sm mb-8 leading-relaxed">
            Create your KENUXA ID and participate in the economy as a customer,
            job seeker, freelancer, business owner, supplier — all with one account.
          </p>
          <div className="space-y-3">
            {WHAT_YOU_GET.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={14} className="text-[#FF8B5E]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[#f1f5f9]">{label}</p>
                  <p className="text-xs text-[#64748b]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-xl border border-[rgba(255,101,36,0.15)] bg-[rgba(255,101,36,0.05)]">
            <p className="text-xs text-[#FF8B5E] font-semibold mb-1">Your KENUXA ID includes:</p>
            <div className="grid grid-cols-2 gap-1">
              {["Digital Wallet", "Rewards Account", "Trust Score", "AI Assistant", "Economic Passport", "Activity Feed"].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-[#FF8B5E]" />
                  <span className="text-xs text-[#94a3b8]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div className="bg-[#111624] border border-white/7 rounded-2xl p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-[#f1f5f9] mb-1">Create your KENUXA ID</h1>
          <p className="text-sm text-[#64748b] mb-5">Free forever. No credit card required.</p>

          {/* OAuth providers */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { id: "google",   label: "Google",    logo: "G" },
              { id: "facebook", label: "Facebook",  logo: "f" },
              { id: "apple",    label: "Apple",     logo: "" },
              { id: "azure",    label: "Microsoft", logo: "M" },
            ].map(({ id, label, logo }) => (
              <button
                key={id}
                type="button"
                disabled={!!oauthLoading}
                onClick={() => handleOAuth(id as "google" | "facebook" | "apple" | "azure")}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-[#94a3b8] text-xs font-medium transition-all disabled:opacity-50"
              >
                <span className="font-bold text-sm">{logo}</span>
                <span>{oauthLoading === id ? "..." : label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/7" />
            <span className="text-xs text-[#374151]">or with email</span>
            <div className="flex-1 h-px bg-white/7" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">First Name *</label>
                <input className={inputCls} placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Last Name *</label>
                <input className={inputCls} placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#64748b] mb-1.5 block">Email Address *</label>
              <input type="email" className={inputCls} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="text-xs text-[#64748b] mb-1.5 block">Phone Number</label>
              <input type="tel" className={inputCls} placeholder="+233 20 000 0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            {/* Location */}
            <div className="grid grid-cols-3 gap-2">
              <div className="relative">
                <label className="text-xs text-[#64748b] mb-1.5 block">Country</label>
                <select className={selectCls} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Select</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-3 top-[34px] text-[#374151] pointer-events-none" />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Region</label>
                <input className={inputCls} placeholder="Greater Accra" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">City</label>
                <input className={inputCls} placeholder="Accra" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="text-xs text-[#64748b] mb-1.5 block">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className={`${inputCls} pr-10`}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-[#374151] hover:text-[#64748b]">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 mt-1"
            >
              {loading ? "Creating your KENUXA ID..." : <><span>Create KENUXA ID</span><ArrowRight size={15} /></>}
            </button>

            <p className="text-[10px] text-[#374151] text-center">
              By creating an account you agree to our{" "}
              <Link href="/terms" className="text-[#64748b] hover:text-[#FF8B5E]">Terms</Link> and{" "}
              <Link href="/privacy" className="text-[#64748b] hover:text-[#FF8B5E]">Privacy Policy</Link>.
            </p>
          </form>

          <p className="text-sm text-[#64748b] text-center mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-[#FF8B5E] hover:text-[#FF6524] font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
