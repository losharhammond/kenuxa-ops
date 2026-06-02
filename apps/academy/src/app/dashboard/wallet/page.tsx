import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WalletClient from './WalletClient'

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login')

  return <WalletClient />
}
