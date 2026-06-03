-- ═══════════════════════════════════════════════════════════════════════════
-- KENUXA BUSINESS NETWORK — Reconciliation Migration
-- Aligns schema.sql with app-code expectations
-- Run AFTER schema.sql in a fresh Supabase project
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 0. ENUM SAFETY — add missing values to existing enums ───────────────────
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is safe to run multiple times.
-- 'freelancer' was added to user_role after initial schema deployment.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'freelancer';

-- ─── 1. USER PROFILES: add business_id shortcut column ────────────────────
-- The app accesses profile.business_id directly for all business-scoped queries

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id),
  ADD COLUMN IF NOT EXISTS facebook    TEXT,
  ADD COLUMN IF NOT EXISTS instagram   TEXT,
  ADD COLUMN IF NOT EXISTS twitter     TEXT,
  ADD COLUMN IF NOT EXISTS linkedin    TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_business ON user_profiles(business_id);

-- ─── 2. BUSINESSES: add social link columns (app stores them flat) ─────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS facebook            TEXT,
  ADD COLUMN IF NOT EXISTS instagram           TEXT,
  ADD COLUMN IF NOT EXISTS twitter             TEXT,
  ADD COLUMN IF NOT EXISTS linkedin            TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp            TEXT,
  ADD COLUMN IF NOT EXISTS tin                 TEXT,
  ADD COLUMN IF NOT EXISTS year_established    INT,
  ADD COLUMN IF NOT EXISTS total_sales         NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating          NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_reviews       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS business_hours      JSONB;

-- ─── 3. INVENTORY_ITEMS: separate POS-facing inventory table ──────────────
-- The app uses inventory_items (not products) for POS and inventory management

