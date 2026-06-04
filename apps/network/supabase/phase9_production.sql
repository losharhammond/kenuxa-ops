-- ============================================================
-- KENUXA BUSINESS NETWORK — Phase 9 Production Migration
-- Economic Network: Credit, KENUX, Treasury, Notifications,
-- Security, Audit, Exchange Rates, Repayments
-- ============================================================

-- ── PREREQUISITE: wallets.user_id (schema.sql used owner_id) ────────────────
-- Adds user_id if wallets was created by schema.sql with owner_id instead.
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE wallets SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
-- Also add status column if missing
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- ── PREREQUISITES ───────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS last_tx_at TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wallets_user_id_type_currency_key' AND conrelid = 'wallets'::regclass
  ) THEN
    ALTER TABLE wallets DROP CONSTRAINT IF EXISTS wallets_user_id_key;
    ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_type_currency_key UNIQUE (user_id, type, currency);
  END IF;
END;
$$;
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS revenue_type TEXT;
UPDATE platform_revenue SET revenue_type = source WHERE revenue_type IS NULL;

-- ── Credit Profiles ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kenuxa_score    INTEGER NOT NULL DEFAULT 500 CHECK (kenuxa_score BETWEEN 0 AND 850),
  trust_score     INTEGER NOT NULL DEFAULT 50  CHECK (trust_score BETWEEN 0 AND 100),
  business_score  INTEGER CHECK (business_score BETWEEN 0 AND 850),
  talent_score    INTEGER CHECK (talent_score BETWEEN 0 AND 850),
  supplier_score  INTEGER CHECK (supplier_score BETWEEN 0 AND 850),
  reputation_score INTEGER NOT NULL DEFAULT 50 CHECK (reputation_score BETWEEN 0 AND 100),
  last_calculated TIMESTAMPTZ NOT NULL DEFAULT now(),
  score_factors   JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ── KENUX / Rewards Transactions ─────────────────────────────
CREATE TABLE IF NOT EXISTS kenux_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('earn','spend','purchase','refund','reward','expire')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference   TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Ensure rewards_accounts exists with proper columns
CREATE TABLE IF NOT EXISTS rewards_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points           INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_points  INTEGER NOT NULL DEFAULT 0,
  tier             TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- ── Wallets (ledger-driven — never SUM transactions) ─────────
CREATE TABLE IF NOT EXISTS wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'personal' CHECK (type IN ('personal','business','rewards')),
  balance     NUMERIC(18,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  currency    TEXT NOT NULL DEFAULT 'GHS',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen','suspended','closed')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, type, currency)
);

-- ── Wallet Transactions (immutable double-entry ledger) ───────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_id           UUID REFERENCES wallets(id),
  type                TEXT NOT NULL CHECK (type IN ('credit','debit','transfer_in','transfer_out','refund','fee','reward')),
  amount              NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency            TEXT NOT NULL DEFAULT 'GHS',
  description         TEXT NOT NULL,
  reference           TEXT UNIQUE,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','reversed')),
  provider            TEXT DEFAULT 'internal',
  provider_reference  TEXT,
  metadata            JSONB DEFAULT '{}',
  balance_before      NUMERIC(18,2),
  balance_after       NUMERIC(18,2),
  settled_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- ── Exchange Rates (live FX — treasury) ──────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL DEFAULT 'USD',
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(18,6) NOT NULL,
  source        TEXT DEFAULT 'openexchangerates',
  fetched_at    TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_currency, to_currency, fetched_at)
);

-- Seed initial exchange rates (approximate — update via API)
INSERT INTO exchange_rates (from_currency, to_currency, rate, source) VALUES
  ('USD','GHS',14.50,'seed'),
  ('USD','NGN',1610.00,'seed'),
  ('USD','KES',130.00,'seed'),
  ('USD','ZAR',18.50,'seed'),
  ('USD','ETB',56.00,'seed'),
  ('USD','UGX',3750.00,'seed'),
  ('USD','TZS',2680.00,'seed'),
  ('USD','RWF',1300.00,'seed'),
  ('USD','XOF',620.00,'seed'),
  ('USD','XAF',620.00,'seed'),
  ('USD','MWK',1740.00,'seed'),
  ('USD','SLL',19700.00,'seed')
ON CONFLICT DO NOTHING;

