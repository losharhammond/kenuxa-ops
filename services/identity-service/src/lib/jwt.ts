/**
 * Verifies Supabase-issued JWTs using the shared SUPABASE_JWT_SECRET.
 * Academy uses the same Supabase project as KENUXA NETWORK so any user
 * with a Network (or Core) account can authenticate into Academy.
 */
import { jwtVerify } from 'jose'

export interface SupabaseJwtPayload {
  sub:   string       // Supabase user UUID
  email: string
  role:  string       // Supabase role: "authenticated" | "anon" | "service_role"
  iss:   string
  iat:   number
  exp:   number
  // Supabase app_metadata
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
  // Supabase user_metadata
  user_metadata?: Record<string, unknown>
}

const getSecret = (): Uint8Array => {
  const s = process.env['SUPABASE_JWT_SECRET']
  if (!s) throw new Error('SUPABASE_JWT_SECRET environment variable is required')
  return new TextEncoder().encode(s)
}

export async function verifySupabaseToken(token: string): Promise<SupabaseJwtPayload> {
  const { payload } = await jwtVerify(token, await getSecret())
  return payload as unknown as SupabaseJwtPayload
}
