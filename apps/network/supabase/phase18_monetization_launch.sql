-- ============================================================
-- KENUXA Phase 18 — Monetization Engine, Subscription Addons,
-- Platform Launch Readiness
-- Run AFTER phase17_referrals_phone.sql
-- ============================================================

-- ── Subscription add-ons catalog ─────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_addons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL,
  description TEXT,
  price_ghs   NUMERIC     NOT NULL CHECK (price_ghs >= 0),
  billing_cycle TEXT      NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly','annual','one_time')),
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO subscription_addons (code, name, description, price_ghs, billing_cycle) VALUES
  ('ai_boost',    'AI Boost',      '500 extra AI queries per month',  29,  'monthly'),
  ('extra_staff', 'Extra Staff',   '+25 additional staff accounts',   49,  'monthly'),
  ('sms_bundle',  'SMS Bundle',    '1,000 SMS credits per month',     39,  'monthly'),
  ('api_access',  'API Access',    'REST API + webhook integration',  99,  'monthly')
ON CONFLICT (code) DO NOTHING;

-- ── User add-on subscriptions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS user_addons (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_code TEXT        NOT NULL,
  status     TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','expired')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  paystack_subscription_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, addon_code)
);
CREATE INDEX IF NOT EXISTS idx_user_addons_user ON user_addons(user_id, status);

ALTER TABLE user_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_addons_owner" ON user_addons;
CREATE POLICY "user_addons_owner" ON user_addons FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_addons_admin" ON user_addons;
CREATE POLICY "user_addons_admin"  ON user_addons FOR ALL USING (auth.role() = 'service_role');

-- ── Advertising / Sponsored listings table ───────────────────
CREATE TABLE IF NOT EXISTS sponsored_listings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_type TEXT        NOT NULL CHECK (listing_type IN ('business','product','service','job','supplier')),
  listing_id   UUID        NOT NULL,
  placement    TEXT        NOT NULL DEFAULT 'search' CHECK (placement IN ('search','featured','banner','category')),
  kenux_bid    INTEGER     NOT NULL DEFAULT 100 CHECK (kenux_bid >= 50),
  daily_budget INTEGER     NOT NULL DEFAULT 1000 CHECK (daily_budget >= 100),
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','expired','depleted')),
  impressions  INTEGER     NOT NULL DEFAULT 0,
  clicks       INTEGER     NOT NULL DEFAULT 0,
  spend_today  INTEGER     NOT NULL DEFAULT 0,
  started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sponsored_status   ON sponsored_listings(status, listing_type);
CREATE INDEX IF NOT EXISTS idx_sponsored_user     ON sponsored_listings(user_id);

ALTER TABLE sponsored_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sponsored_owner" ON sponsored_listings;
CREATE POLICY "sponsored_owner"   ON sponsored_listings FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "sponsored_service" ON sponsored_listings;
CREATE POLICY "sponsored_service" ON sponsored_listings FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "sponsored_public" ON sponsored_listings;
CREATE POLICY "sponsored_public"  ON sponsored_listings FOR SELECT USING (status = 'active');

