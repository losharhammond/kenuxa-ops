/**
 * Wallet Service — proxies to KENUXA CORE wallet API.
 * Academy does NOT own wallet data. CORE owns wallets for all ecosystem apps.
 */

interface WalletBalance {
  userId:        string
  balance:       number
  currency:      string
  lastUpdatedAt: string
}

interface WalletTransaction {
  id:          string
  type:        string
  amount:      number
  description: string
  createdAt:   string
}

function coreUrl(path: string): string {
  const base = process.env['KENUXA_CORE_URL'] ?? 'http://localhost:3000'
  return `${base}${path}`
}

function coreHeaders(userToken: string): Record<string, string> {
  return {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${userToken}`,
    'X-App-Id':      'academy',
  }
}

export class WalletService {
  async getBalance(userToken: string): Promise<WalletBalance> {
    const res = await fetch(coreUrl('/api/wallet/balance'), {
      headers: coreHeaders(userToken),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(err.error ?? 'Failed to fetch wallet balance')
    }
    return res.json() as Promise<WalletBalance>
  }

  async getTransactions(userToken: string, limit = 10): Promise<WalletTransaction[]> {
    const res = await fetch(coreUrl(`/api/wallet/transactions?limit=${limit}`), {
      headers: coreHeaders(userToken),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(err.error ?? 'Failed to fetch transactions')
    }
    return res.json() as Promise<WalletTransaction[]>
  }
}
