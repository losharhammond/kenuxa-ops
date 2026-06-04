-- =============================================================================
-- KENUXA PHASE 5 MIGRATION — Identity-First Multi-Role Architecture
-- Run after phase4_migration.sql
-- =============================================================================

-- ─── 80. USER_ROLES — multi-role assignments ─────────────────────────────────
-- Each user can hold many roles simultaneously.
CREATE TABLE IF NOT EXISTS user_roles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_by TEXT NOT NULL DEFAULT 'self',  -- 'self' | 'admin' | 'business'
  metadata     JSONB,                          -- e.g. {business_id, branch_id}
  UNIQUE (user_id, role)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own roles" ON user_roles;
CREATE POLICY "Users see own roles" ON user_roles FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users insert own roles" ON user_roles;
CREATE POLICY "Users insert own roles" ON user_roles FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins manage all roles" ON user_roles;
CREATE POLICY "Admins manage all roles" ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'country_admin')
    )
  );
GRANT ALL ON user_roles TO authenticated;
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- ─── 81. ROLE_SWITCH_HISTORY ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_switch_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_role   TEXT,
  to_role     TEXT NOT NULL,
  switched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE role_switch_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own switch history" ON role_switch_history;
CREATE POLICY "Users see own switch history" ON role_switch_history FOR ALL
  USING (user_id = auth.uid());
GRANT ALL ON role_switch_history TO authenticated;
CREATE INDEX IF NOT EXISTS idx_switch_history_user ON role_switch_history(user_id);

-- ─── 82. USER_CONTEXTS — persisted active role context ───────────────────────
CREATE TABLE IF NOT EXISTS user_contexts (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_role  TEXT NOT NULL DEFAULT 'customer',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_contexts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own context" ON user_contexts;
CREATE POLICY "Users manage own context" ON user_contexts FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON user_contexts TO authenticated;

-- ─── 83. IDENTITY_VERIFICATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS identity_verifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,   -- 'national_id' | 'passport' | 'drivers_license' | 'ghana_card'
  status       TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  document_url TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  UUID REFERENCES auth.users(id),
  notes        TEXT
);

ALTER TABLE identity_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own verifications" ON identity_verifications;
CREATE POLICY "Users see own verifications" ON identity_verifications FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users submit verifications" ON identity_verifications;
CREATE POLICY "Users submit verifications" ON identity_verifications FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins review verifications" ON identity_verifications;
CREATE POLICY "Admins review verifications" ON identity_verifications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );
GRANT ALL ON identity_verifications TO authenticated;
CREATE INDEX IF NOT EXISTS idx_identity_verif_user ON identity_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_verif_status ON identity_verifications(status);

-- ── PREREQUISITE: wallets.user_id (schema.sql used owner_id) ────────────────
-- Adds user_id if wallets was created by schema.sql with owner_id instead.
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE wallets SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
-- Also add status column if missing
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- ─── 84. WALLETS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  balance      NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency     TEXT NOT NULL DEFAULT 'GHS',
  status       TEXT NOT NULL DEFAULT 'active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own wallet" ON wallets;
CREATE POLICY "Users see own wallet" ON wallets FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "System manages wallets" ON wallets;
CREATE POLICY "System manages wallets" ON wallets FOR ALL
  USING (user_id = auth.uid());
