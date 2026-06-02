'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AcademyProfile, IdentityState } from '@kenuxa/shared-types'

interface WalletSummary {
  balance:     number
  currency:    string
  kenuxPoints: number
}

interface Props {
  user:          { id: string; email: string; fullName?: string }
  profile:       AcademyProfile | null
  identityState: IdentityState | null
  wallet:        WalletSummary | null
}

const DIMENSIONS = [
  { key: 'cognitiveScore',  label: 'Cognitive',  color: '#818cf8' },
  { key: 'creativeScore',   label: 'Creative',   color: '#f472b6' },
  { key: 'socialScore',     label: 'Social',     color: '#34d399' },
  { key: 'emotionalScore',  label: 'Emotional',  color: '#fb923c' },
  { key: 'practicalScore',  label: 'Practical',  color: '#60a5fa' },
  { key: 'leadershipScore', label: 'Leadership', color: '#a78bfa' },
  { key: 'economicScore',   label: 'Economic',   color: '#facc15' },
] as const

export default function DashboardClient({ user, profile, identityState, wallet }: Props) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = profile?.fullName ?? user.fullName ?? user.email.split('@')[0]

  return (
    <div style={shell}>
      {/* Header */}
      <header style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={logoBadge}>ACADEMY</span>
          <span style={{ color: '#555', fontSize: '0.875rem' }}>Human Development OS</span>
        </div>
        <nav style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <a href="/dashboard/wallet" style={navLink}>Wallet</a>
          <button onClick={handleSignOut} style={signOutBtn}>Sign Out</button>
        </nav>
      </header>

      <main style={contentStyle}>
        {/* User identity banner */}
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
            {/* Profile info */}
            <div style={{ flex: 1, minWidth: 200 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{displayName}</h2>
              <p style={{ color: '#555', fontSize: '0.875rem', marginTop: '0.25rem' }}>{user.email}</p>
              {profile?.bio && (
                <p style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.5 }}>{profile.bio}</p>
              )}
              {profile?.location && (
                <p style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.3rem' }}>📍 {profile.location}</p>
              )}
              {profile?.interests && profile.interests.length > 0 && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  {profile.interests.map((i) => <span key={i} style={tag}>{i}</span>)}
                </div>
              )}
            </div>

            {/* Wallet widget */}
            {wallet && (
              <a href="/dashboard/wallet" style={walletWidget}>
                <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>KENUX Wallet</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f0f0f0', marginTop: '0.3rem' }}>
                  GH₵ {wallet.balance.toFixed(2)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#facc15' }}>{wallet.kenuxPoints.toLocaleString()}</span>
                  <span style={{ fontSize: '0.65rem', color: '#a16207' }}>KENUX pts</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#1d4ed8', marginTop: '0.6rem', fontWeight: 600 }}>View wallet →</div>
              </a>
            )}
          </div>
        </section>

        {/* Identity scores */}
        <section style={{ ...card, marginTop: '1rem' }}>
          <h3 style={sectionTitle}>Human Development Scores</h3>
          <p style={{ color: '#444', fontSize: '0.8rem', marginBottom: '1rem', lineHeight: 1.5 }}>
            Seven dimensions of your human development. Scores grow through learning journeys, assessments, and real-world activities.
          </p>
          <div style={scoreGrid}>
            {DIMENSIONS.map(({ key, label, color }) => {
              const value = identityState?.[key] ?? 0
              return (
                <div key={key} style={scoreCard}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color }}>{value}</div>
                  <div style={{ width: '100%', height: '4px', background: '#1a1a1a', borderRadius: '2px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.4rem' }}>{label}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Goals */}
        {profile?.goals && profile.goals.length > 0 && (
          <section style={{ ...card, marginTop: '1rem' }}>
            <h3 style={sectionTitle}>Goals</h3>
            <ul style={{ color: '#aaa', fontSize: '0.875rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {profile.goals.map((g) => <li key={g}>{g}</li>)}
            </ul>
          </section>
        )}

        {/* Cross-app banner */}
        <div style={crossAppBanner}>
          🔗 Your <strong>KENUXA Network</strong> account is linked — same wallet, same credentials.{' '}
          <a href="http://localhost:3002/dashboard" target="_blank" rel="noreferrer" style={{ color: '#f97316', fontWeight: 600 }}>
            Open Network ↗
          </a>
          {'  '}
          <a href="/dashboard/wallet" style={{ color: '#60a5fa', fontWeight: 600 }}>
            Open Wallet →
          </a>
        </div>
      </main>
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────

const shell: React.CSSProperties        = { minHeight: '100vh', background: '#0a0a0a' }
const header: React.CSSProperties       = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: '#0a0a0a', zIndex: 10 }
const contentStyle: React.CSSProperties = { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }
const card: React.CSSProperties         = { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '1.5rem' }
const sectionTitle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }
const scoreGrid: React.CSSProperties    = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }
const scoreCard: React.CSSProperties    = { background: '#161616', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }
const tag: React.CSSProperties          = { background: '#1e2a3a', color: '#93c5fd', padding: '0.2rem 0.55rem', borderRadius: '999px', fontSize: '0.7rem' }
const logoBadge: React.CSSProperties    = { background: '#1d4ed8', color: '#bfdbfe', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }
const signOutBtn: React.CSSProperties   = { background: '#1a1a1a', color: '#888', border: '1px solid #333', borderRadius: '6px', padding: '0.35rem 0.9rem', cursor: 'pointer', fontSize: '0.8rem' }
const navLink: React.CSSProperties      = { color: '#888', textDecoration: 'none', fontSize: '0.875rem', padding: '0.35rem 0.7rem', borderRadius: '6px', border: '1px solid #222' }

const walletWidget: React.CSSProperties = {
  background: 'linear-gradient(135deg, #0c1421, #0f1f35)', border: '1px solid #1e3a5f',
  borderRadius: '12px', padding: '1.25rem 1.5rem', minWidth: '170px', textDecoration: 'none',
  cursor: 'pointer', transition: 'border-color 0.2s',
}
const crossAppBanner: React.CSSProperties = { marginTop: '1.5rem', padding: '0.875rem 1.25rem', background: '#1a0f00', border: '1px solid #451a03', borderRadius: '8px', color: '#a16207', fontSize: '0.8rem', lineHeight: 1.6 }
