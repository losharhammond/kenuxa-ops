"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // Supabase sends the recovery token in the URL hash; the client SDK handles it
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {});
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    setError("");

    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    }
  };

  const inputCls = "w-full bg-[#111624] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#FF6524] transition-colors placeholder-[#374151]";

  return (
    <div className="w-full max-w-sm mx-auto animate-slide-up">
      <div className="bg-[#111624] border border-white/7 rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FF6524] to-[#F59E0B] flex items-center justify-center text-white font-black text-xl mx-auto mb-6">
          K
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle size={40} className="text-[#22c55e] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-[#f1f5f9] mb-2">Password updated</h1>
            <p className="text-sm text-[#64748b]">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-[#f1f5f9] mb-1 text-center">Set new password</h1>
            <p className="text-sm text-[#64748b] mb-6 text-center">
              Choose a strong password for your KENUXA account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">New Password</label>
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

              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Confirm Password</label>
                <input
                  type="password"
                  className={inputCls}
                  placeholder="Re-enter your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
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
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
