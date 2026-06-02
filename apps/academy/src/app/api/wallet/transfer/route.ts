/**
 * POST /api/wallet/transfer
 * Body: { receiverEmail, amount, note? }
 *
 * Peer-to-peer KENUX wallet transfer.
 * Uses the SAME wallets + wallet_transactions tables as KENUXA NETWORK,
 * so transfers made in Academy appear in the Network wallet and vice versa.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

const transferSchema = z.object({
  receiverEmail: z.string().email(),
  amount:        z.number().positive().max(10000),
  note:          z.string().max(200).optional(),
})

function getAdmin() {
  return createAdminClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['SUPABASE_SERVICE_ROLE_KEY']!,
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = transferSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.errors }, { status: 400 })
  }
  const { receiverEmail, amount, note } = parsed.data

  if (receiverEmail === user.email) {
    return NextResponse.json({ error: 'Cannot transfer to yourself' }, { status: 400 })
  }

  const admin = getAdmin()

  // Look up receiver by email
  const { data: receiverProfile } = await admin
    .from('user_profiles')
    .select('id')
    .eq('email', receiverEmail)
    .single()

  if (!receiverProfile) {
    return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
  }
  const receiverId = receiverProfile.id as string

  // Check sender balance
  const { data: senderWallet } = await admin
    .from('wallets')
    .select('balance')
    .eq('user_id', user.id)
    .single()

  const senderBalance = (senderWallet?.balance as number | undefined) ?? 0
  if (senderBalance < amount) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }

  const reference = `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const newSenderBalance = senderBalance - amount

  // Debit sender
  await admin.from('wallets').update({ balance: newSenderBalance }).eq('user_id', user.id)

  // Credit receiver (upsert in case wallet doesn't exist yet)
  const { data: receiverWallet } = await admin
    .from('wallets')
    .select('balance')
    .eq('user_id', receiverId)
    .single()

  const receiverBalance = ((receiverWallet?.balance as number | undefined) ?? 0) + amount
  await admin.from('wallets').upsert(
    { user_id: receiverId, balance: receiverBalance, currency: 'GHS', status: 'active' },
    { onConflict: 'user_id' },
  )

  const desc = note ? `Transfer: ${note}` : `Transfer to ${receiverEmail.split('@')[0]}`

  // Record transactions for both parties
  await Promise.all([
    admin.from('wallet_transactions').insert({
      user_id:     user.id,
      type:        'debit',
      amount,
      currency:    'GHS',
      description: desc,
      status:      'completed',
      reference,
      provider:    'wallet',
    }),
    admin.from('wallet_transactions').insert({
      user_id:     receiverId,
      type:        'credit',
      amount,
      currency:    'GHS',
      description: note ? `Received: ${note}` : `Transfer from ${(user.email ?? '').split('@')[0]}`,
      status:      'completed',
      reference,
      provider:    'wallet',
    }),
    // Notify receiver
    admin.from('notifications').insert({
      user_id:    receiverId,
      type:       'wallet_credit',
      category:   'payment',
      title:      `GH₵ ${amount.toFixed(2)} received`,
      body:       `${user.email ?? 'Someone'} sent you GH₵ ${amount.toFixed(2)} via KENUXA ACADEMY${note ? `: ${note}` : ''}.`,
      action_url: '/dashboard/wallet',
    }),
  ])

  return NextResponse.json({
    ok:            true,
    reference,
    amountSent:    amount,
    senderBalance: newSenderBalance,
  })
}