CREATE TABLE IF NOT EXISTS inventory_items (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  sku                 TEXT,
  barcode             TEXT,
  category            TEXT,
  description         TEXT,
  selling_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  cost_price          NUMERIC(15,2),
  currency            TEXT DEFAULT 'GHS',
  stock_qty           INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 10,
  unit                TEXT DEFAULT 'pcs',
  images              TEXT[] DEFAULT '{}',
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_business ON inventory_items(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_name     ON inventory_items USING GIN(name gin_trgm_ops);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inventory_items_owner" ON inventory_items;
CREATE POLICY "inventory_items_owner" ON inventory_items
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ─── 4. SALES: reconcile column names used by the app ─────────────────────
-- App inserts: receipt_no, items (jsonb), subtotal, tax_amount, total,
--              payment_method, amount_paid, change_given, cashier_id, customer_name

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS items          JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS customer_name  TEXT,
  ADD COLUMN IF NOT EXISTS change_given   NUMERIC(15,2) DEFAULT 0;

-- change_amount alias (schema uses change_amount, app uses change_given — keep both)

-- ─── 5. BUSINESS_STAFF: team members per business ─────────────────────────
CREATE TABLE IF NOT EXISTS business_staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES user_profiles(id),
  full_name   TEXT,
  email       TEXT,
  phone       TEXT,
  role        TEXT NOT NULL DEFAULT 'employee',
  status      TEXT NOT NULL DEFAULT 'active',
  invited_at  TIMESTAMPTZ DEFAULT NOW(),
  joined_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_staff_business ON business_staff(business_id);
ALTER TABLE business_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_staff_owner" ON business_staff;
CREATE POLICY "business_staff_owner" ON business_staff
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ─── 6. BUSINESS_EXPENSES: finance page (schema has 'expenses', app uses 'business_expenses')
CREATE TABLE IF NOT EXISTS business_expenses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  description    TEXT NOT NULL,
  category       TEXT NOT NULL,
  amount         NUMERIC(15,2) NOT NULL,
  currency       TEXT DEFAULT 'GHS',
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  vendor         TEXT,
  receipt_url    TEXT,
  notes          TEXT,
  recorded_by    UUID REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_expenses_business ON business_expenses(business_id);
ALTER TABLE business_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_expenses_owner" ON business_expenses;
CREATE POLICY "business_expenses_owner" ON business_expenses
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ─── 7. NOTIFICATIONS: reconcile column names ─────────────────────────────
-- App API uses recipient_id; schema has user_id — add alias column

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS category     TEXT DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS action_url   TEXT,
  ADD COLUMN IF NOT EXISTS read_at      TIMESTAMPTZ;

-- Back-fill recipient_id from user_id for existing rows
UPDATE notifications SET recipient_id = user_id WHERE recipient_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);

-- ─── 8. FEATURE_FLAGS: admin system settings ──────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       BOOLEAN NOT NULL DEFAULT FALSE,
  label       TEXT,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: only super_admin can write; authenticated users can read
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "feature_flags_read" ON feature_flags;
CREATE POLICY "feature_flags_read"  ON feature_flags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "feature_flags_write" ON feature_flags;
CREATE POLICY "feature_flags_write" ON feature_flags FOR ALL
  USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- Seed default feature flags
INSERT INTO feature_flags (key, value, label, description) VALUES
  ('marketplace_enabled',    true,  'Product Marketplace',    'Allow businesses to list products publicly'),
  ('jobs_enabled',           true,  'Jobs Marketplace',       'Enable job postings and applications'),
  ('bnpl_enabled',           false, 'BNPL Payments',          'Buy Now Pay Later financing feature'),
  ('ai_insights_enabled',    true,  'AI Business Insights',   'AI-generated weekly insights per business'),
  ('delivery_enabled',       true,  'Delivery Network',       'Last-mile delivery module'),
  ('supplier_rfq_enabled',   true,  'Supplier RFQ',           'Request for Quotation from suppliers'),
  ('marketing_enabled',      true,  'Marketing Campaigns',    'WhatsApp, SMS, email campaigns'),
  ('kyc_required',           false, 'KYC Verification',       'Require KYC before business can go live'),
  ('maintenance_mode',       false, 'Maintenance Mode',       'Show maintenance page to all users'),
  ('e_invoicing',            false, 'GRA E-Invoicing',        'Submit invoices to Ghana Revenue Authority EFRIS system (requires GRA API credentials)')
ON CONFLICT (key) DO NOTHING;

-- ─── 9. JOB_LISTINGS: add columns the app expects ─────────────────────────
ALTER TABLE job_listings
  ADD COLUMN IF NOT EXISTS company_name       TEXT,
  ADD COLUMN IF NOT EXISTS application_count  INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status             TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS posted_at          TIMESTAMPTZ DEFAULT NOW();

-- Back-fill company_name from businesses
UPDATE job_listings jl
SET company_name = b.name
FROM businesses b
WHERE jl.business_id = b.id AND jl.company_name IS NULL;

-- ─── 10. MARKETING_CAMPAIGNS: add 'sent' count column ─────────────────────
ALTER TABLE marketing_campaigns
  ADD COLUMN IF NOT EXISTS sent INT DEFAULT 0;

-- ─── 11. CRM_CUSTOMERS: the app uses 'full_name', schema uses 'name' ───────
-- Add full_name as a generated column for compatibility
ALTER TABLE crm_customers
  ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (name) STORED;

-- The app also queries a 'customers' view (some pages use customers table)
CREATE OR REPLACE VIEW customers AS
  SELECT
    id, business_id, user_id,
    name AS full_name, name,
    email, phone, NULL::TEXT AS address, NULL::TEXT AS city,
    notes,
    segment, lifetime_value, total_orders, last_purchase, loyalty_points,
    created_at, updated_at
  FROM crm_customers;

-- ─── 12. SUPPLIERS VIEW: app queries 'suppliers' table ────────────────────
CREATE OR REPLACE VIEW suppliers AS
  SELECT
    b.id,
    b.name,
    b.type AS category,
    b.city,
    b.avg_rating AS rating,
    COALESCE(b.total_sales, 0) AS total_orders,
    b.verification_status = 'verified' AS is_verified,
    sp.moq,
    sp.lead_time_days
  FROM businesses b
  LEFT JOIN supplier_profiles sp ON sp.business_id = b.id
  WHERE b.type IN ('wholesaler', 'manufacturer', 'distributor', 'importer');

-- ─── 13. PURCHASE_ORDERS: add supplier_name column ────────────────────────
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Back-fill from businesses
UPDATE purchase_orders po
SET supplier_name = b.name
FROM businesses b
WHERE po.supplier_id = b.id AND po.supplier_name IS NULL;

-- ─── 14. AUDIT_LOGS: admin logs page ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES user_profiles(id),
  business_id UUID REFERENCES businesses(id),
  action      TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'system',
  entity_type TEXT,
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user     ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created  ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs
  FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('super_admin', 'country_admin')
  );

