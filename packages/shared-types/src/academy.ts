// ============================================================
// KENUXA ACADEMY — Shared Types (Phase 1 Foundation)
// ============================================================

// ─── Academy User Role ──────────────────────────────────────

export type AcademyRole = 'learner' | 'mentor' | 'creator' | 'admin'

// ─── User ───────────────────────────────────────────────────

export interface AcademyUser {
  id:           string
  email:        string
  role:         AcademyRole
  createdAt:    string
  updatedAt:    string
}

// ─── Profile ────────────────────────────────────────────────

export interface AcademyProfile {
  id:           string
  userId:       string
  fullName:     string
  bio:          string | null
  avatarUrl:    string | null
  location:     string | null
  interests:    string[]
  goals:        string[]
  metadata:     Record<string, unknown>   // extension point for future phases
  createdAt:    string
  updatedAt:    string
}

// ─── Identity State ─────────────────────────────────────────
// Seven-dimension Human Development Score
// Range: 0–100 per dimension

export interface IdentityState {
  id:               string
  userId:           string
  cognitiveScore:   number
  creativeScore:    number
  socialScore:      number
  emotionalScore:   number
  practicalScore:   number
  leadershipScore:  number
  economicScore:    number
  metadata:         Record<string, unknown>   // extension point for AI phase
  updatedAt:        string
}

// ─── API Payloads ────────────────────────────────────────────

export interface AcademyRegisterPayload {
  email:    string
  password: string
  fullName: string
  role?:    AcademyRole | undefined
}

export interface AcademyLoginPayload {
  email:    string
  password: string
}

export interface UpdateProfilePayload {
  fullName?:  string | undefined
  bio?:       string | undefined
  avatarUrl?: string | undefined
  location?:  string | undefined
  interests?: string[] | undefined
  goals?:     string[] | undefined
  metadata?:  Record<string, unknown> | undefined
}

export interface UpdateIdentityStatePayload {
  cognitiveScore?:  number | undefined
  creativeScore?:   number | undefined
  socialScore?:     number | undefined
  emotionalScore?:  number | undefined
  practicalScore?:  number | undefined
  leadershipScore?: number | undefined
  economicScore?:   number | undefined
}

// ─── API Responses ───────────────────────────────────────────

export interface AcademyAuthResponse {
  accessToken:  string
  tokenType:    'Bearer'
  expiresIn:    number
  user:         AcademyUser
}
