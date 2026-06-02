import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('redirect') ?? searchParams.get('next') ?? '/dashboard'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  // Provision Academy rows for this user (idempotent — identity-service handles deduplication)
  try {
    const identityUrl = process.env['IDENTITY_SERVICE_URL'] ?? 'http://localhost:4001'
    await fetch(`${identityUrl}/auth/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.session?.access_token}`,
      },
      body: JSON.stringify({
        userId:   data.user.id,
        email:    data.user.email,
        fullName: data.user.user_metadata?.['full_name'] as string | undefined,
      }),
    })
  } catch {
    // Non-fatal — user can still access Academy, rows provisioned on next API call
  }

  return NextResponse.redirect(`${origin}${next}`)
}
