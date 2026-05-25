"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

const REQUIREMENTS = [
  { label: "At least 8 characters", test: (pw: string) => pw.length >= 8 },
  { label: "One uppercase letter",  test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "One number",            test: (pw: string) => /[0-9]/.test(pw) },
];

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [orgName,  setOrgName]  = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);
  const [step,     setStep]     = useState<1 | 2>(1);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName, organizationName: orgName }),
      });
      const data = await res.json() as { data?: { accessToken?: string }; error?: { message?: string } };

      if (!res.ok) {
        setError(data.error?.message ?? "Signup failed. Please try again.");
        return;
      }

      if (data.data?.accessToken) {
        localStorage.setItem("kenuxa_token", data.data.accessToken);
        setSuccess(true);
        setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-10 text-center"
      >
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white">Account created!</h2>
        <p className="mt-2 text-[13px] text-[#64748b]">Redirecting you to the dashboard…</p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a]/80 backdrop-blur-2xl p-8 shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-[13px] text-[#64748b]">Join the KENUXA intelligence ecosystem</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-all ${step >= s ? "bg-violet-600 text-white" : "bg-white/[0.05] text-[#374151]"}`}>
              {s}
            </div>
            {s < 2 && <div className={`h-px w-8 transition-all ${step > s ? "bg-violet-600" : "bg-white/[0.08]"}`} />}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3"
        >
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 text-red-400 shrink-0" />
          <p className="text-[12px] text-red-400">{error}</p>
        </motion.div>
      )}

      <form onSubmit={step === 1 ? (e) => { e.preventDefault(); setStep(2); } : handleSignup} className="space-y-4">
        {step === 1 ? (
          <>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Full Name</label>
              <input
                type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Alex Johnson"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Email</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Organization <span className="text-[#374151] normal-case">(optional)</span></label>
              <input
                type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"} required value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 pr-11 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#374151] hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password requirements */}
              {password && (
                <div className="mt-2.5 space-y-1.5">
                  {REQUIREMENTS.map(r => {
                    const ok = r.test(password);
                    return (
                      <div key={r.label} className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full transition-colors ${ok ? "bg-emerald-400" : "bg-[#374151]"}`} />
                        <span className={`text-[11px] transition-colors ${ok ? "text-emerald-400" : "text-[#374151]"}`}>{r.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-[12px] text-[#64748b]">
              You&apos;ll receive <span className="font-semibold text-violet-400">100 KENUX</span> as a welcome bonus immediately after signup.
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-violet-600 disabled:opacity-60 transition-all"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {step === 1 ? "Continue" : "Create account"}
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>

        {step === 2 && (
          <button type="button" onClick={() => setStep(1)} className="w-full text-center text-[12px] text-[#374151] hover:text-slate-400 transition-colors">
            ← Back
          </button>
        )}
      </form>

      <p className="mt-6 text-center text-[12px] text-[#374151]">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">Sign in</Link>
      </p>

      <p className="mt-3 text-center text-[11px] text-[#374151]">
        By signing up, you agree to our{" "}
        <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
        {" & "}
        <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
      </p>
    </div>
  );
}
