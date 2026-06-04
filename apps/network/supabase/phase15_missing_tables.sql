-- ============================================================
-- Phase 15: Missing Tables & Schema Fixes
-- marketplace_listings, service_listings
-- Column aliases for backward compat
-- ============================================================

-- ── marketplace_listings ─────────────────────────────────────
-- Public product listings from any seller (B2C and B2B)
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
CREATE INDEX IF NOT EXISTS idx_ml_seller    ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_ml_category  ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_ml_status    ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_ml_created   ON marketplace_listings(created_at DESC);

ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ml_public_read" ON marketplace_listings;
CREATE POLICY "ml_public_read" ON marketplace_listings
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "ml_seller_all" ON marketplace_listings;
CREATE POLICY "ml_seller_all" ON marketplace_listings
  FOR ALL USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- ── service_listings ─────────────────────────────────────────
-- Services offered by freelancers and businesses
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
CREATE INDEX IF NOT EXISTS idx_sl_user      ON service_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_sl_category  ON service_listings(category);
CREATE INDEX IF NOT EXISTS idx_sl_status    ON service_listings(status);

ALTER TABLE service_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sl_public_read" ON service_listings;
CREATE POLICY "sl_public_read" ON service_listings
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "sl_owner_all" ON service_listings;
CREATE POLICY "sl_owner_all" ON service_listings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Ensure delivery_riders has user_id for auth linking ──────
ALTER TABLE delivery_riders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS delivery_riders ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_delivery_riders_user ON delivery_riders(user_id);

-- ── Add missing column: freelancer_profiles.skills as text ───
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS skills TEXT;
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC CHECK (hourly_rate >= 0);
ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS headline TEXT;

-- ── Notifications: add message column as alias for body ──────
-- (Some API routes historically used 'message'; we now use 'body' everywhere)
-- No column needed — all routes have been updated to use 'body'

-- ── Ensure rfqs.created_by exists (used in rfq_items policy below) ─────────
ALTER TABLE IF EXISTS rfqs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ── rfq_items ────────────────────────────────────────────────
-- Line items attached to RFQs
CREATE TABLE IF NOT EXISTS rfq_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id       UUID        NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  quantity     NUMERIC     NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit         TEXT        DEFAULT 'unit',
  unit_price   NUMERIC     CHECK (unit_price >= 0),
  total_price  NUMERIC     CHECK (total_price >= 0),
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rfq_items_rfq ON rfq_items(rfq_id);

ALTER TABLE rfq_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rfq_items_owner" ON rfq_items;
CREATE POLICY "rfq_items_owner" ON rfq_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rfqs WHERE rfqs.id = rfq_items.rfq_id
      AND rfqs.created_by = auth.uid()
    )
  );

GRANT ALL ON rfq_items TO authenticated;

-- ── GRANTS ────────────────────────────────────────────────────
GRANT ALL ON marketplace_listings TO authenticated;
GRANT ALL ON service_listings     TO authenticated;
GRANT SELECT ON marketplace_listings TO anon;
GRANT SELECT ON service_listings     TO anon;
