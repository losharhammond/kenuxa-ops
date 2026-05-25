'use client'

import { useState }     from 'react'
import { useRouter }    from 'next/navigation'
import Link             from 'next/link'
import { motion }       from 'framer-motion'
import { Brain, Mic, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast            from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()

  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password || !name.trim()) return
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setLoading(true)
    const supabase = createClient()
    if (!supabase) { toast.error('Supabase not configured — add .env.local'); setLoading(false); return }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) throw error
      setDone(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm text-center"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Check your email</h2>
          <p className="text-sm text-zinc-500 mb-6">
            We sent a confirmation link to <span className="text-zinc-300">{email}</span>.
            <br />Click it to activate your account.
          </p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-500 transition-all"
          >
            Back to sign in
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center px-4">

      {/* Back link */}
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
            <Brain className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-xl font-black text-white tracking-widest">KENUXA OPS</h1>
          <p className="text-xs text-zinc-600 mt-1">Create your operations account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-white mb-5">Get started</h2>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                  placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-200
                  placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 pr-10 text-sm text-zinc-200
                    placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Strength hint */}
              {password.length > 0 && (
                <div className="mt-1.5 flex gap-1">
                  {[4, 6, 8, 10].map((min, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-0.5 rounded transition-all ${
                        password.length >= min
                          ? i < 2 ? 'bg-red-500' : i < 3 ? 'bg-amber-500' : 'bg-emerald-500'
                          : 'bg-zinc-800'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Terms notice */}
            <p className="text-[10px] text-zinc-700 leading-relaxed">
              By creating an account you agree to KENUXA's Terms of Service and Privacy Policy.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password || !name}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white
                hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : <><Mic className="w-4 h-4" /> Start Operating</>
              }
            </button>
          </form>
        </div>

        {/* Sign in link */}
        <p className="text-center text-xs text-zinc-600 mt-5">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
