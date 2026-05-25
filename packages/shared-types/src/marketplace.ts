// ============================================================
// KENUXA Ecosystem — Marketplace Types
// ============================================================

export type AssetType = 'dataset' | 'report' | 'signal_pack' | 'model' | 'template' | 'api_access'
export type AssetStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'

export interface MarketplaceAsset {
  id:                      string
  org_id:                  string
  created_by:              string
  title:                   string
  description:             string
  asset_type:              AssetType
  industry?:               string
  country?:                string
  tags:                    string[]
  status:                  AssetStatus
  price_kenux:             number
  suggested_price_kenux:   number
  min_price_kenux:         number
  max_price_kenux:         number
  completeness_score:      number   // 0-100
  freshness_score:         number
  uniqueness_score:        number
  accuracy_score:          number
  overall_quality_score:   number
  purchase_count:          number
  preview_data?:           Record<string, unknown>
  storage_path?:           string
  approved_by?:            string
  approved_at?:            string
  rejection_reason?:       string
  created_at:              string
  updated_at:              string
}

export interface MarketplaceTransaction {
  id:               string
  asset_id:         string
  buyer_user_id:    string
  buyer_org_id:     string
  seller_user_id:   string
  seller_org_id:    string
  amount_kenux:     number
  platform_fee:     number
  seller_payout:    number
  status:           'pending' | 'completed' | 'refunded'
  created_at:       string
}
