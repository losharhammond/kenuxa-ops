/**
 * GET /api/wallet/transactions?limit=20&offset=0&type=credit|debit
 *
 * Returns the user's wallet transaction history from the shared Supabase table.
 * Same data visible in KENUXA NETWORK wallet history.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = req.nextUrl.searchParams
  const limit  = Math.min(Number(params.get('limit') ?? 20), 50)
  const offset = Number(params.get('offset') ?? 0)
  const type   = params.get('type') // 'credit' | 'debit' | null

  let query = supabase
    .from('wallet_transactions')
    .select('id, type, amount, currency, description, status, created_at, reference')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type === 'credit' || type === 'debit') {
    query = query.eq('type', type)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ transactions: data ?? [], total: data?.length ?? 0 })
}
