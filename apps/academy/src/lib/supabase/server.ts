import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

type CookieItem = { name: string; value: string; options?: Partial<ResponseCookie> }

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: CookieItem[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (options !== undefined) {
              cookieStore.set(name, value, options)
            } else {
              cookieStore.set(name, value)
            }
          })
        },
      },
    },
  )
}
