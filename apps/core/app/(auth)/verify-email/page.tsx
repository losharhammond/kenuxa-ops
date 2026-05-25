"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Mail, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a]/80 backdrop-blur-2xl p-10 shadow-2xl shadow-black/50 text-center">
      <motion.div
        className="mb-6 flex justify-center"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20 shadow-lg shadow-violet-500/10">
          <Mail className="h-7 w-7 text-violet-400" />
        </div>
      </motion.div>

      <h1 className="text-2xl font-bold text-white tracking-tight">Verify your email</h1>
      <p className="mt-3 text-[13px] text-[#64748b] max-w-sm mx-auto leading-relaxed">
        We sent a verification link to your email address. Check your inbox and click the link to activate your account.
      </p>

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left space-y-2">
        {["Check your spam or junk folder", "The link expires in 24 hours", "Click the link once to verify"].map((tip, i) => (
          <div key={i} className="flex items-center gap-2.5 text-[12px] text-[#374151]">
            <div className="h-1 w-1 rounded-full bg-violet-500/60" />
            <span>{tip}</span>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 text-[13px] font-medium text-slate-300 hover:bg-white/[0.06] transition-all"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Resend verification email
      </button>

      <p className="mt-4 text-[12px] text-[#374151]">
        Wrong email?{" "}
        <Link href="/signup" className="text-violet-400 hover:text-violet-300 transition-colors">Go back</Link>
      </p>
    </div>
  );
}
