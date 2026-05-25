/**
 * GET /api/auth/microsoft — Initiate Microsoft OAuth2 (Outlook connection)
 *
 * Phase 4: Redirect user to Microsoft consent screen.
 * After approval, Microsoft redirects to /api/auth/microsoft/callback.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuth }               from '@/lib/core/auth'
import { getAuthorizationUrl, isMicrosoftConfigured } from '@/lib/microsoft/graph.client'
import { nanoid }                    from 'nanoid'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await resolveAuth(req)
  if (!auth) {
    return NextResponse.redirect(
      new URL('/auth/login', req.url)
    )
  }

  if (!isMicrosoftConfigured()) {
    return NextResponse.json({
      error: 'Microsoft OAuth not configured',
      hint:  'Set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID in environment variables',
    }, { status: 501 })
  }

  // State encodes userId + CSRF nonce
  const state = `${auth.supabaseUserId ?? auth.ctx.userId}:${nanoid(16)}`
  const url   = getAuthorizationUrl(state)

  return NextResponse.redirect(url)
}
