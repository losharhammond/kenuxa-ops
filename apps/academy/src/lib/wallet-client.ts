/**
 * Academy wallet client — calls Academy's own /api/wallet/* routes.
 * These routes query the SAME Supabase tables as KENUXA NETWORK,
 * so balance and transactions are identical across both platforms.
 */

export interface WalletBalance {
  balance:     number
  currency:    string
  status:      string
  kenuxPoints: number
}

export interface WalletTransaction {
  id:          string
  type:        'credit' | 'debit'
  amount:      number
  currency:    string
  description: string
  status:      string
  created_at:  string
  reference:   string | null
}

export const walletClient = {
  async getBalance(): Promise<WalletBalance> {
    const res = await fetch('/api/wallet/balance')
    if (!res.ok) throw new Error('Failed to fetch wallet balance')
    return res.json() as Promise<WalletBalance>
  },

  async getTransactions(limit = 20, offset = 0, type?: 'credit' | 'debit'): Promise<WalletTransaction[]> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (type) params.set('type', type)
    const res = await fetch(`/api/wallet/transactions?${params}`)
    if (!res.ok) throw new Error('Failed to fetch transactions')
    const data = await res.json() as { transactions: WalletTransaction[] }
    return data.transactions
  },

  async transfer(receiverEmail: string, amount: number, note?: string) {
    const res = await fetch('/api/wallet/transfer', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ receiverEmail, amount, note }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Transfer failed')
    return json as { ok: boolean; reference: string; amountSent: number; senderBalance: number }
  },
}
