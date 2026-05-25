/**
 * GET /api/auth/microsoft/callback — Microsoft OAuth2 callback
 *
 * Phase 4: Receives authorization code from Microsoft,
 * exchanges it for tokens, stores them in Supabase,
 * then redirects user back to settings page.
 */
import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens }     from '@/lib/microsoft/graph.client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3002'

  // Microsoft returned an error
  if (error) {
    const params = new URLSearchParams({
      error:   'microsoft_oauth_failed',
      reason:  errorDesc ?? error,
    })
    return NextResponse.redirect(new URL(`/settings?${params}`, appUrl))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/settings?error=missing_oauth_params', appUrl))
  }

  // Extract userId from state (format: "userId:nonce")
  const [userId] = state.split(':')
  if (!userId) {
    return NextResponse.redirect(new URL('/settings?error=invalid_state', appUrl))
  }

  // Exchange code for tokens
  const { success, error: tokenError } = await exchangeCodeForTokens(userId, code)

  if (!success) {
    const params = new URLSearchParams({
      error:  'token_exchange_failed',
      reason: tokenError ?? 'Unknown error',
    })
    return NextResponse.redirect(new URL(`/settings?${params}`, appUrl))
  }

  // Success — redirect to settings with success indicator
  return NextResponse.redirect(new URL('/settings?outlook=connected', appUrl))
}
