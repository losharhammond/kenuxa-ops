// ============================================================
// KENUXA Ecosystem — Intelligence Types (owned by KENUXA REACH)
// ============================================================

export type SignalType = 'market' | 'trend' | 'competitive' | 'regulatory' | 'economic' | 'technology' | 'social'
export type SignalStatus = 'active' | 'archived' | 'unverified'

export interface TrendSignal {
  id:             string
  signal_type:    SignalType
  status:         SignalStatus
  title:          string
  description:    string
  velocity:       number      // 0-100 — how fast it's spreading
  confidence:     number      // 0-1
  countries:      string[]
  industries:     string[]
  tags:           string[]
  sources:        string[]
  metadata:       Record<string, unknown>
  detected_at:    string
  created_at:     string
}

export interface ExtractedEntity {
  id:            string
  entity_type:   'person' | 'organization' | 'location' | 'product' | 'concept'
  name:          string
  normalized:    string
  confidence:    number
  properties:    Record<string, unknown>
  source_url?:   string
  created_at:    string
}

export interface CompanyProfile {
  id:                string
  name:              string
  slug:              string
  description?:      string
  industry?:         string
  country:           string
  city?:             string
  founded_year?:     number
  employee_count?:   string
  revenue_range?:    string
  website?:          string
  linkedin?:         string
  verified:          boolean
  executives:        Executive[]
  subsidiaries:      string[]
  digital_footprint: Record<string, unknown>
  intelligence:      Record<string, unknown>
  created_at:        string
  updated_at:        string
}

export interface Executive {
  name:     string
  title:    string
  linkedin?: string
}
