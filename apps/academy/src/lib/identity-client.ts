/**
 * Identity client — calls the Academy identity-service.
 * Passes the Supabase access_token as a Bearer token.
 * The identity-service verifies it using the shared SUPABASE_JWT_SECRET.
 */
import type {
  AcademyProfile,
  IdentityState,
  UpdateProfilePayload,
  UpdateIdentityStatePayload,
} from '@kenuxa/shared-types'

const BASE = process.env['NEXT_PUBLIC_IDENTITY_URL'] ?? 'http://localhost:4001'

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...init?.headers,
    },
  })
  const json = await res.json()
  if (!res.ok) throw new Error((json as { error?: string }).error ?? 'Request failed')
  return json as T
}

export const identityClient = {
  getProfile: (token: string) =>
    request<AcademyProfile>('/profile', token),

  updateProfile: (token: string, data: UpdateProfilePayload) =>
    request<AcademyProfile>('/profile', token, { method: 'PUT', body: JSON.stringify(data) }),

  getIdentityState: (token: string) =>
    request<IdentityState>('/identity/state', token),

  updateIdentityState: (token: string, data: UpdateIdentityStatePayload) =>
    request<IdentityState>('/identity/state', token, { method: 'PUT', body: JSON.stringify(data) }),

  getWalletBalance: (token: string) =>
    request<{ balance: number; currency: string }>('/wallet/balance', token),

  getTransactions: (token: string, limit = 5) =>
    request<Array<{ id: string; type: string; amount: number; description: string; createdAt: string }>>(
      `/wallet/transactions?limit=${limit}`,
      token,
    ),

  provision: (token: string, fullName?: string) =>
    request<{ provisioned: boolean }>('/auth/provision', token, {
      method: 'POST',
      body:   JSON.stringify({ fullName }),
    }),
}
