'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { AcademyProfile, IdentityState } from '@kenuxa/shared-types'

interface Props {
  user:          { id: string; email: string; fullName?: string }
  profile:       AcademyProfile | null
  identityState: IdentityState | null
  wallet:        { balance: number; currency: string } | null
}

const DIMENSIONS = [
  { key: 'cognitiveScore',  label: 'Cognitive'  },
  { key: 'creativeScore',   label: 'Creative'   },
  { key: 'socialScore',     label: 'Social'     },
  { key: 'emotionalScore',  label: 'Emotional'  },
  { key: 'practicalScore',  label: 'Practical'  },
  { key: 'leadershipScore', label: 'Leadership' },
  { key: 'economicScore',   label: 'Economic'   },
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
          <span style={{ color: '#aaa', fontSize: '0.875rem' }}>Human Development OS</span>
        </div>
        <button onClick={handleSignOut} style={signOutBtn}>Sign Out</button>
      </header>

      <main style={content}>
        {/* Identity banner */}
        <section style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{displayName}</h2>
              <p style={{ color: '#888', fontSize: '0.875rem', marginTop: '0.25rem' }}>{user.email}</p>
              {profile?.bio && <p style={{ color: '#aaa', marginTop: '0.5rem', fontSize: '0.875rem' }}>{profile.bio}</p>}
              {profile?.location && <p style={{ color: '#666', fontSize: '0.75rem', marginTop: '0.25rem' }}>📍 {profile.location}</p>}
            </div>
            {/* KENUX Wallet */}
            {wallet && (
              <div style={walletCard}>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>KENUX Balance</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#facc15', marginTop: '0.25rem' }}>
                  {wallet.balance.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>KENUX points</div>
                <a href="http://localhost:3002/dashboard/wallet" style={walletLink}>Open in Network ↗</a>
              </div>
            )}
          </div>
          {profile?.interests && profile.interests.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {profile.interests.map((i) => (
                <span key={i} style={tag}>{i}</span>
              ))}
            </div>
          )}
        </section>

        {/* Seven-dimension Identity State */}
        <section style={{ ...card, marginTop: '1rem' }}>
          <h3 style={sectionTitle}>Human Development Scores</h3>
          <p style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1rem' }}>
            Your seven cognitive + life dimensions. Scores start at 0 and grow through learning journeys.
          </p>
          <div style={scoreGrid}>
            {DIMENSIONS.map(({ key, label }) => {
              const value = identityState?.[key] ?? 0
              return (
                <div key={key} style={scoreCard}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: scoreColor(value) }}>{value}</div>
                  <div style={{ width: '100%', height: '4px', background: '#1a1a1a', borderRadius: '2px', marginTop: '0.5rem' }}>
                    <div style={{ width: `${value}%`, height: '100%', background: scoreColor(value), borderRadius: '2px', transition: 'width 0.5s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.4rem' }}>{label}</div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Goals + interests edit hint */}
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
          <span>🔗 Your KENUXA NETWORK account is linked. Access your wallet, marketplace, and business tools at</span>
          <a href="http://localhost:3002/dashboard" style={{ color: '#f97316', fontWeight: 600, marginLeft: '0.4rem' }}>
            KENUXA Network ↗
          </a>
        </div>
      </main>
    </div>
  )
}

function scoreColor(v: number): string {
  if (v >= 70) return '#4ade80'
  if (v >= 40) return '#facc15'
  return '#94a3b8'
}

const shell: React.CSSProperties   = { minHeight: '100vh', background: '#0a0a0a' }
const header: React.CSSProperties  = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' }
const content: React.CSSProperties = { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' }
const card: React.CSSProperties    = { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '1.5rem' }
const sectionTitle: React.CSSProperties = { fontSize: '0.875rem', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }
const scoreGrid: React.CSSProperties   = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '0.75rem' }
const scoreCard: React.CSSProperties   = { background: '#161616', borderRadius: '8px', padding: '0.875rem', textAlign: 'center' }
const tag: React.CSSProperties         = { background: '#1e2a3a', color: '#93c5fd', padding: '0.25rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem' }
const logoBadge: React.CSSProperties   = { background: '#1d4ed8', color: '#bfdbfe', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }
const signOutBtn: React.CSSProperties  = { background: '#1a1a1a', color: '#aaa', border: '1px solid #333', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.875rem' }
const walletCard: React.CSSProperties  = { background: '#0c1421', border: '1px solid #1e3a5f', borderRadius: '10px', padding: '1rem 1.25rem', minWidth: '150px', textAlign: 'center' }
const walletLink: React.CSSProperties  = { color: '#f59e0b', fontSize: '0.7rem', textDecoration: 'none', display: 'block', marginTop: '0.5rem' }
const crossAppBanner: React.CSSProperties = { marginTop: '1.5rem', padding: '0.875rem 1.25rem', background: '#1a0f00', border: '1px solid #451a03', borderRadius: '8px', color: '#a16207', fontSize: '0.8rem' }
