/**
 * Reference implementation: how any KENUXA service verifies a Supabase JWT.
 * Copy this pattern into any new service that needs to authenticate users.
 *
 * Usage:
 *   import { verifySupabaseToken } from '@/infrastructure/auth/supabase-jwt-verify'
 *   const payload = await verifySupabaseToken(accessToken)
 *   const userId = payload.sub  // Supabase user UUID
 */
import { jwtVerify } from 'jose'

export interface SupabaseJwtPayload {
  sub:            string   // Supabase user UUID — use this as cross-app FK
  email:          string
  role:           string   // "authenticated" | "anon" | "service_role"
  iss:            string
  iat:            number
  exp:            number
  app_metadata?:  Record<string, unknown>
  user_metadata?: Record<string, unknown>
}

export async function verifySupabaseToken(token: string): Promise<SupabaseJwtPayload> {
  const secret  = process.env['SUPABASE_JWT_SECRET']
  if (!secret) throw new Error('SUPABASE_JWT_SECRET is required')

  const encoded = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, encoded)
  return payload as unknown as SupabaseJwtPayload
}
