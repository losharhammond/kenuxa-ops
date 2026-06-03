-- ============================================================
-- KENUXA Phase 16 — Treasury, Exchange Engine & Platform Tables
-- Run after: phase15_missing_tables.sql
-- ============================================================

-- ── PREREQUISITE: wallets.user_id (schema.sql used owner_id) ────────────────
-- Adds user_id if wallets was created by schema.sql with owner_id instead.
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE wallets SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
-- Also add status column if missing
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- ── PREREQUISITES: ensure columns exist on tables created by earlier phases ──
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS)

-- kenux_ledger may have been created by phase12 without these columns
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS reason      TEXT;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS balance_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS reference    TEXT;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS metadata     JSONB DEFAULT '{}'::jsonb;

-- wallets may have been created by phase5 without type/last_tx_at
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS type       TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS last_tx_at TIMESTAMPTZ;
-- Ensure composite unique constraint exists for wallet_credit ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_user_id_type_currency_key' AND conrelid = 'wallets'::regclass
  ) THEN
    -- Drop old single-column unique if present
    ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_id_key;
    ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_type_currency_key UNIQUE (user_id, type, currency);
  END IF;
END;
$$;
-- audit_logs may have been created by phase5 without category/severity/actor/target
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS category   TEXT NOT NULL DEFAULT 'general';
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS severity   TEXT NOT NULL DEFAULT 'info';
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS actor      TEXT;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS target     TEXT;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS target_id  UUID;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE IF EXISTS audit_logs ADD COLUMN IF NOT EXISTS actor_id   UUID;

-- ── PREREQUISITE: notifications column aliases ────────────────────────────
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read_at  TIMESTAMPTZ;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS category  TEXT NOT NULL DEFAULT 'general';
-- Keep is_read in sync with read
UPDATE notifications SET read = is_read WHERE read IS DISTINCT FROM is_read AND is_read IS NOT NULL;

-- platform_revenue: add revenue_type if it was created without it (phase6 only has 'source')
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS revenue_type TEXT;
-- Back-fill revenue_type from source
UPDATE platform_revenue SET revenue_type = source WHERE revenue_type IS NULL;


