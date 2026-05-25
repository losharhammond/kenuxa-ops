// ============================================================
// KENUXA Ecosystem — KENUX Wallet Types
// KENUX is the ecosystem utility currency — 100 KENUX ≈ ₦50 ≈ $0.05 USD
// ============================================================

export type KenuxTransactionType =
  | 'purchase'        // Bought via Paystack
  | 'earn'            // Earned by contributing data, referrals, etc.
  | 'spend'           // Spent on platform services (campaigns, AI compute, etc.)
  | 'transfer_in'     // Received from another user
  | 'transfer_out'    // Sent to another user
  | 'refund'          // Refunded by admin or system
  | 'welcome_bonus'   // 100 KENUX on signup
  | 'subscription_credit' // Monthly credit from subscription tier
  | 'marketplace_sale'    // Earned from marketplace sale
  | 'admin_grant'         // Admin-issued credit

export interface KenuxWallet {
  id:              string
  user_id:         string
  org_id?:         string
  balance:         number
  lifetime_earned: number
  lifetime_spent:  number
  created_at:      string
  updated_at:      string
}

export interface KenuxTransaction {
  id:             string
  user_id:        string
  org_id?:        string
  type:           KenuxTransactionType
  amount:         number            // positive = credit, negative = debit
  balance_before: number
  balance_after:  number
  description:    string
  reference?:     string
  metadata:       Record<string, unknown>
  created_at:     string
}

export interface CreditKenuxPayload {
  userId:       string
  orgId?:       string
  amount:       number
  type:         KenuxTransactionType
  description:  string
  reference?:   string
  metadata?:    Record<string, unknown>
}

export interface DebitKenuxPayload extends CreditKenuxPayload {
  // debit will fail if balance < amount
}

export interface WalletBalance {
  balance:         number
  lifetime_earned: number
  lifetime_spent:  number
  currency:        'KENUX'
  usd_equivalent:  number    // balance * 0.0005
  ngn_equivalent:  number    // balance * 0.5
}

// ─── KENUX exchange rates ────────────────────────────────────
export const KENUX_RATES = {
  NGN_PER_KENUX:  0.5,    // ₦0.50 per KENUX  (100 KENUX = ₦50)
  USD_PER_KENUX:  0.0005, // $0.0005 per KENUX (100 KENUX ≈ $0.05)
} as const

// ─── Paystack KENUX packages ─────────────────────────────────
export const KENUX_PACKAGES = [
  { id: 'kenuxa-100kenux',   kenux: 100,   ngn: 50,   usd: 0.05 },
  { id: 'kenuxa-500kenux',   kenux: 500,   ngn: 200,  usd: 0.20 },
  { id: 'kenuxa-1000kenux',  kenux: 1000,  ngn: 350,  usd: 0.35 },
  { id: 'kenuxa-5000kenux',  kenux: 5000,  ngn: 1500, usd: 1.50 },
  { id: 'kenuxa-10000kenux', kenux: 10000, ngn: 2500, usd: 2.50 },
] as const

export type KenuxPackageId = typeof KENUX_PACKAGES[number]['id']
