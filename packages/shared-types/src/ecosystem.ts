// ============================================================
// KENUXA Ecosystem — Core Ecosystem Types
// ============================================================

/** Every KENUXA application has a registered app ID */
export type KenuxaApp = 'core' | 'reach' | 'ops' | 'zuria' | 'academy' | 'root'

/** Ecosystem-wide identifier for a resource owned by an app */
export interface EcosystemResource {
  app:          KenuxaApp
  resourceType: string
  resourceId:   string
}

// ─── Organization ──────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'business' | 'enterprise' | 'government' | 'partner'

export type MemberRole =
  | 'super_admin'
  | 'organization_owner'
  | 'organization_admin'
  | 'operator'
  | 'analyst'
  | 'contributor'
  | 'viewer'

export interface Organization {
  id:               string
  name:             string
  slug:             string
  owner_id:         string
  industry?:        string
  country?:         string
  website?:         string
  org_type?:        string
  branding:         Record<string, unknown>
  subscription_tier: SubscriptionTier
  usage_metrics:    Record<string, unknown>
  quotas:           OrgQuotas
  api_limits:       OrgApiLimits
  created_at:       string
  updated_at:       string
}

export interface OrgQuotas {
  ai_requests_monthly:  number
  events_monthly:       number
  storage_mb:           number
  kenux_monthly_bonus?: number
}

export interface OrgApiLimits {
  requests_per_minute: number
}

export interface OrgMember {
  id:              string
  organization_id: string
  user_id:         string
  role:            MemberRole
  invited_by?:     string
  joined_at:       string
}

// ─── User Profile ───────────────────────────────────────────

export interface UserProfile {
  id:         string
  email:      string
  full_name?: string
  avatar_url?: string
  timezone:   string
  metadata:   Record<string, unknown>
  created_at: string
  updated_at: string
}

// ─── API Tokens ─────────────────────────────────────────────

export interface ApiKey {
  id:                  string
  organization_id:     string
  name:                string
  key_hash:            string
  scopes:              string[]
  rate_limit_per_minute: number
  last_used_at?:       string
  expires_at?:         string
  revoked_at?:         string
  created_by?:         string
  created_at:          string
}

/** Cross-app service token — issued by Core for app-to-app calls */
export interface EcosystemServiceToken {
  sub:            string   // organization_id or user_id
  app:            KenuxaApp
  scopes:         string[]
  issued_at:      number
  expires_at:     number
}

// ─── Feature Flags ──────────────────────────────────────────

export interface FeatureGate {
  feature_key:         string
  is_enabled:          boolean
  min_tier?:           SubscriptionTier
  required_kenux?:     number
  allowed_orgs?:       string[]
  metadata:            Record<string, unknown>
}

// ─── Notifications ──────────────────────────────────────────

export interface Notification {
  id:              string
  organization_id?: string
  user_id?:        string
  title:           string
  body:            string
  read_at?:        string
  metadata:        Record<string, unknown>
  created_at:      string
}

// ─── Activity / Audit ───────────────────────────────────────

export interface ActivityLog {
  id:              string
  organization_id?: string
  actor_user_id?:  string
  action:          string
  resource_type:   string
  resource_id?:    string
  ip_address?:     string
  metadata:        Record<string, unknown>
  created_at:      string
}

// ─── API context (passed through server calls) ──────────────

export interface ApiContext {
  userId:         string
  organizationId?: string
  role?:          MemberRole
  apiKeyId?:      string
  app?:           KenuxaApp
}

// ─── Pagination ─────────────────────────────────────────────

export interface PaginatedResult<T> {
  data:   T[]
  total:  number
  limit:  number
  offset: number
  hasMore: boolean
}

export interface PaginationParams {
  limit?:  number
  offset?: number
}
