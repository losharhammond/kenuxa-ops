"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  };

  const inputCls = "w-full bg-[#111624] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151]";

  return (
    <div className="w-full max-w-sm mx-auto animate-slide-up">
      <div className="bg-[#111624] border border-white/7 rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-xl mx-auto mb-6">
          K
        </div>

        {sent ? (
          <div className="text-center">
            <CheckCircle size={40} className="text-[#22c55e] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#f1f5f9] mb-2">Check your inbox</h1>
            <p className="text-sm text-[#64748b] mb-6">
              We sent a password reset link to <span className="text-[#f1f5f9]">{email}</span>.
              The link expires in 1 hour.
            </p>
            <Link
              href="/login"
              className="text-sm text-[#FF8B5E] hover:text-[#FF6524] font-medium"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#f1f5f9] mb-1 text-center">Reset your password</h1>
            <p className="text-sm text-[#64748b] mb-6 text-center">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Email Address</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-3.5 text-[#374151]" />
                  <input
                    type="email"
                    className={`${inputCls} pl-9`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-[#FF6524] to-[#F59E0B] rounded-xl text-white font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition-opacity"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <Link
              href="/login"
              className="mt-5 flex items-center justify-center gap-1.5 text-xs text-[#64748b] hover:text-[#f1f5f9] transition-colors"
            >
              <ArrowLeft size={12} />
              Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
