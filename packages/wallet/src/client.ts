/**
 * KENUXA KENUX Wallet Client
 * Used by any KENUXA app to interact with the wallet via Core API.
 * Core owns the wallet data; apps call Core for all operations.
 */

import type {
  KenuxWallet, KenuxTransaction, WalletBalance,
  CreditKenuxPayload, DebitKenuxPayload,
  PaginatedResult,
} from '@kenuxa/shared-types'

export class KenuxWalletClient {
  private coreUrl:    string
  private serviceKey: string

  constructor(opts: { coreUrl: string; serviceKey: string }) {
    this.coreUrl    = opts.coreUrl
    this.serviceKey = opts.serviceKey
  }

  private async req<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.coreUrl}/api/wallet${path}`, {
      ...options,
      headers: {
        'Content-Type':  'application/json',
        'X-Service-Key': this.serviceKey,
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Wallet API ${path} → ${res.status}: ${text}`)
    }
    return res.json() as Promise<T>
  }

  /** Get or create wallet for a user */
  async getWallet(userId: string): Promise<KenuxWallet> {
    return this.req<KenuxWallet>(`?user_id=${userId}`)
  }

  /** Get wallet balance summary */
  async getBalance(userId: string): Promise<WalletBalance> {
    return this.req<WalletBalance>(`/balance?user_id=${userId}`)
  }

  /** Credit KENUX to a user (earn, purchase, bonus, etc.) */
  async credit(payload: CreditKenuxPayload): Promise<KenuxTransaction> {
    return this.req<KenuxTransaction>('/credit', {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
  }

  /** Debit KENUX from a user (spend, transfer_out) — fails if balance < amount */
  async debit(payload: DebitKenuxPayload): Promise<KenuxTransaction> {
    return this.req<KenuxTransaction>('/debit', {
      method: 'POST',
      body:   JSON.stringify(payload),
    })
  }

  /** Transfer KENUX between users */
  async transfer(opts: {
    fromUserId:  string
    toUserId:    string
    amount:      number
    description: string
    reference?:  string
  }): Promise<{ debit: KenuxTransaction; credit: KenuxTransaction }> {
    return this.req('/transfer', {
      method: 'POST',
      body:   JSON.stringify(opts),
    })
  }

  /** Get transaction history for a user */
  async getTransactions(
    userId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<PaginatedResult<KenuxTransaction>> {
    const params = new URLSearchParams({
      user_id: userId,
      limit:   String(opts.limit  ?? 20),
      offset:  String(opts.offset ?? 0),
    })
    return this.req<PaginatedResult<KenuxTransaction>>(`/transactions?${params}`)
  }

  /** Check if user has sufficient KENUX for an operation */
  async hasSufficientBalance(userId: string, required: number): Promise<boolean> {
    try {
      const bal = await this.getBalance(userId)
      return bal.balance >= required
    } catch {
      return false
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────

let _wallet: KenuxWalletClient | null = null

export function getWalletClient(opts?: { coreUrl: string; serviceKey: string }): KenuxWalletClient {
  if (!_wallet) {
    if (!opts) throw new Error('Wallet client not initialized')
    _wallet = new KenuxWalletClient(opts)
  }
  return _wallet
}

export function initWalletClient(opts: { coreUrl: string; serviceKey: string }): KenuxWalletClient {
  _wallet = new KenuxWalletClient(opts)
  return _wallet
}
