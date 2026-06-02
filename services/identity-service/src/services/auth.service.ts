/**
 * Auth Service — delegates sign-up/sign-in to Supabase Auth REST API.
 * The same Supabase project powers KENUXA NETWORK and KENUXA ACADEMY,
 * so any Network user can log in to Academy with the same credentials.
 *
 * On first Academy login we auto-provision the Academy profile +
 * identity state rows so the rest of the app always has data to work with.
 */
import { prisma } from '../lib/prisma.js'

// ─── Error types ─────────────────────────────────────────────

export class ConflictError extends Error {
  readonly statusCode = 409
  constructor(message: string) { super(message); this.name = 'ConflictError' }
}

export class UnauthorizedError extends Error {
  readonly statusCode = 401
  constructor(message: string) { super(message); this.name = 'UnauthorizedError' }
}

export class NotFoundError extends Error {
  readonly statusCode = 404
  constructor(message: string) { super(message); this.name = 'NotFoundError' }
}

export class BadGatewayError extends Error {
  readonly statusCode = 502
  constructor(message: string) { super(message); this.name = 'BadGatewayError' }
}

// ─── Supabase Auth REST helpers ──────────────────────────────

interface SupabaseAuthResponse {
  access_token:  string
  token_type:    string
  expires_in:    number
  refresh_token: string
  user: {
    id:              string
    email:           string
    user_metadata?:  Record<string, unknown>
  }
}

interface SupabaseErrorResponse {
  error?:             string
  error_description?: string
  msg?:               string
  message?:           string
}

function supabaseAuthUrl(path: string): string {
  const url = process.env['SUPABASE_URL']
  if (!url) throw new Error('SUPABASE_URL environment variable is required')
  return `${url}/auth/v1${path}`
}

function supabaseHeaders(): Record<string, string> {
  const key = process.env['SUPABASE_ANON_KEY']
  if (!key) throw new Error('SUPABASE_ANON_KEY environment variable is required')
  return {
    'Content-Type':  'application/json',
    'apikey':        key,
  }
}

async function supabaseFetch(path: string, body: unknown): Promise<SupabaseAuthResponse> {
  const res = await fetch(supabaseAuthUrl(path), {
    method:  'POST',
    headers: supabaseHeaders(),
    body:    JSON.stringify(body),
  })
  const json = await res.json() as SupabaseAuthResponse & SupabaseErrorResponse
  if (!res.ok) {
    const msg = json.error_description ?? json.error ?? json.msg ?? json.message ?? 'Auth failed'
    if (res.status === 400 || res.status === 422) throw new UnauthorizedError(msg)
    if (res.status === 409) throw new ConflictError(msg)
    throw new BadGatewayError(`Supabase auth error: ${msg}`)
  }
  return json
}

// ─── Academy provisioning ─────────────────────────────────────

/**
 * Ensure Academy-specific rows exist for this Supabase user.
 * Called on every login so returning Network users get provisioned on first Academy access.
 */
export async function ensureAcademyUser(
  supabaseUserId: string,
  email: string,
  fullName?: string,
): Promise<void> {
  const existing = await prisma.academyUserMeta.findUnique({
    where: { supabaseUserId },
  })
  if (existing) return

  await prisma.$transaction([
    prisma.academyUserMeta.create({
      data: {
        supabaseUserId,
        email,
        role: 'learner',
      },
    }),
    prisma.profile.create({
      data: {
        supabaseUserId,
        fullName: fullName ?? email.split('@')[0] ?? 'Academy Learner',
      },
    }),
    prisma.identityState.create({
      data: { supabaseUserId },
    }),
  ])
}

// ─── Auth service public API ──────────────────────────────────

export interface RegisterInput {
  email:    string
  password: string
  fullName: string
}

export interface LoginInput {
  email:    string
  password: string
}

export class AuthService {
  async register(data: RegisterInput) {
    const resp = await supabaseFetch('/signup', {
      email:    data.email,
      password: data.password,
      data: {
        full_name:  data.fullName,
        academy_role: 'learner',
      },
    })

    await ensureAcademyUser(resp.user.id, resp.user.email, data.fullName)

    return this.buildResponse(resp)
  }

  async login(data: LoginInput) {
    const resp = await supabaseFetch('/token?grant_type=password', {
      email:    data.email,
      password: data.password,
    })

    const fullName = resp.user.user_metadata?.['full_name'] as string | undefined
    await ensureAcademyUser(resp.user.id, resp.user.email, fullName)

    return this.buildResponse(resp)
  }

  async refreshToken(refreshToken: string) {
    const resp = await supabaseFetch('/token?grant_type=refresh_token', {
      refresh_token: refreshToken,
    })
    return this.buildResponse(resp)
  }

  private buildResponse(resp: SupabaseAuthResponse) {
    return {
      accessToken:   resp.access_token,
      refreshToken:  resp.refresh_token,
      tokenType:     'Bearer' as const,
      expiresIn:     resp.expires_in,
      user: {
        id:    resp.user.id,
        email: resp.user.email,
      },
    }
  }
}