-- ── Exchange Rates Cache ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT        NOT NULL DEFAULT 'USD',
  to_currency   TEXT        NOT NULL,
  rate          NUMERIC     NOT NULL,
  source        TEXT        NOT NULL DEFAULT 'openexchangerates',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_currency, to_currency)
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_to_currency ON exchange_rates (to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_fetched_at  ON exchange_rates (fetched_at DESC);

-- ── Platform Revenue ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_revenue (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  source       TEXT        NOT NULL,
  revenue_type TEXT        NOT NULL,
  amount       NUMERIC     NOT NULL DEFAULT 0,
  currency     TEXT        NOT NULL DEFAULT 'GHS',
  reference    TEXT,
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id  UUID,
  status       TEXT        NOT NULL DEFAULT 'settled' CHECK (status IN ('pending','settled','refunded')),
  metadata     JSONB       DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_type       ON platform_revenue (revenue_type);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at ON platform_revenue (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_user_id    ON platform_revenue (user_id);

-- ── KENUX Ledger (full double-entry economy ledger) ──────────
CREATE TABLE IF NOT EXISTS kenux_ledger (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type  TEXT        NOT NULL CHECK (entry_type IN ('earn','spend','purchase','transfer','refund','expire','adjustment')),
  points      INTEGER     NOT NULL CHECK (points > 0),
  balance_after INTEGER   NOT NULL DEFAULT 0,
  description TEXT,
  reference   TEXT,
  metadata    JSONB       DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kenux_ledger_user_id    ON kenux_ledger (user_id);
CREATE INDEX IF NOT EXISTS idx_kenux_ledger_type       ON kenux_ledger (entry_type);
CREATE INDEX IF NOT EXISTS idx_kenux_ledger_created_at ON kenux_ledger (created_at DESC);

-- ── Rewards Accounts (KENUX balance) ─────────────────────────
CREATE TABLE IF NOT EXISTS rewards_accounts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  points          INTEGER     NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_points INTEGER     NOT NULL DEFAULT 0,
  tier            TEXT        NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  last_activity   TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rewards_accounts_user_id ON rewards_accounts (user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_accounts_tier    ON rewards_accounts (tier);

-- ── Subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id                 UUID,
  plan_code                   TEXT        NOT NULL,
  plan_name                   TEXT,
  paystack_subscription_code  TEXT        UNIQUE,
  paystack_customer_code      TEXT,
  status                      TEXT        NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','cancelled','expired')),
  trial_ends_at               TIMESTAMPTZ,
  current_period_start        TIMESTAMPTZ,
  current_period_end          TIMESTAMPTZ,
  next_payment_date           TIMESTAMPTZ,
  amount                      NUMERIC     DEFAULT 0,
  currency                    TEXT        DEFAULT 'GHS',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id    ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_code  ON subscriptions (plan_code);

-- ── Wallets ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL DEFAULT 'personal' CHECK (type IN ('personal','business','rewards')),
  balance     NUMERIC     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency    TEXT        NOT NULL DEFAULT 'GHS',
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
  last_tx_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, type, currency)
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets (user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_status  ON wallets (status);

-- ── Business Wallets ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_wallets (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID        NOT NULL UNIQUE,
  balance     NUMERIC     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency    TEXT        NOT NULL DEFAULT 'GHS',
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','closed')),
  last_tx_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_wallets_business_id ON business_wallets (business_id);

-- ── Wallet Transactions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID,
  type        TEXT        NOT NULL CHECK (type IN ('credit','debit','transfer','fee','refund','reversal')),
  amount      NUMERIC     NOT NULL,
  currency    TEXT        NOT NULL DEFAULT 'GHS',
  description TEXT,
  reference   TEXT        UNIQUE,
  provider    TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','reversed')),
  metadata    JSONB       DEFAULT '{}'::jsonb,
  settled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id    ON wallet_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference  ON wallet_transactions (reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status     ON wallet_transactions (status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions (created_at DESC);

-- ── Activity Feed ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_feed (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  body       TEXT,
  data       JSONB       DEFAULT '{}'::jsonb,
  read       BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id    ON activity_feed (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_read       ON activity_feed (read);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed (created_at DESC);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL DEFAULT 'info',
  category   TEXT        NOT NULL DEFAULT 'info',
  title      TEXT        NOT NULL,
  body       TEXT,
  action_url TEXT,
  data       JSONB       DEFAULT '{}'::jsonb,
  read_at    TIMESTAMPTZ,             -- NULL = unread; timestamp = when read
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON notifications (read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);

-- ── KYC Documents ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_documents (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type   TEXT        NOT NULL CHECK (document_type IN ('national_id','passport','drivers_license','voter_id','business_reg','tin','proof_of_address')),
  document_number TEXT,
  file_url        TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  reviewer_id     UUID        REFERENCES auth.users(id),
  review_notes    TEXT,
  reviewed_at     TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status  ON kyc_documents (status);

-- ── Disputes ──────────────────────────────────────────────────
-- Drop view if it was created by an earlier migration (migration.sql compat path)
DROP VIEW IF EXISTS disputes;
CREATE TABLE IF NOT EXISTS disputes (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_id  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  respondent_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL DEFAULT 'transaction',
  subject       TEXT        NOT NULL,
  description   TEXT,
  evidence_urls TEXT[]      DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open','under_review','resolved','closed')),
  resolution    TEXT,
  resolved_by   UUID        REFERENCES auth.users(id),
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_status     ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_initiator  ON disputes (initiator_id);

-- ── Audit Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  actor      TEXT,
  actor_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  action     TEXT        NOT NULL,
  category   TEXT        NOT NULL DEFAULT 'general',
  severity   TEXT        NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  target     TEXT,
  target_id  UUID,
  metadata   JSONB       DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id   ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs (actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category   ON audit_logs (category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity   ON audit_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- ── Credit Profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_profiles (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  kenuxa_score     INTEGER     NOT NULL DEFAULT 300 CHECK (kenuxa_score BETWEEN 0 AND 850),
  trust_score      INTEGER     NOT NULL DEFAULT 300 CHECK (trust_score BETWEEN 0 AND 850),
  business_score   INTEGER     CHECK (business_score BETWEEN 0 AND 850),
  talent_score     INTEGER     CHECK (talent_score BETWEEN 0 AND 850),
  supplier_score   INTEGER     CHECK (supplier_score BETWEEN 0 AND 850),
  risk_tier        TEXT        NOT NULL DEFAULT 'standard' CHECK (risk_tier IN ('low','standard','elevated','high')),
  max_credit_limit NUMERIC     DEFAULT 0,
  last_calculated  TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_profiles_user_id ON credit_profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_credit_profiles_score   ON credit_profiles (kenuxa_score DESC);

-- ── Loan Applications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_applications (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id       UUID,
  type              TEXT        NOT NULL DEFAULT 'working_capital',
  amount            NUMERIC     NOT NULL,
  term_months       INTEGER     NOT NULL DEFAULT 6,
  interest_rate     NUMERIC,
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected','disbursed','repaying','completed','defaulted')),
  partner_id        UUID        REFERENCES auth.users(id),
  kenuxa_score      INTEGER,
  disbursed_at      TIMESTAMPTZ,
  repayment_due_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loan_applications_status  ON loan_applications (status);
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id ON loan_applications (user_id);

-- ── RPC Functions ─────────────────────────────────────────────

-- wallet_credit: credit a user's personal GHS wallet
CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_currency TEXT DEFAULT 'GHS'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO wallets (user_id, type, balance, currency)
  VALUES (p_user_id, 'personal', p_amount, p_currency)
  ON CONFLICT (user_id, type, currency)
  DO UPDATE SET
    balance    = wallets.balance + p_amount,
    last_tx_at = now(),
    updated_at = now();
END;
$$;

-- wallet_debit: debit a user's personal GHS wallet
CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_currency TEXT DEFAULT 'GHS'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE wallets
  SET balance    = balance - p_amount,
      last_tx_at = now(),
      updated_at = now()
  WHERE user_id = p_user_id
    AND type = 'personal'
    AND currency = p_currency
    AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
END;
$$;

-- kenux_credit: earn KENUX points
CREATE OR REPLACE FUNCTION kenux_credit(
  p_user_id UUID,
  p_points  INTEGER,
  p_reason  TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO rewards_accounts (user_id, points, lifetime_points)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    points          = rewards_accounts.points + p_points,
    lifetime_points = rewards_accounts.lifetime_points + p_points,
    last_activity   = now(),
    updated_at      = now()
  RETURNING points INTO v_new_balance;

  -- Update tier
  UPDATE rewards_accounts SET
    tier = CASE
      WHEN v_new_balance >= 20000 THEN 'platinum'
      WHEN v_new_balance >= 5000  THEN 'gold'
      WHEN v_new_balance >= 1000  THEN 'silver'
      ELSE 'bronze'
    END
  WHERE user_id = p_user_id;

  -- Record in ledger
  INSERT INTO kenux_ledger (user_id, entry_type, points, balance_after, description)
  VALUES (p_user_id, 'earn', p_points, COALESCE(v_new_balance, 0), p_reason);
END;
$$;

-- kenux_debit: spend KENUX points
CREATE OR REPLACE FUNCTION kenux_debit(
  p_user_id UUID,
  p_points  INTEGER,
  p_reason  TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE rewards_accounts
  SET points        = points - p_points,
      last_activity = now(),
      updated_at    = now()
  WHERE user_id = p_user_id
    AND points >= p_points
  RETURNING points INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient KENUX balance';
  END IF;

  -- Record in ledger
  INSERT INTO kenux_ledger (user_id, entry_type, points, balance_after, description)
  VALUES (p_user_id, 'spend', p_points, COALESCE(v_new_balance, 0), p_reason);
END;
$$;

-- business_wallet_credit: credit a business wallet
CREATE OR REPLACE FUNCTION business_wallet_credit(
  p_business_id UUID,
  p_amount      NUMERIC,
  p_currency    TEXT DEFAULT 'GHS'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO business_wallets (business_id, balance, currency)
  VALUES (p_business_id, p_amount, p_currency)
  ON CONFLICT (business_id)
  DO UPDATE SET
    balance    = business_wallets.balance + p_amount,
    last_tx_at = now(),
    updated_at = now();
END;
$$;

-- business_wallet_debit: debit a business wallet
CREATE OR REPLACE FUNCTION business_wallet_debit(
  p_business_id UUID,
  p_amount      NUMERIC,
  p_currency    TEXT DEFAULT 'GHS'
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE business_wallets
  SET balance    = balance - p_amount,
      last_tx_at = now(),
      updated_at = now()
  WHERE business_id = p_business_id
    AND balance >= p_amount;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient business wallet balance';
  END IF;
END;
$$;

-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE exchange_rates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kenux_ledger         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_wallets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications    ENABLE ROW LEVEL SECURITY;

-- Exchange rates: public read (needed for calculator/treasury UI)
DROP POLICY IF EXISTS "exchange_rates_read_all" ON exchange_rates;
CREATE POLICY "exchange_rates_read_all" ON exchange_rates FOR SELECT USING (true);

-- Platform revenue: service role only
DROP POLICY IF EXISTS "platform_revenue_service_only" ON platform_revenue;
CREATE POLICY "platform_revenue_service_only" ON platform_revenue USING (false);

-- KENUX ledger: users see own records; only service_role can insert
DROP POLICY IF EXISTS "kenux_ledger_own" ON kenux_ledger;
CREATE POLICY "kenux_ledger_own" ON kenux_ledger FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "kenux_ledger_insert_service" ON kenux_ledger;
CREATE POLICY "kenux_ledger_insert_service" ON kenux_ledger FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Rewards: users see own; only service_role can write (RPCs use SECURITY DEFINER)
DROP POLICY IF EXISTS "rewards_own_select" ON rewards_accounts;
CREATE POLICY "rewards_own_select" ON rewards_accounts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "rewards_own_upsert" ON rewards_accounts;
CREATE POLICY "rewards_own_upsert" ON rewards_accounts FOR INSERT WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "rewards_own_update" ON rewards_accounts;
CREATE POLICY "rewards_own_update" ON rewards_accounts FOR UPDATE USING (auth.role() = 'service_role');

-- Subscriptions
DROP POLICY IF EXISTS "subs_own" ON subscriptions;
CREATE POLICY "subs_own"    ON subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "subs_insert" ON subscriptions;
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallets
DROP POLICY IF EXISTS "wallets_own_select" ON wallets;
CREATE POLICY "wallets_own_select" ON wallets FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallets_service" ON wallets;
CREATE POLICY "wallets_service"    ON wallets FOR ALL  USING (auth.role() = 'service_role');

-- Business wallets: service-role only for mutations
DROP POLICY IF EXISTS "biz_wallets_service" ON business_wallets;
CREATE POLICY "biz_wallets_service" ON business_wallets FOR ALL USING (auth.role() = 'service_role');

-- Wallet transactions: own records
DROP POLICY IF EXISTS "wallet_tx_own" ON wallet_transactions;
CREATE POLICY "wallet_tx_own"     ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wallet_tx_service" ON wallet_transactions;
CREATE POLICY "wallet_tx_service" ON wallet_transactions FOR INSERT WITH CHECK (auth.role() = 'service_role');
DROP POLICY IF EXISTS "wallet_tx_update" ON wallet_transactions;
CREATE POLICY "wallet_tx_update"  ON wallet_transactions FOR UPDATE USING (auth.role() = 'service_role');

-- Activity feed: own only
DROP POLICY IF EXISTS "activity_own" ON activity_feed;
CREATE POLICY "activity_own" ON activity_feed FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "activity_ins" ON activity_feed;
CREATE POLICY "activity_ins" ON activity_feed FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Notifications: own only
DROP POLICY IF EXISTS "notif_own" ON notifications;
CREATE POLICY "notif_own"    ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_upd" ON notifications;
CREATE POLICY "notif_upd"    ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_ins" ON notifications;
CREATE POLICY "notif_ins"    ON notifications FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ── Notification helpers ──────────────────────────────────────
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE notifications
  SET read_at = now()
  WHERE user_id = p_user_id
    AND read_at IS NULL;
END;
$$;

-- KYC: own + service
DROP POLICY IF EXISTS "kyc_own" ON kyc_documents;
CREATE POLICY "kyc_own"     ON kyc_documents FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_insert" ON kyc_documents;
CREATE POLICY "kyc_insert"  ON kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "kyc_service" ON kyc_documents;
CREATE POLICY "kyc_service" ON kyc_documents FOR UPDATE USING (auth.role() = 'service_role');

-- Disputes: own
DROP POLICY IF EXISTS "disputes_own" ON disputes;
CREATE POLICY "disputes_own"    ON disputes FOR SELECT USING (auth.uid() = initiator_id OR auth.uid() = respondent_id);
DROP POLICY IF EXISTS "disputes_insert" ON disputes;
CREATE POLICY "disputes_insert" ON disputes FOR INSERT WITH CHECK (auth.uid() = initiator_id);
DROP POLICY IF EXISTS "disputes_update" ON disputes;
CREATE POLICY "disputes_update" ON disputes FOR UPDATE USING (auth.role() = 'service_role');

-- Audit logs: service role only (admins read via service_role client)
DROP POLICY IF EXISTS "audit_service" ON audit_logs;
CREATE POLICY "audit_service" ON audit_logs FOR ALL USING (auth.role() = 'service_role');

-- Credit profiles: own read; service role for writes
DROP POLICY IF EXISTS "credit_own" ON credit_profiles;
CREATE POLICY "credit_own"    ON credit_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "credit_upsert" ON credit_profiles;
CREATE POLICY "credit_upsert" ON credit_profiles FOR ALL  USING (auth.role() = 'service_role');

-- Loan applications: own
DROP POLICY IF EXISTS "loans_own_select" ON loan_applications;
CREATE POLICY "loans_own_select" ON loan_applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "loans_own_insert" ON loan_applications;
CREATE POLICY "loans_own_insert" ON loan_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "loans_service" ON loan_applications;
CREATE POLICY "loans_service"    ON loan_applications FOR UPDATE USING (auth.role() = 'service_role');

-- ── GRANTS ────────────────────────────────────────────────────
GRANT SELECT ON exchange_rates     TO anon, authenticated;
GRANT ALL    ON exchange_rates     TO service_role;
GRANT ALL    ON platform_revenue   TO service_role;
GRANT SELECT, INSERT ON kenux_ledger        TO authenticated;
GRANT ALL            ON kenux_ledger        TO service_role;
GRANT SELECT, INSERT, UPDATE ON rewards_accounts TO authenticated;
GRANT ALL                    ON rewards_accounts TO service_role;
GRANT SELECT, INSERT ON subscriptions       TO authenticated;
GRANT ALL            ON subscriptions       TO service_role;
GRANT SELECT         ON wallets             TO authenticated;
GRANT ALL            ON wallets             TO service_role;
GRANT ALL            ON business_wallets    TO service_role;
GRANT SELECT, INSERT ON wallet_transactions TO authenticated;
GRANT ALL            ON wallet_transactions TO service_role;
GRANT SELECT, INSERT ON activity_feed       TO authenticated;
GRANT ALL            ON activity_feed       TO service_role;
GRANT SELECT, INSERT, UPDATE ON notifications    TO authenticated;
GRANT ALL                    ON notifications    TO service_role;
GRANT SELECT, INSERT ON kyc_documents       TO authenticated;
GRANT ALL            ON kyc_documents       TO service_role;
GRANT SELECT, INSERT ON disputes            TO authenticated;
GRANT ALL            ON disputes            TO service_role;
GRANT ALL            ON audit_logs          TO service_role;
GRANT SELECT         ON audit_logs          TO authenticated;
GRANT SELECT         ON credit_profiles     TO authenticated;
GRANT ALL            ON credit_profiles     TO service_role;
GRANT SELECT, INSERT ON loan_applications   TO authenticated;
GRANT ALL            ON loan_applications   TO service_role;

-- ── wallet_transfer RPC ───────────────────────────────────────
-- Atomic wallet-to-wallet transfer with double-entry integrity.
CREATE OR REPLACE FUNCTION wallet_transfer(
  p_sender_id   UUID,
  p_receiver_id UUID,
  p_amount      NUMERIC,
  p_currency    TEXT DEFAULT 'GHS',
  p_note        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance   NUMERIC;
  v_reference        TEXT;
BEGIN
  -- Lock sender personal wallet row to prevent race conditions
  SELECT balance INTO v_sender_balance
  FROM wallets
  WHERE user_id = p_sender_id AND type = 'personal' AND currency = p_currency
  FOR UPDATE;

  IF v_sender_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for sender';
  END IF;

  IF v_sender_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_sender_balance, p_amount;
  END IF;

  -- Ensure receiver personal wallet exists (upsert)
  INSERT INTO wallets (user_id, type, balance, currency, status)
  VALUES (p_receiver_id, 'personal', 0, p_currency, 'active')
  ON CONFLICT (user_id, type, currency) DO NOTHING;

  -- Debit sender
  UPDATE wallets
  SET balance = balance - p_amount, last_tx_at = now(), updated_at = now()
  WHERE user_id = p_sender_id AND type = 'personal' AND currency = p_currency;

  -- Credit receiver
  UPDATE wallets
  SET balance = balance + p_amount, last_tx_at = now(), updated_at = now()
  WHERE user_id = p_receiver_id AND type = 'personal' AND currency = p_currency;

  -- Generate reference
  v_reference := 'TRF-' || upper(substring(gen_random_uuid()::text, 1, 12));

  RETURN jsonb_build_object(
    'ok',             true,
    'reference',      v_reference,
    'sender_balance', v_sender_balance - p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION wallet_transfer TO service_role;
