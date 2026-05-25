import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Returns null when Supabase env vars are not configured (dev without .env.local). */
export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null

  if (client) return client
  client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)
  return client
}
