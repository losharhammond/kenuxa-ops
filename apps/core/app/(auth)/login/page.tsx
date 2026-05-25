"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { data?: { accessToken?: string }; error?: { message?: string } };

      if (!res.ok) {
        setError(data.error?.message ?? "Invalid email or password");
        return;
      }

      if (data.data?.accessToken) {
        localStorage.setItem("kenuxa_token", data.data.accessToken);
        window.location.href = "/dashboard";
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a]/80 backdrop-blur-2xl p-8 shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
        <p className="mt-1.5 text-[13px] text-[#64748b]">Sign in to KENUXA CORE</p>
      </div>

      {/* OAuth buttons */}
      <div className="mb-6 grid grid-cols-2 gap-2.5">
        {[
          { label: "Continue with Google", icon: "G" },
          { label: "Continue with GitHub", icon: "⌥" },
        ].map(b => (
          <button
            key={b.label}
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 text-[12px] font-medium text-slate-300 hover:bg-white/[0.07] hover:border-white/[0.14] transition-all"
          >
            <span className="font-bold text-[13px]">{b.icon}</span>
            <span className="truncate">{b.label.replace("Continue with ", "")}</span>
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[11px] text-[#374151] font-medium">or continue with email</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
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

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-[11px] font-medium text-[#64748b] uppercase tracking-[0.08em]">Password</label>
            <Link href="/forgot-password" className="text-[11px] text-violet-400 hover:text-violet-300 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 pr-11 text-[13px] text-white placeholder-[#374151] outline-none focus:border-violet-500/50 focus:bg-white/[0.05] focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#374151] hover:text-slate-300 transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-violet-600 disabled:opacity-60 transition-all"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Sign in
              <ArrowRight className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] text-[#374151]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-violet-400 hover:text-violet-300 transition-colors">
          Create account
        </Link>
      </p>
    </div>
  );
}
