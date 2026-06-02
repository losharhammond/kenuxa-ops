'use client'

import { useState, useEffect, useCallback } from 'react'
import { walletClient, type WalletBalance, type WalletTransaction } from '@/lib/wallet-client'

// ─── Relative time helper ────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'Yesterday' : `${d} days ago`
}

export default function WalletClient() {
  const [wallet, setWallet]         = useState<WalletBalance | null>(null)
  const [txs, setTxs]               = useState<WalletTransaction[]>([])
  const [filter, setFilter]         = useState<'all' | 'credit' | 'debit'>('all')
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Send modal state
  const [showSend, setShowSend]       = useState(false)
  const [sendTo, setSendTo]           = useState('')
  const [sendAmount, setSendAmount]   = useState('')
  const [sendNote, setSendNote]       = useState('')
  const [sending, setSending]         = useState(false)
  const [sendError, setSendError]     = useState('')
  const [sendSuccess, setSendSuccess] = useState(false)

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    else setRefreshing(true)
    try {
      const [bal, transactions] = await Promise.all([
        walletClient.getBalance(),
        walletClient.getTransactions(20, 0, filter === 'all' ? undefined : filter),
      ])
      setWallet(bal)
      setTxs(transactions)
    } catch { /* silently fail on refresh */ }
    setLoading(false)
    setRefreshing(false)
  }, [filter])

  useEffect(() => { void load() }, [load])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    setSendError('')
    try {
      await walletClient.transfer(sendTo, parseFloat(sendAmount), sendNote || undefined)
      setSendSuccess(true)
      void load(true)
      setTimeout(() => { setShowSend(false); setSendSuccess(false); setSendTo(''); setSendAmount(''); setSendNote('') }, 2000)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Transfer failed')
    }
    setSending(false)
  }

  if (loading) return (
    <div style={shell}>
      <div style={header}><span style={logoBadge}>WALLET</span></div>
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh', color: '#555' }}>Loading wallet…</div>
    </div>
  )

  return (
    <div style={shell}>
      {/* Header */}
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="/dashboard" style={{ color: '#555', textDecoration: 'none', fontSize: '0.875rem' }}>← Dashboard</a>
          <span style={logoBadge}>KENUX WALLET</span>
        </div>
        <button onClick={() => load(true)} disabled={refreshing} style={ghostBtn}>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <main style={content}>
        {/* Balance card */}
        <div style={balanceCard}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Available Balance
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: '#f0f0f0', marginTop: '0.5rem', lineHeight: 1 }}>
            GH₵ {(wallet?.balance ?? 0).toFixed(2)}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            {wallet?.currency ?? 'GHS'} · {wallet?.status ?? 'active'}
          </div>

          {/* KENUX points */}
          <div style={kenuxBadge}>
            <span style={{ color: '#facc15', fontWeight: 700 }}>{(wallet?.kenuxPoints ?? 0).toLocaleString()}</span>
            <span style={{ color: '#a16207', marginLeft: '0.4rem', fontSize: '0.75rem' }}>KENUX points</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowSend(true)} style={actionBtn('#2563eb')}>Send</button>
            <a href="http://localhost:3002/dashboard/wallet" target="_blank" rel="noreferrer" style={actionBtn('#374151') as React.AnchorHTMLAttributes<HTMLAnchorElement>['style']}>
              Top Up on Network ↗
            </a>
          </div>

          <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#374151' }}>
            This is your shared KENUXA wallet — same balance across Network and Academy.
          </p>
        </div>

        {/* Transaction history */}
        <div style={{ ...sectionCard, marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#aaa' }}>Transaction History</h2>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {(['all', 'credit', 'debit'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} style={filterBtn(filter === f)}>
                  {f === 'all' ? 'All' : f === 'credit' ? 'Received' : 'Sent'}
                </button>
              ))}
            </div>
          </div>

          {txs.length === 0 ? (
            <p style={{ color: '#555', textAlign: 'center', padding: '2rem 0', fontSize: '0.875rem' }}>
              No transactions yet. Transactions from KENUXA Network will appear here too.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {txs.map((tx) => (
                <div key={tx.id} style={txRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={txIcon(tx.type)}>
                      {tx.type === 'credit' ? '↓' : '↑'}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#ccc' }}>{tx.description}</div>
                      <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.1rem' }}>
                        {relTime(tx.created_at)} · {tx.reference ?? ''}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: tx.type === 'credit' ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
                    {tx.type === 'credit' ? '+' : '−'} GH₵ {tx.amount.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-app note */}
        <div style={crossAppNote}>
          🔗 Your KENUX wallet is shared across all KENUXA products. Top up, send, or view history from{' '}
          <a href="http://localhost:3002/dashboard/wallet" target="_blank" rel="noreferrer" style={{ color: '#f97316', fontWeight: 600 }}>
            KENUXA Network
          </a>
          {' '}and the changes appear here instantly.
        </div>
      </main>

      {/* Send modal */}
      {showSend && (
        <div style={overlay}>
          <div style={modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Send Money</h2>
              <button onClick={() => { setShowSend(false); setSendError('') }} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.25rem' }}>✕</button>
            </div>

            {sendSuccess ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: '2rem' }}>✅</div>
                <p style={{ color: '#4ade80', marginTop: '0.5rem' }}>Transfer successful!</p>
              </div>
            ) : (
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label style={labelStyle}>
                  Recipient Email
                  <input value={sendTo} onChange={(e) => setSendTo(e.target.value)} type="email" required style={inputStyle} placeholder="recipient@example.com" />
                </label>
                <label style={labelStyle}>
                  Amount (GH₵)
                  <input value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} type="number" step="0.01" min="0.01" max={wallet?.balance} required style={inputStyle} placeholder="0.00" />
                  <span style={{ fontSize: '0.75rem', color: '#555' }}>Available: GH₵ {(wallet?.balance ?? 0).toFixed(2)}</span>
                </label>
                <label style={labelStyle}>
                  Note (optional)
                  <input value={sendNote} onChange={(e) => setSendNote(e.target.value)} style={inputStyle} placeholder="What's this for?" />
                </label>
                {sendError && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{sendError}</p>}
                <button type="submit" disabled={sending} style={actionBtn('#2563eb') as React.ButtonHTMLAttributes<HTMLButtonElement>['style']}>
                  {sending ? 'Sending…' : 'Send'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────

const shell: React.CSSProperties        = { minHeight: '100vh', background: '#0a0a0a' }
const header: React.CSSProperties       = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' }
const content: React.CSSProperties      = { maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }
const logoBadge: React.CSSProperties    = { background: '#1d4ed8', color: '#bfdbfe', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }
const ghostBtn: React.CSSProperties     = { background: 'none', border: '1px solid #333', color: '#888', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem' }

const balanceCard: React.CSSProperties  = { background: 'linear-gradient(135deg, #0c1421 0%, #0f1f35 100%)', border: '1px solid #1e3a5f', borderRadius: '16px', padding: '2rem' }
const sectionCard: React.CSSProperties  = { background: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '1.5rem' }

const kenuxBadge: React.CSSProperties   = { display: 'inline-flex', alignItems: 'center', background: '#1a0f00', border: '1px solid #451a03', borderRadius: '8px', padding: '0.4rem 0.75rem', marginTop: '1rem' }
const crossAppNote: React.CSSProperties = { marginTop: '1.5rem', padding: '0.875rem 1.25rem', background: '#1a0f00', border: '1px solid #451a03', borderRadius: '8px', color: '#a16207', fontSize: '0.8rem' }

const txRow: React.CSSProperties        = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#161616', borderRadius: '8px' }
const labelStyle: React.CSSProperties   = { display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.875rem', color: '#ccc' }
const inputStyle: React.CSSProperties   = { padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #333', background: '#1a1a1a', color: '#f0f0f0', fontSize: '1rem' }

const overlay: React.CSSProperties      = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'grid', placeItems: 'center', zIndex: 50 }
const modal: React.CSSProperties        = { background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1.75rem', width: '100%', maxWidth: '420px' }

function actionBtn(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', textDecoration: 'none', display: 'inline-block' }
}
function txIcon(type: 'credit' | 'debit'): React.CSSProperties {
  return { width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: type === 'credit' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', color: type === 'credit' ? '#4ade80' : '#f87171', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }
}
function filterBtn(active: boolean): React.CSSProperties {
  return { padding: '0.25rem 0.6rem', borderRadius: '6px', border: '1px solid #333', background: active ? '#1d4ed8' : 'transparent', color: active ? '#bfdbfe' : '#666', cursor: 'pointer', fontSize: '0.75rem' }
}
