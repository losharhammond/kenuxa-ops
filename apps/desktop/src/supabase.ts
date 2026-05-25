/**
 * Supabase client for the main (Node.js) process.
 * Uses the same project as KENUXA OPS.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Baked in at build time — same project as OPS
const SUPABASE_URL      = process.env['SUPABASE_URL']      ?? 'https://hpykayusvdamzpvniris.supabase.co'
const SUPABASE_ANON_KEY = process.env['SUPABASE_ANON_KEY'] ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweWtheXVzdmRhbXpwdm5pcmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MDUxMjAsImV4cCI6MjA5NTI4MTEyMH0.4kDxSN1ahZ0jS8Pxg6M6LQAtX3CmKuFCb2ErMCJkS30'

let _client: SupabaseClient | null = null

export function createSupabaseClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession:   false,
        autoRefreshToken: false,
        detectSessionFromUrl: false,
      },
    })
  }
  return _client
}
