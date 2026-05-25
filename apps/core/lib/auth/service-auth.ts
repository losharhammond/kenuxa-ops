/**
 * KENUXA CORE — Service-to-Service Auth
 * Validates requests from other KENUXA apps using either:
 *  1. Bearer JWT token (user-initiated requests proxied through Core)
 *  2. X-Service-Key header (app-to-app internal calls)
 */
import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function requireServiceAuth(req: NextRequest): Promise<NextResponse | null> {
  // 1. Check service key
  const serviceKey = req.headers.get("x-service-key")
  if (serviceKey && serviceKey === env.KENUXA_CORE_API_KEY) {
    return null // Authorized
  }

  // 2. Check Bearer JWT
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    // For now: accept any bearer token (full JWT validation added in Phase 2)
    // TODO: validate against JWT_SECRET using @kenuxa/auth verifyEcosystemToken
    return null
  }

  // 3. Allow unauthenticated in dev (no keys configured)
  if (!env.KENUXA_CORE_API_KEY && !env.JWT_SECRET) {
    return null // Dev mode
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
