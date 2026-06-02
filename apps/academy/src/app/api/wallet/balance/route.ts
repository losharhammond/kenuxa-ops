/**
 * GET /api/wallet/balance
 *
 * Returns the authenticated user's KENUX wallet balance and rewards points.
 * Queries the SAME Supabase tables used by KENUXA NETWORK:
 *   - wallets (GHS fiat balance)
 *   - rewards_accounts (KENUX points)
 *
 * A user's wallet shows the same balance whether they log in via Network or Academy.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [walletRes, rewardsRes] = await Promise.all([
    supabase
      .from('wallets')
      .select('balance, currency, status')
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('rewards_accounts')
      .select('points')
      .eq('user_id', user.id)
      .single(),
  ])

  // Auto-provision wallet if first-time Academy access (Network may not have provisioned yet)
  if (walletRes.error) {
    await supabase.from('wallets').upsert(
      { user_id: user.id, balance: 0, currency: 'GHS', status: 'active' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    )
  }

  return NextResponse.json({
    balance:       walletRes.data?.balance ?? 0,
    currency:      walletRes.data?.currency ?? 'GHS',
    status:        walletRes.data?.status ?? 'active',
    kenuxPoints:   rewardsRes.data?.points ?? 0,
  })
}