-- ── Marketplace transaction fees ledger ──────────────────────
CREATE TABLE IF NOT EXISTS marketplace_fees (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       UUID,
  seller_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  gross_amount   NUMERIC     NOT NULL CHECK (gross_amount > 0),
  fee_rate       NUMERIC     NOT NULL DEFAULT 0.025 CHECK (fee_rate BETWEEN 0 AND 1),
  fee_amount     NUMERIC     NOT NULL CHECK (fee_amount >= 0),
  net_payout     NUMERIC     NOT NULL CHECK (net_payout >= 0),
  currency       TEXT        NOT NULL DEFAULT 'GHS',
  reference      TEXT        UNIQUE,
  status         TEXT        NOT NULL DEFAULT 'settled' CHECK (status IN ('pending','settled','refunded')),
  settled_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mktfees_seller   ON marketplace_fees(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mktfees_status   ON marketplace_fees(status);

ALTER TABLE marketplace_fees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mktfees_admin" ON marketplace_fees;
CREATE POLICY "mktfees_admin"   ON marketplace_fees FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "mktfees_seller" ON marketplace_fees;
CREATE POLICY "mktfees_seller"  ON marketplace_fees FOR SELECT USING (auth.uid() = seller_id);

-- ── API usage metering ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  api_key_id   UUID,
  endpoint     TEXT        NOT NULL,
  method       TEXT        NOT NULL DEFAULT 'GET',
  status_code  INTEGER,
  latency_ms   INTEGER,
  kenux_cost   INTEGER     NOT NULL DEFAULT 0,
  ip_address   INET,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_usage_user  ON api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_key   ON api_usage_logs(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_ts    ON api_usage_logs(created_at DESC);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "api_usage_admin" ON api_usage_logs;
CREATE POLICY "api_usage_admin" ON api_usage_logs FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "api_usage_owner" ON api_usage_logs;
CREATE POLICY "api_usage_owner" ON api_usage_logs FOR SELECT USING (auth.uid() = user_id);

-- ── Enhanced platform_metrics view (Module 48) ───────────────
CREATE OR REPLACE VIEW platform_metrics_v2 AS
SELECT
  -- Users
  (SELECT COUNT(*) FROM user_profiles)                                              AS total_users,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= now() - INTERVAL '24h')  AS new_users_today,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= now() - INTERVAL '7d')   AS new_users_7d,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at >= now() - INTERVAL '30d')  AS new_users_30d,
  -- Roles
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'customer')           AS total_customers,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'business_owner')     AS total_business_owners,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'freelancer')         AS total_freelancers,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'supplier')           AS total_suppliers,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'job_seeker')         AS total_job_seekers,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'delivery_rider')     AS total_riders,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'recruiter')          AS total_recruiters,
  (SELECT COUNT(*) FROM user_profiles WHERE role = 'financial_partner')  AS total_fin_partners,
  -- Businesses
  (SELECT COUNT(*) FROM businesses)                                       AS total_businesses,
  (SELECT COUNT(*) FROM businesses WHERE status = 'active')              AS active_businesses,
  (SELECT COUNT(*) FROM businesses WHERE verification_status = 'unverified') AS pending_verification,
  -- Economy
  (SELECT COALESCE(SUM(points), 0) FROM rewards_accounts)                AS kenux_in_circulation,
  (SELECT COALESCE(SUM(balance), 0) FROM wallets WHERE status = 'active') AS total_wallet_balance_ghs,
  -- Revenue
  (SELECT COALESCE(SUM(amount), 0) FROM platform_revenue
   WHERE created_at >= date_trunc('month', now()))                       AS revenue_mtd,
  (SELECT COALESCE(SUM(amount), 0) FROM platform_revenue
   WHERE revenue_type = 'subscription'
   AND created_at >= date_trunc('month', now()))                         AS mrr_ghs,
  -- GMV
  (SELECT COALESCE(SUM(total), 0) FROM sales
   WHERE created_at >= now() - INTERVAL '24h')                           AS gmv_today,
  (SELECT COUNT(*) FROM sales WHERE created_at >= now() - INTERVAL '24h') AS transactions_today,
  -- KYC
  (SELECT COUNT(*) FROM kyc_documents WHERE status = 'pending')          AS pending_kyc,
  -- Active subscriptions
  (SELECT COUNT(*) FROM subscriptions WHERE status = 'active')           AS active_subscriptions;

GRANT SELECT ON platform_metrics_v2 TO authenticated, service_role;

-- ── Referral leaderboard enhancement ─────────────────────────
-- Ensure the view is idempotent (already created in phase17 but add if missing)
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT
  r.referrer_id,
  up.full_name,
  up.referral_code,
  COUNT(*)                                                AS total_referrals,
  COUNT(*) FILTER (WHERE r.status = 'completed')          AS successful_referrals,
  COUNT(*) FILTER (WHERE r.status = 'completed') * 250    AS kenux_earned
FROM referrals r
JOIN user_profiles up ON up.id = r.referrer_id
GROUP BY r.referrer_id, up.full_name, up.referral_code
ORDER BY successful_referrals DESC;

GRANT SELECT ON referral_leaderboard TO authenticated, service_role;

-- ── Storage bucket creation (run once) ───────────────────────
-- These must be created via Supabase dashboard or Storage API:
-- CREATE BUCKET 'kyc-documents'    private  10MB  [pdf,jpg,jpeg,png]
-- CREATE BUCKET 'business-assets'  public   5MB   [jpg,jpeg,png,webp,svg]
-- CREATE BUCKET 'product-images'   public   5MB   [jpg,jpeg,png,webp]
-- CREATE BUCKET 'service-images'   public   5MB   [jpg,jpeg,png,webp]
-- CREATE BUCKET 'avatars'          public   2MB   [jpg,jpeg,png,webp]

-- ── Grants ────────────────────────────────────────────────────
GRANT ALL ON subscription_addons   TO authenticated, service_role;
GRANT ALL ON user_addons           TO authenticated, service_role;
GRANT ALL ON sponsored_listings    TO authenticated, service_role;
GRANT ALL ON marketplace_fees      TO service_role;
GRANT SELECT ON marketplace_fees   TO authenticated;
GRANT ALL ON api_usage_logs        TO service_role;
GRANT SELECT ON api_usage_logs     TO authenticated;

COMMENT ON TABLE subscription_addons IS 'KENUXA platform add-on products — AI Boost, Extra Staff, SMS Bundle, API Access.';
COMMENT ON TABLE sponsored_listings  IS 'KENUX-powered sponsored listings for search & featured placements. Revenue stream for KENUXA.';
COMMENT ON TABLE marketplace_fees    IS 'Platform transaction fees (2.5% default) on marketplace orders. Double-entry recording.';
COMMENT ON TABLE api_usage_logs      IS 'Per-request API metering for developer portal billing and rate limiting.';
