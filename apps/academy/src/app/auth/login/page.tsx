'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/dashboard'
  const message    = searchParams.get('message')

  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const supabase = createClient()

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email:    fd.get('email') as string,
      password: fd.get('password') as string,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push(redirectTo)
    router.refresh()
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <span style={badge}>KENUXA ACADEMY</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.75rem' }}>Welcome Back</h1>
          <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.3rem' }}>
            Use your KENUXA Network credentials — same account, instant access.
          </p>
        </div>

        {message === 'check-email' && (
          <p style={{ color: '#86efac', background: '#052e16', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
            Check your email to confirm your account, then sign in.
          </p>
        )}

        <label style={labelStyle}>
          Email
          <input name="email" type="email" required style={inputStyle} placeholder="you@example.com" />
        </label>
        <label style={labelStyle}>
          Password
          <input name="password" type="password" required style={inputStyle} placeholder="Your password" />
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
          No account?{' '}
          <a href="/auth/register" style={{ color: '#60a5fa' }}>Create one</a>
        </p>
      </form>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

const pageStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1rem' }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '420px', padding: '2rem', background: '#111', borderRadius: '12px', border: '1px solid #222' }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: '#ccc' }
const inputStyle: React.CSSProperties = { padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #333', background: '#1a1a1a', color: '#f0f0f0', fontSize: '1rem' }
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', background: '#1f0000', padding: '0.5rem 0.75rem', borderRadius: '6px' }
const badge: React.CSSProperties = { background: '#1d4ed8', color: '#bfdbfe', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
const btnStyle: React.CSSProperties = { padding: '0.7rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }
