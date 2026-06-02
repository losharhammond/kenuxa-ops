/**
 * Wallet data lives in Supabase (tables: wallets, wallet_transactions, rewards_accounts).
 * These are the SAME tables used by KENUXA NETWORK — so wallet data is shared automatically.
 *
 * Academy Next.js app queries Supabase directly for wallet data.
 * This service exists as a no-op placeholder; wallet reads/writes go through
 * apps/academy/src/app/api/wallet/* → Supabase, not through identity-service.
 *
 * Keeping this file so the wallet route still compiles — it returns a redirect hint.
 */
export class WalletService {
  getNote() {
    return {
      message: 'Wallet data is served directly by the Academy Next.js app via Supabase.',
      endpoint: '/api/academy/wallet/balance',
    }
  }
}
