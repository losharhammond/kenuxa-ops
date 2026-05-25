/**
 * KENUXA Ecosystem — JWT Token Utilities
 * All apps use the same JWT_SECRET for cross-app token validation.
 * Tokens are signed by Core and verified by all apps.
 */

import { SignJWT, jwtVerify } from 'jose'
import type { EcosystemJwtPayload } from '@kenuxa/shared-types'

const getSecret = () => {
  const s = process.env['JWT_SECRET']
  if (!s) throw new Error('JWT_SECRET environment variable is required')
  return new TextEncoder().encode(s)
}

/** Issue an ecosystem JWT (called by Core after login/signup) */
export async function signEcosystemToken(
  payload: Omit<EcosystemJwtPayload, 'iat' | 'exp'>,
  expiresInSeconds = 900,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(await getSecret())
}

/** Verify a token — used by all apps to validate requests from other apps or users */
export async function verifyEcosystemToken(token: string): Promise<EcosystemJwtPayload> {
  const { payload } = await jwtVerify(token, await getSecret())
  return payload as unknown as EcosystemJwtPayload
}

/** Issue a short-lived service token for app-to-app internal calls */
export async function signServiceToken(
  fromApp: string,
  toApp:   string,
  scopes:  string[] = ['read'],
): Promise<string> {
  return new SignJWT({
    service:  true,
    from_app: fromApp,
    to_app:   toApp,
    scopes,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60s')   // service tokens expire in 60s
    .sign(await getSecret())
}