GRANT ALL ON wallets TO authenticated;
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- ─── 85. REWARDS_ACCOUNTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rewards_accounts (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points       INT NOT NULL DEFAULT 0,
  lifetime_points INT NOT NULL DEFAULT 0,
  tier         TEXT NOT NULL DEFAULT 'bronze',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rewards_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own rewards" ON rewards_accounts;
CREATE POLICY "Users see own rewards" ON rewards_accounts FOR ALL
  USING (user_id = auth.uid());
GRANT ALL ON rewards_accounts TO authenticated;

-- ─── 86. Seed initial user_roles from existing user_profiles ─────────────────
-- For all existing users, create a user_roles entry matching their current role.
INSERT INTO user_roles (user_id, role, activated_at, activated_by)
SELECT id, role, created_at, 'migration'
FROM user_profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Also add 'customer' role to everyone (base role)
INSERT INTO user_roles (user_id, role, activated_at, activated_by)
SELECT id, 'customer', created_at, 'migration'
FROM user_profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- Seed user_contexts
INSERT INTO user_contexts (user_id, active_role)
SELECT id, role FROM user_profiles
ON CONFLICT (user_id) DO NOTHING;

-- ─── 87. SUPPLIER_PROFILES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name        TEXT NOT NULL,
  description         TEXT,
  product_categories  TEXT[] NOT NULL DEFAULT '{}',
  service_regions     TEXT[] NOT NULL DEFAULT '{}',
  min_order_value     NUMERIC(12,2),
  lead_time_days      INT,
  contact_email       TEXT,
  contact_phone       TEXT,
  website             TEXT,
  status              TEXT NOT NULL DEFAULT 'active',
  verified            BOOLEAN NOT NULL DEFAULT false,
  rating              NUMERIC(3,1) NOT NULL DEFAULT 0,
  reviews_count       INT NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS supplier_profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read supplier profiles" ON supplier_profiles;
CREATE POLICY "Public can read supplier profiles" ON supplier_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own supplier profile" ON supplier_profiles;
CREATE POLICY "Users manage own supplier profile" ON supplier_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON supplier_profiles TO authenticated;
GRANT SELECT ON supplier_profiles TO anon;
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_user ON supplier_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_supplier_profiles_status ON supplier_profiles(status);

-- ─── 88. DELIVERY_RIDERS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_riders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_type    TEXT NOT NULL,
  vehicle_model   TEXT,
  plate_number    TEXT,
  license_number  TEXT,
  service_zones   TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active',
  rating          NUMERIC(3,1) NOT NULL DEFAULT 0,
  deliveries_count INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE IF EXISTS delivery_riders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS delivery_riders ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS delivery_riders ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS delivery_riders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
ALTER TABLE delivery_riders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own rider profile" ON delivery_riders;
CREATE POLICY "Users manage own rider profile" ON delivery_riders FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON delivery_riders TO authenticated;

-- ─── 89. FREELANCER_PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS freelancer_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  tagline         TEXT,
  bio             TEXT,
  skills          TEXT[] NOT NULL DEFAULT '{}',
  categories      TEXT[] NOT NULL DEFAULT '{}',
  hourly_rate     NUMERIC(10,2),
  currency        TEXT NOT NULL DEFAULT 'GHS',
  availability    TEXT NOT NULL DEFAULT 'flexible',
  portfolio_links TEXT[] NOT NULL DEFAULT '{}',
  rating          NUMERIC(3,1) NOT NULL DEFAULT 0,
  reviews_count   INT NOT NULL DEFAULT 0,
  jobs_completed  INT NOT NULL DEFAULT 0,
  total_earned    NUMERIC(15,2) NOT NULL DEFAULT 0,
  verified        BOOLEAN NOT NULL DEFAULT false,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE freelancer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read freelancer profiles" ON freelancer_profiles;
CREATE POLICY "Public read freelancer profiles" ON freelancer_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users manage own freelancer profile" ON freelancer_profiles;
CREATE POLICY "Users manage own freelancer profile" ON freelancer_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON freelancer_profiles TO authenticated;
GRANT SELECT ON freelancer_profiles TO anon;

-- ─── 90. TALENT_PROFILES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS talent_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline        TEXT NOT NULL,
  summary         TEXT,
  skills          TEXT[] NOT NULL DEFAULT '{}',
  experience      JSONB NOT NULL DEFAULT '[]',  -- [{company, title, years, current}]
  education       TEXT,
  certifications  TEXT,
  availability    TEXT NOT NULL DEFAULT 'Immediately',
  job_types       TEXT[] NOT NULL DEFAULT '{}',
  location        TEXT,
  resume_url      TEXT,
  linkedin_url    TEXT,
  portfolio_url   TEXT,
  open_to_work    BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE talent_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read talent profiles" ON talent_profiles;
CREATE POLICY "Public read talent profiles" ON talent_profiles FOR SELECT USING (open_to_work = true);
DROP POLICY IF EXISTS "Users manage own talent profile" ON talent_profiles;
CREATE POLICY "Users manage own talent profile" ON talent_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON talent_profiles TO authenticated;
GRANT SELECT ON talent_profiles TO anon;

-- ─── 91. CUSTOMER_PROFILES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_categories TEXT[] NOT NULL DEFAULT '{}',
  saved_businesses  UUID[] NOT NULL DEFAULT '{}',
  saved_products    UUID[] NOT NULL DEFAULT '{}',
  total_orders      INT NOT NULL DEFAULT 0,
  total_spent       NUMERIC(15,2) NOT NULL DEFAULT 0,
  default_address   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own customer profile" ON customer_profiles;
CREATE POLICY "Users manage own customer profile" ON customer_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON customer_profiles TO authenticated;

-- ─── 92. BUSINESS_MEMBERS — staff assignments ────────────────────────────────
CREATE TABLE IF NOT EXISTS business_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL,   -- 'branch_manager' | 'cashier' | 'employee' | 'recruiter'
  branch_id   UUID,            -- null = applies to whole business
  permissions TEXT[] NOT NULL DEFAULT '{}',  -- module-level overrides
  invited_by  UUID REFERENCES auth.users(id),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active',  -- 'invited' | 'active' | 'removed'
  UNIQUE (business_id, user_id, role)
);
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Business owners manage members" ON business_members;
CREATE POLICY "Business owners manage members" ON business_members FOR ALL
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE id = business_id AND owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "Members see own record" ON business_members;
CREATE POLICY "Members see own record" ON business_members FOR SELECT
  USING (user_id = auth.uid());
