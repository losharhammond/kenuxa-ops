-- ============================================================
-- KENUXA Business Network — Phase 8: Launch Readiness Migration
-- Adds image columns, marketplace/service image support,
-- company logos on jobs, supplier logos, and KYC documents.
-- ============================================================

-- ── Add image_url to service_listings ──────────────────────
-- ── DROP VIEWS that migration.sql may have created as view compat aliases ──
-- These must be real tables for ALTER TABLE / CREATE INDEX / RLS to work.
DROP VIEW IF EXISTS service_listings;
CREATE TABLE IF NOT EXISTS service_listings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id   UUID        REFERENCES businesses(id) ON DELETE SET NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  category      TEXT        NOT NULL DEFAULT 'general',
  price         NUMERIC     NOT NULL DEFAULT 0 CHECK (price >= 0),
  price_type    TEXT        NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed','hourly','quote')),
  currency      TEXT        NOT NULL DEFAULT 'GHS',
  image_url     TEXT,
  location      TEXT,
  turnaround    TEXT,
  provider_name TEXT,
  is_verified   BOOLEAN     NOT NULL DEFAULT false,
  avg_rating    NUMERIC     CHECK (avg_rating BETWEEN 0 AND 5),
  total_jobs    INTEGER     NOT NULL DEFAULT 0,
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','removed')),
  view_count    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP VIEW IF EXISTS marketplace_listings;
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID        REFERENCES businesses(id) ON DELETE SET NULL,
  seller_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  description   TEXT,
  category      TEXT        NOT NULL DEFAULT 'general',
  price         NUMERIC     NOT NULL CHECK (price >= 0),
  compare_price NUMERIC     CHECK (compare_price >= 0),
  currency      TEXT        NOT NULL DEFAULT 'GHS',
  image_url     TEXT,
  images        JSONB       NOT NULL DEFAULT '[]',
  condition     TEXT        NOT NULL DEFAULT 'new' CHECK (condition IN ('new','like_new','good','fair')),
  stock_qty     INTEGER     NOT NULL DEFAULT 1 CHECK (stock_qty >= 0),
  city          TEXT,
  business_name TEXT,
  is_verified   BOOLEAN     NOT NULL DEFAULT false,
  avg_rating    NUMERIC     CHECK (avg_rating BETWEEN 0 AND 5),
  total_sold    INTEGER     NOT NULL DEFAULT 0,
  tags          TEXT[],
  status        TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold','paused','removed')),
  view_count    INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


ALTER TABLE service_listings
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Add image_url to marketplace_listings ──────────────────
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ── Add logo_url to suppliers ──────────────────────────────
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ── Add company_logo_url to job_listings ───────────────────
ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- ── Ensure logo_url / banner_url on businesses ─────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS logo_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- ── kyc_documents (idempotent — already in phase7 but ensure) ─
CREATE TABLE IF NOT EXISTS kyc_documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type    TEXT NOT NULL,                   -- national_id | selfie | proof_address | business_reg
  file_url    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | verified | rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kyc_documents_user_doc_type_uniq UNIQUE (user_id, doc_type)
);

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kyc_own_select ON kyc_documents;
CREATE POLICY kyc_own_select ON kyc_documents
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS kyc_own_insert ON kyc_documents;
CREATE POLICY kyc_own_insert ON kyc_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS kyc_admin_all ON kyc_documents;
CREATE POLICY kyc_admin_all ON kyc_documents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );

-- ── loan_applications (idempotent) ─────────────────────────
CREATE TABLE IF NOT EXISTS loan_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id     UUID REFERENCES businesses(id) ON DELETE SET NULL,
  amount          NUMERIC(15,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  purpose         TEXT,
  status          TEXT NOT NULL DEFAULT 'pending', -- pending | under_review | approved | rejected | disbursed | closed
  kenuxa_score    INTEGER,
  partner_id      UUID REFERENCES auth.users(id),  -- financial_partner who picks it up
  partner_notes   TEXT,
  approved_at     TIMESTAMPTZ,
  disbursed_at    TIMESTAMPTZ,
  term_months     INTEGER,
  interest_rate   NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS loan_applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS loan_own_select ON loan_applications;
CREATE POLICY loan_own_select ON loan_applications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS loan_own_insert ON loan_applications;
CREATE POLICY loan_own_insert ON loan_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS loan_partner_select ON loan_applications;
CREATE POLICY loan_partner_select ON loan_applications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'financial_partner')
  );

DROP POLICY IF EXISTS loan_partner_update ON loan_applications;
CREATE POLICY loan_partner_update ON loan_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('financial_partner','super_admin','country_admin'))
  );

DROP POLICY IF EXISTS loan_admin_all ON loan_applications;
CREATE POLICY loan_admin_all ON loan_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );

-- ── loan_repayments ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_repayments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id      UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  currency     TEXT NOT NULL DEFAULT 'GHS',
  due_date     DATE NOT NULL,
  paid_at      TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | overdue
  method       TEXT,                               -- wallet | paystack | mobile_money
  reference    TEXT UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS repayment_own_select ON loan_repayments;
CREATE POLICY repayment_own_select ON loan_repayments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS repayment_admin_all ON loan_repayments;
CREATE POLICY repayment_admin_all ON loan_repayments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin','financial_partner'))
  );

-- ── exchange_rates (idempotent) ────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL DEFAULT 'USD',
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(20,8) NOT NULL,
  source        TEXT NOT NULL DEFAULT 'openexchangerates',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
  CONSTRAINT exchange_rates_pair_uniq UNIQUE (from_currency, to_currency)
);

ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exchange_rates_public_read ON exchange_rates;
CREATE POLICY exchange_rates_public_read ON exchange_rates
  FOR SELECT USING (true);

-- ── platform_revenue ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_revenue (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source     TEXT NOT NULL,    -- subscription | marketplace_fee | transaction_fee | advertising | kenux_purchase | ai_usage | api_usage | delivery_fee
  amount     NUMERIC(15,2) NOT NULL,
  currency   TEXT NOT NULL DEFAULT 'GHS',
  user_id    UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  reference  TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS revenue_admin_only ON platform_revenue;
CREATE POLICY revenue_admin_only ON platform_revenue
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );

-- ── Storage buckets (reference — create via Supabase dashboard) ────────────────
-- Buckets needed:
--   business-assets   (logos, banners, documents)
--   kyc-documents     (identity documents — restricted)
--   avatars           (user profile photos)
--   portfolio         (freelancer portfolio images)
--   marketplace       (product listing images)
--   service-images    (service listing images)
--   supplier-logos    (supplier company logos)
--   job-logos         (company logos for job listings)

-- ── Indexes for performance ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_status_sold ON marketplace_listings(status, total_sold DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_status_rating ON service_listings(status, avg_rating DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source_created ON platform_revenue(source, created_at DESC);
