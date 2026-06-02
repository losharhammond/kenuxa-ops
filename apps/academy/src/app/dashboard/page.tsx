import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { identityClient } from '@/lib/identity-client'
import DashboardClient from './DashboardClient'
import type { AcademyProfile, IdentityState } from '@kenuxa/shared-types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  const token  = session.access_token
  const sbUser = session.user

  // Ensure Academy rows exist (idempotent)
  await identityClient.provision(token, sbUser.user_metadata?.['full_name'] as string | undefined)

  // Fetch Academy-specific data + wallet balance in parallel
  const [profileResult, identityResult, walletResult] = await Promise.allSettled([
    identityClient.getProfile(token),
    identityClient.getIdentityState(token),
    // Wallet: query Supabase directly (same tables as Network)
    (async () => {
      const [walletRes, rewardsRes] = await Promise.all([
        supabase.from('wallets').select('balance, currency').eq('user_id', sbUser.id).single(),
        supabase.from('rewards_accounts').select('points').eq('user_id', sbUser.id).single(),
      ])
      return {
        balance:     (walletRes.data?.balance as number | undefined) ?? 0,
        currency:    (walletRes.data?.currency as string | undefined) ?? 'GHS',
        kenuxPoints: (rewardsRes.data?.points as number | undefined) ?? 0,
      }
    })(),
  ])

  return (
    <DashboardClient
      user={{
        id:    sbUser.id,
        email: sbUser.email ?? '',
        ...(sbUser.user_metadata?.['full_name'] ? { fullName: sbUser.user_metadata['full_name'] as string } : {}),
      }}
      profile={profileResult.status       === 'fulfilled' ? profileResult.value       as AcademyProfile : null}
      identityState={identityResult.status === 'fulfilled' ? identityResult.value      as IdentityState  : null}
      wallet={walletResult.status          === 'fulfilled' ? walletResult.value        : null}
    />
  )
}