GRANT ALL ON business_members TO authenticated;
CREATE INDEX IF NOT EXISTS idx_business_members_biz ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_business_members_user ON business_members(user_id);

-- ─── 93. COUNTRY_ADMINS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS country_admins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  country     TEXT NOT NULL,
  region      TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE country_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Super admins manage country admins" ON country_admins;
CREATE POLICY "Super admins manage country admins" ON country_admins FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
DROP POLICY IF EXISTS "Country admins see own record" ON country_admins;
CREATE POLICY "Country admins see own record" ON country_admins FOR SELECT
  USING (user_id = auth.uid());
GRANT ALL ON country_admins TO authenticated;

-- ─── 94. FINANCIAL_PARTNERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_partners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_name TEXT NOT NULL,
  institution_type TEXT NOT NULL DEFAULT 'bank',  -- 'bank' | 'mfi' | 'fintech' | 'insurer'
  license_number   TEXT,
  country          TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  api_key_hash     TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  verified         BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE financial_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "FP sees own record" ON financial_partners;
CREATE POLICY "FP sees own record" ON financial_partners FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Super admin manages FPs" ON financial_partners;
CREATE POLICY "Super admin manages FPs" ON financial_partners FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'));
GRANT ALL ON financial_partners TO authenticated;

-- ─── 95. AUDIT_LOGS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,   -- 'role_activated' | 'business_created' | 'payment_sent' | etc.
  entity_type TEXT,            -- 'business' | 'user' | 'transaction'
  entity_id   UUID,
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read audit logs" ON audit_logs;
CREATE POLICY "Admins read audit logs" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')));
DROP POLICY IF EXISTS "System inserts audit logs" ON audit_logs;
CREATE POLICY "System inserts audit logs" ON audit_logs FOR INSERT WITH CHECK (true);
GRANT ALL ON audit_logs TO authenticated;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ─── 96. ACTIVITY_FEED ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_feed (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,   -- 'role_activated' | 'business_created' | 'job_applied' | 'review_received' | 'reward_earned' | 'order_placed'
  title       TEXT NOT NULL,
  body        TEXT,
  entity_type TEXT,
  entity_id   UUID,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own feed" ON activity_feed;
CREATE POLICY "Users see own feed" ON activity_feed FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON activity_feed TO authenticated;
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id, created_at DESC);

-- ── PREREQUISITE: notifications column aliases ────────────────────────────
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read_at  TIMESTAMPTZ;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS category  TEXT NOT NULL DEFAULT 'general';
-- Keep is_read in sync with read
UPDATE notifications SET read = is_read WHERE read IS DISTINCT FROM is_read AND is_read IS NOT NULL;

-- ─── 97. NOTIFICATIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- 'info' | 'success' | 'warning' | 'action_required'
  category    TEXT NOT NULL DEFAULT 'general',  -- 'wallet' | 'job' | 'order' | 'kyc' | 'role' | 'system'
  title       TEXT NOT NULL,
  body        TEXT,
  action_url  TEXT,
  action_label TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
CREATE POLICY "Users see own notifications" ON notifications FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON notifications TO authenticated;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
