/**
 * KENUXA OPS — CORE Auth Middleware (Phase 3)
 *
 * Every sensitive OPS API route MUST call withCoreAuth() to:
 *   1. Validate the session via KENUXA CORE
 *   2. Fetch user permissions + org context
 *   3. Attach CoreUserContext to the handler
 *
 * If CORE is unreachable or token is invalid → 401 immediately.
 * If CORE is not configured (dev) → fall through with a dev context.
 */
import { NextRequest, NextResponse } from 'next/server'
import type { CoreUserContext }       from '@/types/ops'

const CORE_URL    = process.env.KENUXA_CORE_URL    ?? 'http://localhost:3000'
const SERVICE_KEY = process.env.KENUXA_CORE_API_KEY ?? ''
const DEV_MODE    = process.env.NODE_ENV === 'development'

// ── Token extraction ───────────────────────────────────────────────────────────

function extractToken(req: NextRequest): string | null {
  // 1. Authorization header: Bearer <token>
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7)

  // 2. X-Core-Token header (internal service calls)
  const coreToken = req.headers.get('x-core-token')
  if (coreToken) return coreToken

  // 3. Cookie: ops-session (set by CORE SSO redirect)
  const cookie = req.cookies.get('ops-session')?.value
  if (cookie) return cookie

  return null
}

// ── Remote validation against KENUXA CORE ─────────────────────────────────────

async function validateWithCore(token: string): Promise<CoreUserContext | null> {
  try {
    const res = await fetch(`${CORE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': SERVICE_KEY,
        'X-App':         'ops',
      },
      body: JSON.stringify({ token }),
      // Short timeout — don't block request chain
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) return null
    const data = await res.json() as {
      userId:   string
      email:    string
      name?:    string
      orgId?:   string
      orgName?: string
      roles?:   string[]
      permissions?: string[]
    }

    return {
      userId:      data.userId,
      email:       data.email,
      name:        data.name,
      orgId:       data.orgId,
      orgName:     data.orgName,
      roles:       data.roles       ?? ['user'],
      permissions: data.permissions ?? [],
    }
  } catch {
    return null
  }
}

// ── Dev bypass context (no CORE configured) ───────────────────────────────────

function devContext(userId: string): CoreUserContext {
  return {
    userId,
    email:       'dev@kenuxa.local',
    name:        'Dev User',
    orgId:       'dev-org',
    orgName:     'Development',
    roles:       ['admin', 'user'],
    permissions: ['*'],
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export type AuthedHandler<T = NextResponse> = (
  req:     NextRequest,
  context: CoreUserContext,
  supabaseUserId?: string,
) => Promise<T>

/**
 * Higher-order function that wraps a route handler with CORE auth.
 *
 * Usage:
 *   export const POST = withCoreAuth(async (req, ctx) => { ... })
 *
 * In dev mode without CORE configured, uses the Supabase session as fallback.
 */
export function withCoreAuth(handler: AuthedHandler): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest) => {
    // 1. Try CORE token from headers/cookie
    const coreToken = extractToken(req)

    if (coreToken) {
      const coreCtx = await validateWithCore(coreToken)
      if (coreCtx) {
        return handler(req, coreCtx)
      }
      // Token present but invalid
      return NextResponse.json(
        { error: 'CORE auth failed — token invalid or expired' },
        { status: 401 }
      )
    }

    // 2. Dev fallback: use Supabase session (when CORE is not running)
    if (DEV_MODE || !SERVICE_KEY) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          return handler(req, devContext(user.id), user.id)
        }
      } catch { /* supabase not configured */ }
    }

    // 3. No valid auth
    return NextResponse.json(
      { error: 'Authentication required — provide CORE session token' },
      { status: 401 }
    )
  }
}

/**
 * Lightweight version that tries CORE first, falls back to Supabase.
 * Returns null if no valid auth found.
 */
export async function resolveAuth(
  req: NextRequest
): Promise<{ ctx: CoreUserContext; supabaseUserId?: string } | null> {
  const coreToken = extractToken(req)

  if (coreToken) {
    const coreCtx = await validateWithCore(coreToken)
    if (coreCtx) return { ctx: coreCtx }
  }

  // Fallback to Supabase in dev
  if (DEV_MODE || !SERVICE_KEY) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) return { ctx: devContext(user.id), supabaseUserId: user.id }
    } catch { /* ignore */ }
  }

  return null
}