-- ── Platform Revenue (monetization tracking) ─────────────────
CREATE TABLE IF NOT EXISTS platform_revenue (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference    TEXT UNIQUE,
  revenue_type TEXT NOT NULL CHECK (revenue_type IN (
    'subscription','marketplace_fee','transaction_fee','advertising',
    'kenux_purchase','ai_usage','api_usage','delivery_fee',
    'escrow_fee','settlement_fee','loan_referral','insurance','enterprise'
  )),
  amount       NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'GHS',
  user_id      UUID REFERENCES auth.users(id),
  business_id  UUID,
  status       TEXT NOT NULL DEFAULT 'settled' CHECK (status IN ('pending','settled','refunded')),
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Loan Applications ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id  UUID,
  type         TEXT NOT NULL CHECK (type IN (
    'working_capital','inventory_finance','invoice_finance',
    'bnpl','equipment','revenue_advance','supplier_credit'
  )),
  amount       NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  term_months  INTEGER NOT NULL DEFAULT 12 CHECK (term_months > 0),
  purpose      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','under_review','approved','rejected',
    'disbursed','repaying','closed','defaulted'
  )),
  interest_rate NUMERIC(6,3),
  reviewed_by  UUID REFERENCES auth.users(id),
  reviewed_at  TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  notes        TEXT,
  documents    JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Loan Repayments ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_repayments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id         UUID NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  amount          NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  principal       NUMERIC(18,2),
  interest        NUMERIC(18,2),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','late')),
  due_date        DATE NOT NULL,
  paid_at         TIMESTAMPTZ,
  reference       TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── KYC Documents ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type      TEXT NOT NULL CHECK (doc_type IN (
    'national_id','passport','drivers_license','voters_id',
    'tin_certificate','business_reg','utility_bill','bank_statement','selfie'
  )),
  doc_url       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by   UUID REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at    DATE,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Notifications ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link        TEXT,
  read        BOOLEAN NOT NULL DEFAULT false,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Audit Logs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  resource    TEXT NOT NULL,
  resource_id TEXT,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Paystack Transfers (outbound payouts) ─────────────────────
CREATE TABLE IF NOT EXISTS paystack_transfers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id),
  recipient_name   TEXT,
  account_number   TEXT,
  bank_name        TEXT,
  bank_code        TEXT,
  amount           NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency         TEXT NOT NULL DEFAULT 'GHS',
  transfer_code    TEXT,
  recipient_code   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','reversed','otp')),
  reason           TEXT,
  reference        TEXT UNIQUE,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- ── Escrow Holds ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_holds (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID,
  buyer_id     UUID REFERENCES auth.users(id),
  seller_id    UUID REFERENCES auth.users(id),
  buyer_name   TEXT,
  seller_name  TEXT,
  amount       NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency     TEXT NOT NULL DEFAULT 'GHS',
  status       TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','disputed','refunded')),
  held_since   TIMESTAMPTZ DEFAULT now(),
  release_date TIMESTAMPTZ,
  released_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- ── Pending Settlements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_settlements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID,
  business_name     TEXT NOT NULL,
  amount            NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency          TEXT NOT NULL DEFAULT 'GHS',
  transaction_count INTEGER NOT NULL DEFAULT 1,
  period_start      DATE,
  period_end        DATE,
  due_date          DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '3 days'),
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','on_hold','failed')),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ── Security Events ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  event_type  TEXT NOT NULL CHECK (event_type IN (
    'login','logout','failed_login','password_change','mfa_enable',
    'mfa_disable','suspicious_activity','device_trust','rate_limited',
    'fraud_flag','account_locked','kyc_submitted','kyc_approved'
  )),
  severity    TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','error','critical')),
  ip_address  INET,
  user_agent  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Platform Fees (legacy alias to platform_revenue) ─────────
-- platform_fees is queried by some admin pages — alias via view
CREATE OR REPLACE VIEW platform_fees AS
  SELECT id, reference, revenue_type AS fee_type, amount, currency, user_id, status,
         metadata, created_at
  FROM platform_revenue;