-- ─── 15. KYC_SUBMISSIONS: admin compliance page ───────────────────────────
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id      UUID NOT NULL REFERENCES businesses(id),
  submitted_by     UUID NOT NULL REFERENCES user_profiles(id),
  business_name    TEXT,
  document_type    TEXT,   -- maps to id_type
  status           TEXT NOT NULL DEFAULT 'pending',  -- pending, approved, rejected
  id_type          TEXT,    -- ghana_card, passport, drivers_license
  id_number        TEXT,
  id_doc_url       TEXT,
  selfie_url       TEXT,
  business_reg_url TEXT,
  notes            TEXT,
  reviewed_by      UUID REFERENCES user_profiles(id),
  reviewed_at      TIMESTAMPTZ,
  submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE kyc_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kyc_admin_read" ON kyc_submissions;
CREATE POLICY "kyc_admin_read" ON kyc_submissions
  FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('super_admin', 'country_admin')
    OR business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ─── 16. FRAUD_ALERTS: admin compliance page ──────────────────────────────
CREATE TABLE IF NOT EXISTS fraud_alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id),
  user_id     UUID REFERENCES user_profiles(id),
  type        TEXT NOT NULL,   -- chargeback, suspicious_activity, duplicate_account, etc.
  severity    TEXT DEFAULT 'medium',  -- low, medium, high, critical
  description TEXT,
  status      TEXT DEFAULT 'open',    -- open, investigating, resolved, dismissed
  resolved_by UUID REFERENCES user_profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fraud_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fraud_alerts_admin" ON fraud_alerts;
CREATE POLICY "fraud_alerts_admin" ON fraud_alerts
  FOR ALL USING (
    (SELECT role FROM user_profiles WHERE id = auth.uid()) IN ('super_admin', 'country_admin')
  );

