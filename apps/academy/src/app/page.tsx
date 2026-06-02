export default function HomePage() {
  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', padding: '2rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '560px' }}>
        <span style={badge}>KENUXA ECOSYSTEM</span>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginTop: '1rem', lineHeight: 1.1 }}>
          KENUXA ACADEMY
        </h1>
        <p style={{ marginTop: '1rem', color: '#888', fontSize: '1.125rem', lineHeight: 1.6 }}>
          Human Development Operating System — build your cognitive, creative, social, emotional, practical, leadership, and economic dimensions.
        </p>

        <div style={networkNote}>
          <span style={{ color: '#f97316', fontWeight: 600 }}>KENUXA Network user?</span>{' '}
          Sign in with your existing credentials — same account, instant access.
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/auth/register" style={btn('#2563eb')}>Get Started — It&apos;s Free</a>
          <a href="/auth/login"    style={btn('#18181b')}>Sign In</a>
        </div>

        <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          {['Cognitive', 'Creative', 'Social', 'Emotional', 'Practical', 'Leadership', 'Economic'].map((d) => (
            <div key={d} style={dimensionCard}>{d}</div>
          ))}
        </div>
      </div>
    </main>
  )
}

const badge: React.CSSProperties       = { background: '#1d4ed8', color: '#bfdbfe', padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600 }
const networkNote: React.CSSProperties = { marginTop: '1.5rem', padding: '0.75rem 1rem', background: '#1a0f00', border: '1px solid #451a03', borderRadius: '8px', color: '#a16207', fontSize: '0.875rem' }
const dimensionCard: React.CSSProperties = { background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '0.75rem', fontSize: '0.8rem', color: '#888' }
function btn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', padding: '0.7rem 1.6rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, fontSize: '1rem', display: 'inline-block' }
}
