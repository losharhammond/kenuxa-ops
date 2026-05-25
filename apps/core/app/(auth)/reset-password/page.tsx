"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CircuitBoard, Eye, EyeOff, CheckCircle2,
  Lock, ShieldCheck, ArrowRight,
} from "lucide-react";

/* ── strength indicator ────────────────────────────────────── */
function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map: Array<{ label: string; color: string }> = [
    { label: "", color: "" },
    { label: "Weak",      color: "bg-red-500"    },
    { label: "Fair",      color: "bg-amber-400"  },
    { label: "Good",      color: "bg-yellow-400" },
    { label: "Strong",    color: "bg-emerald"    },
    { label: "Very strong", color: "bg-emerald"  },
  ];
  return { score, ...map[score] };
}

const REQ = [
  { label: "At least 8 characters",                test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",                  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",                            test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$…)",         test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

/* ── inner form (needs useSearchParams) ────────────────────── */
function ResetForm() {
  const params    = useSearchParams();
  const _token    = params.get("token") ?? ""; // used by API call

  const [pw,      setPw]      = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const strength  = getStrength(pw);
  const allPass   = REQ.every(r => r.test(pw));
  const canSubmit = allPass && pw === confirm && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: _token, password: pw }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message ?? "Reset failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  /* ── success state ── */
  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 0.6 }}
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald/15 ring-1 ring-emerald/30"
        >
          <ShieldCheck className="h-8 w-8 text-emerald" />
        </motion.div>
        <h2 className="text-2xl font-bold text-white mb-2">Password updated</h2>
        <p className="text-[14px] text-[#64748b] mb-8 leading-relaxed">
          Your password has been securely reset. You can now sign in with your new credentials.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet to-indigo px-6 py-3 text-[14px] font-bold text-white shadow-glow-violet hover:opacity-90 transition-all"
        >
          Continue to login <ArrowRight className="h-4 w-4" />
        </Link>
      </motion.div>
    );
  }

  /* ── form state ── */
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/15 ring-1 ring-violet/30">
          <Lock className="h-6 w-6 text-violet-light" />
        </div>
        <h1 className="text-2xl font-bold text-white">Set new password</h1>
        <p className="mt-2 text-[14px] text-[#64748b]">
          Choose a strong password to secure your account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#94a3b8]">
            New password
          </label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={pw}
              onChange={e => setPw(e.target.value)}
              placeholder="Enter new password"
              required
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-11 text-[14px] text-white placeholder-[#374151] outline-none ring-0 transition-all focus:border-violet/50 focus:bg-white/[0.06]"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#374151] hover:text-slate-400 transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strength bar */}
          {pw && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
              <div className="flex gap-1 mb-1.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength.score ? strength.color : "bg-white/[0.06]"
                    }`}
                  />
                ))}
              </div>
              {strength.label && (
                <p className="text-[11px] text-[#64748b]">
                  Strength: <span className="font-medium text-white">{strength.label}</span>
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[#94a3b8]">
            Confirm password
          </label>
          <input
            type={showPw ? "text" : "password"}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            required
            className={`w-full rounded-xl border bg-white/[0.04] px-4 py-3 text-[14px] text-white placeholder-[#374151] outline-none ring-0 transition-all focus:bg-white/[0.06] ${
              confirm && pw !== confirm
                ? "border-red-500/50 focus:border-red-500/70"
                : confirm && pw === confirm
                ? "border-emerald/50 focus:border-emerald/60"
                : "border-white/[0.08] focus:border-violet/50"
            }`}
          />
          <AnimatePresence>
            {confirm && pw !== confirm && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-1.5 text-[11px] text-red-400"
              >
                Passwords do not match
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Requirements */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          {REQ.map(({ label, test }) => {
            const ok = test(pw);
            return (
              <div key={label} className="flex items-center gap-2">
                <CheckCircle2
                  className={`h-3.5 w-3.5 flex-shrink-0 transition-colors ${
                    ok ? "text-emerald" : "text-[#374151]"
                  }`}
                />
                <span className={`text-[11px] transition-colors ${ok ? "text-slate-300" : "text-[#374151]"}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[12px] text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-2xl bg-gradient-to-r from-violet to-indigo py-3 text-[14px] font-bold text-white shadow-glow-violet transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Updating…
            </span>
          ) : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-[12px] text-[#374151]">
        Remember it?{" "}
        <Link href="/login" className="font-medium text-violet-light hover:underline">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

/* ── page wrapper (suspense for useSearchParams) ───────────── */
export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-violet/30 border-t-violet" />}>
        <ResetForm />
      </Suspense>

      {/* Powered by */}
      <div className="mt-12 flex items-center gap-2 text-[11px] text-[#374151]">
        <CircuitBoard className="h-3.5 w-3.5" />
        <span>Secured by KENUXA CORE Authentication</span>
      </div>
    </div>
  );
}
