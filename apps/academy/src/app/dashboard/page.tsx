import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { identityClient } from '@/lib/identity-client'
import DashboardClient from './DashboardClient'
import type { AcademyProfile, IdentityState } from '@kenuxa/shared-types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/auth/login')

  const token    = session.access_token
  const sbUser   = session.user

  // Ensure Academy rows exist (idempotent — no-op if already provisioned)
  await identityClient.provision(token, sbUser.user_metadata?.['full_name'] as string | undefined)

  // Fetch Academy data in parallel
  const [profile, identityState, walletResult] = await Promise.allSettled([
    identityClient.getProfile(token),
    identityClient.getIdentityState(token),
    identityClient.getWalletBalance(token),
  ])

  const profileData      = profile.status      === 'fulfilled' ? profile.value      : null
  const identityData     = identityState.status === 'fulfilled' ? identityState.value : null
  const walletData       = walletResult.status  === 'fulfilled' ? walletResult.value  : null

  return (
    <DashboardClient
      user={{ id: sbUser.id, email: sbUser.email ?? '', fullName: sbUser.user_metadata?.['full_name'] as string | undefined }}
      profile={profileData as AcademyProfile | null}
      identityState={identityData as IdentityState | null}
      wallet={walletData}
    />
  )
}