-- ─── 17. PAYMENTS TABLE: admin finance + business payments page ────────────
-- The app queries 'payments' table in payments page
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  reference       TEXT UNIQUE NOT NULL,
  type            TEXT NOT NULL DEFAULT 'sale',
  amount          NUMERIC(15,2) NOT NULL,
  fee             NUMERIC(15,2) DEFAULT 0,
  net_amount      NUMERIC(15,2),
  currency        TEXT DEFAULT 'GHS',
  method          TEXT NOT NULL,
  provider        TEXT,
  provider_ref    TEXT,
  status          TEXT NOT NULL DEFAULT 'completed',
  description     TEXT,
  sale_id         UUID REFERENCES sales(id),
  customer_name   TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_business ON payments(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_created  ON payments(created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_owner" ON payments;
CREATE POLICY "payments_owner" ON payments
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

-- ─── 18. DELIVERY_ORDERS: reconcile app-facing column names ──────────────
ALTER TABLE delivery_orders
  ADD COLUMN IF NOT EXISTS delivery_ref  TEXT,  -- generated short reference like DEL-XXXXXX
  ADD COLUMN IF NOT EXISTS rider_name    TEXT,
  ADD COLUMN IF NOT EXISTS eta_minutes   INT,
  ADD COLUMN IF NOT EXISTS fee           NUMERIC(10,2) GENERATED ALWAYS AS (delivery_fee) STORED;

-- Generate delivery_ref for existing rows
UPDATE delivery_orders SET delivery_ref = 'DEL-' || UPPER(SUBSTRING(id::text, 1, 6)) WHERE delivery_ref IS NULL;

-- Add full_name to delivery_riders for direct lookup
ALTER TABLE delivery_riders
  ADD COLUMN IF NOT EXISTS full_name    TEXT,
  ADD COLUMN IF NOT EXISTS trips_today  INT DEFAULT 0;

-- Back-fill full_name from user_profiles
UPDATE delivery_riders dr
SET full_name = up.full_name
FROM user_profiles up
WHERE dr.id = up.id AND dr.full_name IS NULL;

-- View for delivery riders with profile data
CREATE OR REPLACE VIEW delivery_riders_view AS
  SELECT
    dr.id, dr.vehicle_type, dr.plate_number, dr.is_available,
    dr.current_lat, dr.current_lng, dr.zone, dr.rating,
    dr.total_trips, dr.trips_today, dr.created_at,
    COALESCE(dr.full_name, up.full_name) AS full_name,
    up.phone, up.avatar_url
  FROM delivery_riders dr
  JOIN user_profiles up ON up.id = dr.id;

-- ─── 19. REPUTATION / TRUST SCORES: reputation dashboard page ─────────────
CREATE TABLE IF NOT EXISTS reputation_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  type        TEXT NOT NULL,   -- review, dispute, verification, sale_milestone
  points      INT NOT NULL DEFAULT 0,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 20. HELPER FUNCTIONS ────────────────────────────────────────────────────

-- Function to auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_profiles', 'businesses', 'products', 'services',
    'crm_customers', 'invoices', 'job_listings', 'job_applications',
    'worker_profiles', 'purchase_orders', 'marketing_campaigns',
    'ai_conversations', 'ai_insights', 'wallets', 'payment_transactions',
    'business_credit_scores', 'inventory_items'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_timestamp ON %I;
       CREATE TRIGGER set_timestamp BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();',
      t, t
    );
  END LOOP;
END;
$$;

-- ─── 21. FULL-TEXT SEARCH: businesses ────────────────────────────────────
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS search_vector TSVECTOR
    GENERATED ALWAYS AS (
      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
      setweight(to_tsvector('english', coalesce(tagline, '')), 'B') ||
      setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
      setweight(to_tsvector('english', coalesce(city, '')), 'D')
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_businesses_fts ON businesses USING GIN(search_vector);

-- ─── 22. SYSTEM HEALTH TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES
  ('platform', '{"name": "KENUXA", "version": "2.0.0", "environment": "production"}'),
  ('limits',   '{"free_products": 100, "free_staff": 5, "free_invoices_per_month": 25}')
ON CONFLICT (key) DO NOTHING;

-- ─── 23. MARKETPLACE & SERVICE LISTINGS VIEWS ────────────────────────────────
-- App uses `marketplace_listings`; underlying table is `products`
CREATE OR REPLACE VIEW marketplace_listings AS
  SELECT
    p.*,
    b.name  AS business_name,
    b.city  AS business_city
  FROM products p
  JOIN businesses b ON b.id = p.business_id
  WHERE p.is_active = true;

-- App uses `service_listings`; underlying table is `services`
CREATE OR REPLACE VIEW service_listings AS
  SELECT
    s.*,
    b.name AS business_name,
    b.city AS business_city
  FROM services s
  JOIN businesses b ON b.id = s.business_id;

-- ─── 24. BUSINESS REPUTATION VIEW ────────────────────────────────────────────
-- Reputation page queries `business_reputation`; derive from businesses + reputation_events
CREATE TABLE IF NOT EXISTS business_reputation (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  trust_score           NUMERIC(5,2) DEFAULT 0,
  overall_score         NUMERIC(3,1) DEFAULT 0,
  avg_rating            NUMERIC(3,2) DEFAULT 0,
  total_reviews         INT DEFAULT 0,
  rating_dist           JSONB DEFAULT '[]',
  response_rate         NUMERIC(5,2) DEFAULT 0,
  verification_score    NUMERIC(5,2) DEFAULT 0,
  payment_score         NUMERIC(5,2) DEFAULT 0,
  satisfaction_score    NUMERIC(5,2) DEFAULT 0,
  completion_score      NUMERIC(5,2) DEFAULT 0,
  response_score        NUMERIC(5,2) DEFAULT 0,
  sentiment_pos         INT DEFAULT 0,
  sentiment_neu         INT DEFAULT 0,
  sentiment_neg         INT DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_biz_reputation_biz ON business_reputation(business_id);

ALTER TABLE business_reputation ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "business_reputation_owner" ON business_reputation;
CREATE POLICY "business_reputation_owner" ON business_reputation
  USING (business_id IN (
    SELECT business_id FROM user_profiles WHERE id = auth.uid()
  ));

-- ─── 25. BUSINESS WALLETS VIEW ────────────────────────────────────────────────
-- Payments page uses `business_wallets`; underlying is `wallets` with business_id
CREATE OR REPLACE VIEW business_wallets AS
  SELECT * FROM wallets;

-- ─── 26. PAYMENT TRANSACTION REF ALIAS ───────────────────────────────────────
-- App uses `transaction_ref`; schema column may be `reference`
DO $$
BEGIN
  -- Add transaction_ref if only reference exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'reference'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_transactions' AND column_name = 'transaction_ref'
  ) THEN
    ALTER TABLE payment_transactions ADD COLUMN transaction_ref TEXT GENERATED ALWAYS AS (reference) STORED;
  END IF;
END;
$$;

-- ─── 27. DISPUTES VIEW ────────────────────────────────────────────────────────
-- Admin compliance uses `disputes`; underlying may be `business_disputes`
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'disputes') THEN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'business_disputes') THEN
      -- Ensure business_disputes has the columns the app expects
      EXECUTE 'ALTER TABLE business_disputes ADD COLUMN IF NOT EXISTS order_ref TEXT';
      EXECUTE 'ALTER TABLE business_disputes ADD COLUMN IF NOT EXISTS buyer_name TEXT';
      EXECUTE 'ALTER TABLE business_disputes ADD COLUMN IF NOT EXISTS seller_name TEXT';
      EXECUTE 'ALTER TABLE business_disputes ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) DEFAULT 0';
      EXECUTE 'ALTER TABLE business_disputes ADD COLUMN IF NOT EXISTS reason TEXT';
      EXECUTE 'CREATE OR REPLACE VIEW disputes AS SELECT * FROM business_disputes';
    ELSE
      EXECUTE '
        CREATE TABLE IF NOT EXISTS disputes (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
          order_ref     TEXT,
          buyer_name    TEXT,
          seller_name   TEXT,
          amount        NUMERIC(12,2) DEFAULT 0,
          reason        TEXT,
          type          TEXT NOT NULL DEFAULT ''general'',
          description   TEXT,
          status        TEXT NOT NULL DEFAULT ''open'' CHECK (status IN (''open'',''under_review'',''resolved'',''closed'')),
          raised_by     UUID REFERENCES user_profiles(id),
          resolved_by   UUID REFERENCES user_profiles(id),
          resolution    TEXT,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )';
    END IF;
  END IF;
