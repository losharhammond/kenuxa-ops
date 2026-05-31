"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LogIn, Eye, EyeOff,
  ShoppingBag, Briefcase, Zap, Users, Truck, Sparkles,
} from "lucide-react";

const BENEFITS = [
  { icon: ShoppingBag, label: "Shop & Discover",    desc: "Browse products, services & local businesses" },
  { icon: Briefcase,   label: "Jobs & Freelance",   desc: "Find opportunities, post gigs, get hired" },
  { icon: Sparkles,    label: "AI Copilot",          desc: "Your personal economic intelligence assistant" },
  { icon: Zap,         label: "Earn Rewards",        desc: "Points on every transaction, redeemable anytime" },
  { icon: Users,       label: "Business Tools",      desc: "POS, CRM, inventory — activate when you need them" },
  { icon: Truck,       label: "Sell & Supply",       desc: "List products, accept orders, deliver" },
];

const OAUTH_PROVIDERS = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: "facebook",
    label: "Facebook",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  {
    id: "azure",
    label: "Microsoft",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="1" y="1" width="10" height="10" fill="#F25022"/>
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00"/>
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF"/>
        <rect x="13" y="13" width="10" height="10" fill="#FFB900"/>
      </svg>
    ),
  },
  {
    id: "apple",
    label: "Apple",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    ),
  },
];

function LoginForm() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const router  = useRouter();
  const params  = useSearchParams();
  const redirect = params.get("redirect") ?? "/dashboard";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirect);
    }
  };

  const handleOAuth = async (provider: string) => {
    setOauthLoading(provider);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as "google" | "facebook" | "azure" | "apple",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151]";

  return (
    <div className="min-h-screen bg-[#080a14] flex">
      {/* Left column — value prop */}
      <div className="hidden lg:flex w-1/2 flex-col justify-center px-16 bg-gradient-to-br from-[#0d0f1a] to-[#080a14] border-r border-white/5">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-xl shadow-[0_0_24px_rgba(255,101,36,0.35)]">K</div>
          <div>
            <div className="font-bold text-[#f1f5f9] text-lg tracking-tight">KENUXA</div>
            <div className="text-xs text-[#64748b]">Business Network</div>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-[#f1f5f9] leading-tight mb-2">
          Your economic identity.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF6524] to-[#F59E0B]">One platform.</span>
        </h2>
        <p className="text-[#64748b] text-sm mb-10 max-w-sm">
          One KENUXA ID gives you access to every role in the economy — customer, business owner, freelancer, job seeker, supplier, and more.
        </p>

        <div className="space-y-4">
          {BENEFITS.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[rgba(255,101,36,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon size={14} className="text-[#FF8B5E]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f1f5f9]">{label}</p>
                <p className="text-xs text-[#374151]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right column — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-base">K</div>
            <span className="font-bold text-[#f1f5f9]">KENUXA</span>
          </div>

          <h1 className="text-2xl font-bold text-[#f1f5f9] mb-1">Welcome back</h1>
          <p className="text-sm text-[#64748b] mb-7">Sign in to continue to your dashboard</p>

          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {OAUTH_PROVIDERS.map((p) => (
              <button key={p.id} onClick={() => handleOAuth(p.id)} disabled={!!oauthLoading}
                className="flex items-center justify-center gap-2 h-10 rounded-xl border border-white/10 bg-[#111624] text-[#94a3b8] hover:bg-white/5 hover:text-[#f1f5f9] transition-all text-xs font-medium disabled:opacity-50">
                {oauthLoading === p.id ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                ) : p.icon}
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/7" /></div>
            <div className="relative flex justify-center"><span className="bg-[#080a14] px-3 text-xs text-[#374151]">or sign in with email</span></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="text-xs text-[#64748b] mb-1.5 block">Email Address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="you@example.com" className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-[#64748b]">Password</label>
                <Link href="/forgot-password" className="text-xs text-[#FF8B5E] hover:underline">Forgot password?</Link>
              </div>
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="••••••••" className={`${inputCls} pr-10`} />
                <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                  className="absolute right-3 top-3 text-[#374151] hover:text-[#64748b] transition-colors">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#f87171] text-xs rounded-xl px-3.5 py-2.5">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-1">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><LogIn size={14} /> Sign In</>}
            </button>
          </form>

          <p className="text-center text-sm text-[#64748b] mt-6">
            New to KENUXA?{" "}
            <Link href="/register" className="text-[#FF8B5E] hover:underline font-medium">Create a free account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080a14] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#FF6524]/30 border-t-[#FF6524] rounded-full animate-spin" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
