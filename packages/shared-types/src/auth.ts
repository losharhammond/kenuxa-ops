// ============================================================
// KENUXA Ecosystem — Auth Types
// ============================================================

import type { MemberRole, KenuxaApp } from './ecosystem'

/** The decoded JWT payload for an ecosystem session token */
export interface EcosystemJwtPayload {
  sub:            string           // user_id
  email:          string
  org:            string           // primary organization_id
  role:           MemberRole
  app:            KenuxaApp        // which app issued this token
  tier:           string           // subscription tier
  iat:            number
  exp:            number
}

/** Auth session returned to clients after successful login/signup */
export interface AuthSession {
  access_token:  string
  refresh_token: string
  token_type:    'Bearer'
  expires_in:    number
  user: {
    id:         string
    email:      string
    full_name?: string
    org_id?:    string
    role?:      MemberRole
  }
}

export interface SignupPayload {
  email:             string
  password:          string
  full_name:         string
  organization_name?: string
}

export interface LoginPayload {
  email:    string
  password: string
}

/** Cross-app auth verification request */
export interface TokenVerifyRequest {
  token: string
  app:   KenuxaApp
}

export interface TokenVerifyResponse {
  valid:   boolean
  payload?: EcosystemJwtPayload
  error?:  string
}