END;
$$;

-- Only enable RLS if disputes is a real table (not a view)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'disputes'
  ) THEN
    EXECUTE 'ALTER TABLE disputes ENABLE ROW LEVEL SECURITY';
  END IF;
END;
$$;

-- ─── 28. ADMIN FINANCE TABLES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_settlements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  business_name   TEXT,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  due_date        DATE,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','settled','failed')),
  reference       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_fees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  fee_type        TEXT NOT NULL DEFAULT 'transaction',
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  source_ref      TEXT,
  collected_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS escrow_holds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID REFERENCES businesses(id) ON DELETE CASCADE,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','forfeited')),
  held_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  release_date    DATE,
  released_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin-only RLS for finance tables
ALTER TABLE pending_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees       ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds        ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_only_settlements" ON pending_settlements;
CREATE POLICY "admin_only_settlements" ON pending_settlements
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')
  ));

DROP POLICY IF EXISTS "admin_only_fees" ON platform_fees;
CREATE POLICY "admin_only_fees" ON platform_fees
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')
  ));

DROP POLICY IF EXISTS "admin_only_escrow" ON escrow_holds;
CREATE POLICY "admin_only_escrow" ON escrow_holds
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')
  ));

-- ─── 29. PRODUCTS TABLE: ensure marketplace columns ──────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_price     NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS stock_qty         INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INT NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS is_verified       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_rating        NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS total_sold        INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS city              TEXT,
  ADD COLUMN IF NOT EXISTS category          TEXT,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN NOT NULL DEFAULT true;

-- Sync is_active from status
UPDATE products SET is_active = (status = 'active') WHERE is_active IS DISTINCT FROM (status = 'active');

-- ─── 30. SERVICES TABLE: ensure service_listings columns ─────────────────────
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS provider_name    TEXT,
  ADD COLUMN IF NOT EXISTS price_type       TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS turnaround       TEXT,
  ADD COLUMN IF NOT EXISTS location         TEXT,
  ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_rating       NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS total_jobs       INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'active';

-- Back-fill provider_name from businesses join
UPDATE services s SET provider_name = b.name FROM businesses b WHERE b.id = s.business_id AND s.provider_name IS NULL;

-- ─── 31. PENDING_SETTLEMENTS: ensure transaction_count column ────────────────
ALTER TABLE pending_settlements
  ADD COLUMN IF NOT EXISTS transaction_count INT NOT NULL DEFAULT 0;

-- ─── GRANT PERMISSIONS ───────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON businesses, products, services, job_listings, business_categories, product_categories TO anon;
GRANT SELECT ON marketplace_listings, service_listings TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