-- ── Image columns (ADD IF NOT EXISTS) ────────────────────────
ALTER TABLE businesses           ADD COLUMN IF NOT EXISTS logo_url    TEXT;
ALTER TABLE businesses           ADD COLUMN IF NOT EXISTS banner_url  TEXT;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS image_url   TEXT;
ALTER TABLE service_listings     ADD COLUMN IF NOT EXISTS image_url   TEXT;
ALTER TABLE job_listings         ADD COLUMN IF NOT EXISTS company_logo_url TEXT;
ALTER TABLE user_profiles        ADD COLUMN IF NOT EXISTS avatar_url  TEXT;
ALTER TABLE user_profiles        ADD COLUMN IF NOT EXISTS bio         TEXT;
ALTER TABLE user_profiles        ADD COLUMN IF NOT EXISTS website     TEXT;
ALTER TABLE user_profiles        ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credit_profiles_user_id        ON credit_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_kenux_transactions_user_id     ON kenux_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_kenux_transactions_created_at  ON kenux_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id                ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id    ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference  ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created_at    ON platform_revenue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_type          ON platform_revenue(revenue_type);
ALTER TABLE IF EXISTS loan_applications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_loan_applications_user_id      ON loan_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_loan_applications_status       ON loan_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id          ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status           ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id          ON notifications(user_id);
-- ── PREREQUISITE: notifications column aliases ────────────────────────────
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS read_at  TIMESTAMPTZ;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS category  TEXT NOT NULL DEFAULT 'general';
-- Keep is_read in sync with read
UPDATE notifications SET read = is_read WHERE read IS DISTINCT FROM is_read AND is_read IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_read             ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id             ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at          ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id        ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at     ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies      ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_status            ON escrow_holds(status);
CREATE INDEX IF NOT EXISTS idx_pending_settlements_status     ON pending_settlements(status);

-- ── RLS Policies ──────────────────────────────────────────────
ALTER TABLE credit_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE kenux_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS loan_repayments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE loan_repayments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyc_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transfers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_holds         ENABLE ROW LEVEL SECURITY;

-- Users see only their own data
DROP POLICY IF EXISTS "credit_profiles_self" ON credit_profiles;
CREATE POLICY "credit_profiles_self"    ON credit_profiles    FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "kenux_txs_self" ON kenux_transactions;
CREATE POLICY "kenux_txs_self"          ON kenux_transactions  FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "rewards_self" ON rewards_accounts;
CREATE POLICY "rewards_self"            ON rewards_accounts    FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "wallets_self" ON wallets;
CREATE POLICY "wallets_self"            ON wallets             FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "wallet_txs_self" ON wallet_transactions;
CREATE POLICY "wallet_txs_self"         ON wallet_transactions FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "loans_self" ON loan_applications;
CREATE POLICY "loans_self"              ON loan_applications   FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "loan_repayments_self" ON loan_repayments;
CREATE POLICY "loan_repayments_self"    ON loan_repayments     FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "kyc_self" ON kyc_documents;
CREATE POLICY "kyc_self"                ON kyc_documents       FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "notifications_self" ON notifications;
CREATE POLICY "notifications_self"      ON notifications       FOR ALL USING (user_id = auth.uid());
DROP POLICY IF EXISTS "security_events_self" ON security_events;
CREATE POLICY "security_events_self"    ON security_events     FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "paystack_transfers_self" ON paystack_transfers;
CREATE POLICY "paystack_transfers_self" ON paystack_transfers  FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "escrow_buyer" ON escrow_holds;
CREATE POLICY "escrow_buyer"            ON escrow_holds        FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Admins see everything (via service role or admin check)
DROP POLICY IF EXISTS "audit_logs_admin" ON audit_logs;
CREATE POLICY "audit_logs_admin" ON audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
);

-- exchange_rates and platform_revenue public read (no personal data)
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystack_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exchange_rates_public" ON exchange_rates;
CREATE POLICY "exchange_rates_public"   ON exchange_rates      FOR SELECT USING (true);
DROP POLICY IF EXISTS "platform_revenue_admin" ON platform_revenue;
CREATE POLICY "platform_revenue_admin"  ON platform_revenue    FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin','financial_partner'))
);
DROP POLICY IF EXISTS "settlements_admin" ON pending_settlements;
CREATE POLICY "settlements_admin"       ON pending_settlements FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
);
DROP POLICY IF EXISTS "paystack_transfers_admin" ON paystack_transfers;
CREATE POLICY "paystack_transfers_admin" ON paystack_transfers FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
);

