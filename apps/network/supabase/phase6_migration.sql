-- ============================================================
-- KENUXA Phase 6 Migration — Wallet Ledger, KENUX Treasury,
-- Payments, Subscriptions, Credit Engine, Monetization
-- Run after phase5_migration.sql
-- ============================================================

-- ── PREREQUISITE: wallets.user_id (schema.sql used owner_id) ────────────────
-- Adds user_id if wallets was created by schema.sql with owner_id instead.
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE wallets SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
-- Also add status column if missing
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- ── 100: Wallet transactions (double-entry) ──────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type               TEXT NOT NULL CHECK (type IN ('credit','debit')),
  amount             NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  currency           TEXT NOT NULL DEFAULT 'GHS',
  description        TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','completed','failed','reversed')),
  reference          TEXT UNIQUE,
  provider           TEXT,
  provider_reference TEXT,
  metadata           JSONB,
  settled_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wallet_txn_user_idx ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wallet_txn_ref_idx  ON wallet_transactions(reference) WHERE reference IS NOT NULL;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_txn_owner" ON wallet_transactions;
CREATE POLICY "wallet_txn_owner" ON wallet_transactions FOR ALL USING (auth.uid() = user_id);

-- ── 101: Ledger journal entries ───────────────────────────────
CREATE TABLE IF NOT EXISTS ledger_entries (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES wallet_transactions(id),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_type     TEXT NOT NULL CHECK (entry_type IN ('debit','credit')),
  amount         NUMERIC(18,2) NOT NULL,
  currency       TEXT NOT NULL DEFAULT 'GHS',
  account        TEXT NOT NULL,
  balance_after  NUMERIC(18,2) NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_entries_owner" ON ledger_entries;
CREATE POLICY "ledger_entries_owner" ON ledger_entries FOR SELECT USING (auth.uid() = user_id);

-- ── 102: wallet_credit RPC ───────────────────────────────────
CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_currency TEXT DEFAULT 'GHS'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, currency, status)
  VALUES (p_user_id, p_amount, p_currency, 'active')
  ON CONFLICT (user_id) DO UPDATE
    SET balance = wallets.balance + p_amount, updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id UUID,
  p_amount  NUMERIC,
  p_currency TEXT DEFAULT 'GHS'
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_balance NUMERIC;
BEGIN
  SELECT balance INTO v_balance FROM wallets
  WHERE user_id = p_user_id AND currency = p_currency;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  UPDATE wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- ── 103: KENUX transactions ───────────────────────────────────
CREATE TABLE IF NOT EXISTS kenux_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('earn','spend','purchase','transfer')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  reference   TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS kenux_txn_user_idx ON kenux_transactions(user_id, created_at DESC);
ALTER TABLE kenux_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "kenux_txn_owner" ON kenux_transactions;
CREATE POLICY "kenux_txn_owner" ON kenux_transactions FOR ALL USING (auth.uid() = user_id);

-- kenux_credit RPC
CREATE OR REPLACE FUNCTION kenux_credit(
  p_user_id UUID,
  p_points  INTEGER
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO rewards_accounts (user_id, points, lifetime_points, tier)
  VALUES (p_user_id, p_points, p_points, 'bronze')
  ON CONFLICT (user_id) DO UPDATE
    SET points = rewards_accounts.points + p_points,
        lifetime_points = rewards_accounts.lifetime_points + p_points;
  INSERT INTO kenux_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'purchase', p_points, 'KENUX purchased via Paystack');
END;
$$;

-- ── 104: Subscriptions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id          UUID REFERENCES businesses(id),
  plan                 TEXT NOT NULL DEFAULT 'free'
                         CHECK (plan IN ('free','business','enterprise')),
  status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','cancelled','past_due','trialing')),
  billing_cycle        TEXT NOT NULL DEFAULT 'monthly'
                         CHECK (billing_cycle IN ('monthly','annual')),
  amount               NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency             TEXT NOT NULL DEFAULT 'GHS',
  paystack_sub_code    TEXT,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  trial_ends_at        TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON subscriptions(user_id, status);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_owner" ON subscriptions;
CREATE POLICY "subscriptions_owner" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- ── 105: Billing history ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  amount          NUMERIC(10,2) NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'GHS',
  status          TEXT NOT NULL DEFAULT 'paid'
                    CHECK (status IN ('paid','failed','refunded')),
  description     TEXT NOT NULL,
  reference       TEXT,
  payment_method  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_history_owner" ON billing_history;
CREATE POLICY "billing_history_owner" ON billing_history FOR SELECT USING (auth.uid() = user_id);

-- ── 106: Credit profiles ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_profiles (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kenuxa_score    INTEGER NOT NULL DEFAULT 300
                    CHECK (kenuxa_score BETWEEN 0 AND 850),
  trust_score     INTEGER NOT NULL DEFAULT 0
                    CHECK (trust_score BETWEEN 0 AND 100),
  business_score  INTEGER CHECK (business_score BETWEEN 0 AND 850),
  talent_score    INTEGER CHECK (talent_score BETWEEN 0 AND 100),
  supplier_score  INTEGER CHECK (supplier_score BETWEEN 0 AND 100),
  signal_data     JSONB DEFAULT '{}',
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE credit_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_profiles_owner" ON credit_profiles;
CREATE POLICY "credit_profiles_owner" ON credit_profiles FOR ALL USING (auth.uid() = user_id);

-- ── 107: Exchange rates cache ─────────────────────────────────
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          NUMERIC(18,6) NOT NULL,
  source        TEXT NOT NULL DEFAULT 'openexchangerates',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency)
);

INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD','GHS',15.50),('USD','NGN',1610),('USD','KES',131),
  ('USD','ZAR',19.2),('USD','ETB',57),  ('USD','UGX',3850),
  ('USD','TZS',2620),('USD','RWF',1340),('USD','XOF',620),
  ('USD','ZMW',27),  ('USD','UGX',3850),('USD','MWK',1750)
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- ── 108: KENUX treasury ledger ────────────────────────────────
CREATE TABLE IF NOT EXISTS kenux_treasury (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL
               CHECK (event_type IN ('mint','burn','transfer','purchase')),
  amount     INTEGER NOT NULL,
  user_id    UUID REFERENCES auth.users(id),
  reference  TEXT,
  ghs_value  NUMERIC(10,2),
  usd_value  NUMERIC(10,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 109: Orders ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id        UUID REFERENCES auth.users(id),
  business_id      UUID REFERENCES businesses(id),
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'GHS',
  items_count      INTEGER NOT NULL DEFAULT 1,
  seller_name      TEXT,
  delivery_address JSONB,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS orders_buyer_idx  ON orders(buyer_id,  created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx ON orders(seller_id, created_at DESC);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_buyer" ON orders;
CREATE POLICY "orders_buyer"  ON orders FOR SELECT USING (auth.uid() = buyer_id);
DROP POLICY IF EXISTS "orders_seller" ON orders;
CREATE POLICY "orders_seller" ON orders FOR SELECT USING (auth.uid() = seller_id);

-- ── 110: Platform revenue (internal analytics) ───────────────
CREATE TABLE IF NOT EXISTS platform_revenue (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source      TEXT NOT NULL
                CHECK (source IN ('subscription','marketplace_fee','transaction_fee',
                                  'advertising','kenux_purchase','ai_usage','api_usage','delivery_fee')),
  amount      NUMERIC(12,2) NOT NULL,
  currency    TEXT NOT NULL DEFAULT 'GHS',
  user_id     UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  reference   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS platform_revenue_source_idx ON platform_revenue(source, created_at DESC);
