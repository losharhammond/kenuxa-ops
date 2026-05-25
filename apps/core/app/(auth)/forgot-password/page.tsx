"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: { message?: string } };
      if (!res.ok) { setError(data.error?.message ?? "Request failed"); return; }
      setSent(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a]/80 backdrop-blur-2xl p-8 shadow-2xl shadow-black/50">
      {sent ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
              <Mail className="h-6 w-6 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Check your email</h2>
          <p className="mt-2 text-[13px] text-[#64748b] max-w-xs mx-auto">
            We sent a password reset link to <span className="text-white font-medium">{email}</span>
          </p>
          <p className="mt-4 text-[12px] text-[#374151]">
            Didn&apos;t receive it?{" "}
            <button onClick={() => setSent(false)} className="text-violet-400 hover:text-violet-300 transition-colors">Resend</button>
          </p>
          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-[#374151] hover:text-slate-400 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </motion.div>
      ) : (
        <>
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20">
                <CheckCircle2 className="h-5 w-5 text-violet-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Reset password</h1>
            <p className="mt-1.5 text-[13px] text-[#64748b]">Enter your email to receive a reset link</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-[12px] text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Email address</label>
              <input
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-violet-600 disabled:opacity-60 transition-all">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Send reset link</span><ArrowRight className="h-3.5 w-3.5" /></>}
            </button>
          </form>

          <Link href="/login" className="mt-6 flex items-center justify-center gap-1.5 text-[12px] text-[#374151] hover:text-slate-400 transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        </>
      )}
    </div>
  );
}
