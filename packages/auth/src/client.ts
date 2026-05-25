/**
 * KENUXA Auth Client
 * Used by all KENUXA apps to:
 *  - Validate ecosystem tokens
 *  - Make authenticated requests to Core
 *  - Get current user/org context from a request
 */

import { verifyEcosystemToken } from './tokens'
import type { EcosystemJwtPayload, ApiContext, KenuxaApp } from '@kenuxa/shared-types'

export class KenuxaAuthClient {
  private coreUrl:    string
  private serviceKey: string
  private app:        KenuxaApp

  constructor(opts: { coreUrl: string; serviceKey: string; app: KenuxaApp }) {
    this.coreUrl    = opts.coreUrl
    this.serviceKey = opts.serviceKey
    this.app        = opts.app
  }

  /** Extract and verify the bearer token from a request Authorization header */
  async getContext(authHeader: string | null): Promise<ApiContext | null> {
    if (!authHeader?.startsWith('Bearer ')) return null
    const token = authHeader.slice(7)
    try {
      const payload = await verifyEcosystemToken(token)
      return {
        userId:         payload.sub,
        organizationId: payload.org,
        role:           payload.role,
        app:            payload.app,
      }
    } catch {
      return null
    }
  }

  /** Verify a token and return the payload (throws if invalid) */
  async verify(token: string): Promise<EcosystemJwtPayload> {
    return verifyEcosystemToken(token)
  }

  /** Call the Core API with a service token (app-to-app) */
  async coreRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.coreUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type':  'application/json',
        'X-Service-Key': this.serviceKey,
        'X-App':         this.app,
        ...(options.headers ?? {}),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Core API ${path} → ${response.status}: ${text}`)
    }

    return response.json() as Promise<T>
  }
}

// ─── Singleton factory ────────────────────────────────────────

let _client: KenuxaAuthClient | null = null

export function getAuthClient(opts?: { coreUrl: string; serviceKey: string; app: KenuxaApp }): KenuxaAuthClient {
  if (!_client) {
    if (!opts) throw new Error('Auth client not initialized')
    _client = new KenuxaAuthClient(opts)
  }
  return _client
}

export function initAuthClient(opts: { coreUrl: string; serviceKey: string; app: KenuxaApp }): KenuxaAuthClient {
  _client = new KenuxaAuthClient(opts)
  return _client
}
