'use client'

import { useState }         from 'react'
import { useRouter }        from 'next/navigation'
import Link                 from 'next/link'
import { motion }           from 'framer-motion'
import { Brain, Mic, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { createClient }     from '@/lib/supabase/client'
import toast                from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return

    setLoading(true)
    const supabase = createClient()
    if (!supabase) { toast.error('Supabase not configured — add .env.local'); setLoading(false); return }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
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
          <p className="text-xs text-zinc-600 mt-1">Sign in to your operations center</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-semibold text-white mb-5">Welcome back</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1.5">Email</label>
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
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white
                hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
                : <><Mic className="w-4 h-4" /> Sign In</>
              }
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-[10px] text-zinc-700">OR</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* Magic link */}
          <button
            onClick={async () => {
              if (!email.trim()) { toast.error('Enter your email first'); return }
              setLoading(true)
              const supabase = createClient()
              if (!supabase) { toast.error('Supabase not configured'); setLoading(false); return }
              const { error } = await supabase.auth.signInWithOtp({ email })
              setLoading(false)
              if (error) toast.error(error.message)
              else toast.success('Magic link sent — check your inbox')
            }}
            disabled={loading}
            className="w-full py-2.5 rounded-xl border border-zinc-700 text-sm text-zinc-400
              hover:text-white hover:border-zinc-600 disabled:opacity-50 transition-all"
          >
            Send magic link
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-center text-xs text-zinc-600 mt-5">
          New to KENUXA OPS?{' '}
          <Link href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