-- ── Wallet RPCs (ledger-driven — NEVER sum transactions) ──────

-- Credit user wallet (atomic, ledger-driven)
CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_currency TEXT DEFAULT 'GHS'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after  NUMERIC;
  v_wallet_id      UUID;
BEGIN
  -- Upsert wallet
  INSERT INTO wallets (user_id, type, balance, currency)
    VALUES (p_user_id, 'personal', 0, p_currency)
    ON CONFLICT (user_id, type, currency) DO NOTHING;

  -- Lock & fetch current balance
  SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM wallets
    WHERE user_id = p_user_id AND type = 'personal' AND currency = p_currency
    FOR UPDATE;

  v_balance_after := v_balance_before + p_amount;

  UPDATE wallets SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;
END;
$$;

-- Debit user wallet (atomic, ledger-driven)
CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_currency TEXT DEFAULT 'GHS'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance_before NUMERIC;
  v_balance_after  NUMERIC;
  v_wallet_id      UUID;
BEGIN
  SELECT id, balance INTO v_wallet_id, v_balance_before
    FROM wallets
    WHERE user_id = p_user_id AND type = 'personal' AND currency = p_currency
    FOR UPDATE;

  IF v_balance_before < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  v_balance_after := v_balance_before - p_amount;

  UPDATE wallets SET balance = v_balance_after, updated_at = now()
    WHERE id = v_wallet_id;
END;
$$;

-- Credit KENUX (atomic, tier-aware)
CREATE OR REPLACE FUNCTION kenux_credit(
  p_user_id UUID,
  p_points  INTEGER
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_points    INTEGER;
  v_new_lifetime  INTEGER;
  v_new_tier      TEXT;
BEGIN
  INSERT INTO rewards_accounts (user_id, points, lifetime_points, tier)
    VALUES (p_user_id, p_points, p_points, 'bronze')
    ON CONFLICT (user_id) DO UPDATE
      SET points          = rewards_accounts.points + p_points,
          lifetime_points = rewards_accounts.lifetime_points + p_points,
          updated_at      = now()
    RETURNING points, lifetime_points INTO v_new_points, v_new_lifetime;

  -- Tier promotion
  v_new_tier := CASE
    WHEN v_new_lifetime >= 20000 THEN 'platinum'
    WHEN v_new_lifetime >= 5000  THEN 'gold'
    WHEN v_new_lifetime >= 1000  THEN 'silver'
    ELSE 'bronze'
  END;

  UPDATE rewards_accounts SET tier = v_new_tier WHERE user_id = p_user_id;
END;
$$;

-- Debit KENUX (atomic)
CREATE OR REPLACE FUNCTION kenux_debit(
  p_user_id UUID,
  p_points  INTEGER
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current INTEGER;
BEGIN
  SELECT points INTO v_current FROM rewards_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF v_current IS NULL OR v_current < p_points THEN
    RAISE EXCEPTION 'Insufficient KENUX balance';
  END IF;
  UPDATE rewards_accounts SET points = points - p_points, updated_at = now()
    WHERE user_id = p_user_id;
END;
$$;

-- Auto-create wallet + rewards account on new user signup
CREATE OR REPLACE FUNCTION on_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO wallets (user_id, type, balance, currency)
    VALUES (NEW.id, 'personal', 0.00, 'GHS')
    ON CONFLICT DO NOTHING;

  INSERT INTO rewards_accounts (user_id, points, lifetime_points, tier)
    VALUES (NEW.id, 0, 0, 'bronze')
    ON CONFLICT DO NOTHING;

  INSERT INTO credit_profiles (user_id, kenuxa_score, trust_score)
    VALUES (NEW.id, 500, 50)
    ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION on_new_user();

-- Backfill existing users
INSERT INTO wallets (user_id, type, balance, currency)
  SELECT id, 'personal', 0.00, 'GHS' FROM auth.users
  ON CONFLICT DO NOTHING;

INSERT INTO rewards_accounts (user_id, points, lifetime_points, tier)
  SELECT id, 0, 0, 'bronze' FROM auth.users
  ON CONFLICT DO NOTHING;

INSERT INTO credit_profiles (user_id, kenuxa_score, trust_score)
  SELECT id, 500, 50 FROM auth.users
  ON CONFLICT DO NOTHING;
