'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const fd = new FormData(e.currentTarget)
    const email    = fd.get('email') as string
    const password = fd.get('password') as string
    const fullName = fd.get('fullName') as string

    const supabase = createClient()
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, academy_role: 'learner' },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    // Check if email confirmation is needed
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/dashboard')
    } else {
      router.push('/auth/login?message=check-email')
    }
  }

  return (
    <main style={pageStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <span style={badge}>KENUXA ACADEMY</span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.75rem' }}>Create Your Account</h1>
          <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.3rem' }}>
            Already on KENUXA Network? Use the same email and password.
          </p>
        </div>

        <label style={labelStyle}>
          Full Name
          <input name="fullName" required style={inputStyle} placeholder="Your full name" />
        </label>
        <label style={labelStyle}>
          Email
          <input name="email" type="email" required style={inputStyle} placeholder="you@example.com" />
        </label>
        <label style={labelStyle}>
          Password
          <input name="password" type="password" required minLength={8} style={inputStyle} placeholder="Min 8 characters" />
        </label>

        {error && <p style={errorStyle}>{error}</p>}

        <button type="submit" disabled={loading} style={btnStyle('#2563eb')}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#888' }}>
          Already have an account?{' '}
          <a href="/auth/login" style={{ color: '#60a5fa' }}>Sign in</a>
        </p>
      </form>
    </main>
  )
}

const pageStyle: React.CSSProperties = { display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '1rem' }
const formStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '420px', padding: '2rem', background: '#111', borderRadius: '12px', border: '1px solid #222' }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: '#ccc' }
const inputStyle: React.CSSProperties = { padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #333', background: '#1a1a1a', color: '#f0f0f0', fontSize: '1rem' }
const errorStyle: React.CSSProperties = { color: '#f87171', fontSize: '0.875rem', background: '#1f0000', padding: '0.5rem 0.75rem', borderRadius: '6px' }
const badge: React.CSSProperties = { background: '#1d4ed8', color: '#bfdbfe', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
function btnStyle(bg: string): React.CSSProperties {
  return { padding: '0.7rem', background: bg, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }
}
