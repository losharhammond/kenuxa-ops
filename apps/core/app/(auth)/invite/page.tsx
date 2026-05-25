"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Users, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function InvitePage() {
  const [accepted, setAccepted] = useState(false);
  const [loading,  setLoading]  = useState(false);

  // In production, token would come from URL params
  const orgName = "KENUXA Demo Org";
  const inviterName = "Alex Johnson";
  const role = "Operator";

  async function handleAccept() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setAccepted(true);
    setLoading(false);
    setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0d0f1a]/80 backdrop-blur-2xl p-8 shadow-2xl shadow-black/50">
      {accepted ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/20">
              <CheckCircle2 className="h-7 w-7 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white">Welcome aboard!</h2>
          <p className="mt-2 text-[13px] text-[#64748b]">You&apos;ve joined <span className="text-white font-medium">{orgName}</span>. Redirecting…</p>
        </motion.div>
      ) : (
        <>
          <div className="mb-8 text-center">
            <div className="mb-4 flex justify-center">
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 border border-violet-500/20">
                <Users className="h-6 w-6 text-violet-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">You&apos;re invited</h1>
            <p className="mt-1.5 text-[13px] text-[#64748b]">
              <span className="text-white font-medium">{inviterName}</span> invited you to join
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
            <p className="text-center text-lg font-semibold text-white">{orgName}</p>
            <div className="mt-3 flex items-center justify-center">
              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold text-violet-400 uppercase tracking-widest">
                {role}
              </span>
            </div>
          </div>

          <div className="mb-6 space-y-2.5 text-[12px] text-[#374151]">
            {["Access organization workspace", "Collaborate with team members", "Use shared AI and automation"].map((perm, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500/70 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleAccept}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-violet-500/20 hover:from-violet-500 hover:to-violet-600 disabled:opacity-60 transition-all"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><span>Accept invitation</span><ArrowRight className="h-3.5 w-3.5" /></>}
          </button>

          <p className="mt-4 text-center text-[12px] text-[#374151]">
            Not expecting this?{" "}
            <Link href="/" className="text-violet-400 hover:text-violet-300 transition-colors">Ignore</Link>
          </p>
        </>
      )}
    </div>
  );
}
