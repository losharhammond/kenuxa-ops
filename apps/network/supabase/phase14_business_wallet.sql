-- ============================================================
-- Phase 14: Business Wallet, Business Members Table
-- Separates business finance from personal wallets
-- ============================================================

-- ── business_members ─────────────────────────────────────────
-- Junction table: which users belong to which businesses
CREATE TABLE IF NOT EXISTS business_members (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'employee' CHECK (role IN ('owner','admin','manager','cashier','employee','viewer')),
  status      TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  invited_by  UUID        REFERENCES auth.users(id),
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_biz_members_biz  ON business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_biz_members_user ON business_members(user_id);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bm_owner_manage" ON business_members
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_members.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "bm_member_view" ON business_members
  FOR SELECT USING (user_id = auth.uid());

-- ── business_wallets ─────────────────────────────────────────
-- One wallet per business — double-entry ledger, separate from personal
CREATE TABLE IF NOT EXISTS business_wallets (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
  balance      NUMERIC     NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency     TEXT        NOT NULL DEFAULT 'GHS',
  status       TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_biz_wallet_biz ON business_wallets(business_id);

ALTER TABLE business_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "biz_wallet_member" ON business_wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_members
      WHERE business_members.business_id = business_wallets.business_id
      AND business_members.user_id = auth.uid()
      AND business_members.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_wallets.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- ── business_wallet_transactions ─────────────────────────────
CREATE TABLE IF NOT EXISTS business_wallet_transactions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL CHECK (type IN ('credit','debit')),
  amount       NUMERIC     NOT NULL CHECK (amount > 0),
  currency     TEXT        NOT NULL DEFAULT 'GHS',
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','reversed')),
  reference    TEXT        UNIQUE,
  category     TEXT        DEFAULT 'general',
  initiated_by UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bwt_biz      ON business_wallet_transactions(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bwt_ref      ON business_wallet_transactions(reference);

ALTER TABLE business_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bwt_member_view" ON business_wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_members
      WHERE business_members.business_id = business_wallet_transactions.business_id
      AND business_members.user_id = auth.uid()
      AND business_members.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_wallet_transactions.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- ── business_wallet_credit RPC ────────────────────────────────
CREATE OR REPLACE FUNCTION business_wallet_credit(
  p_business_id  UUID,
  p_amount       NUMERIC,
  p_currency     TEXT     DEFAULT 'GHS',
  p_note         TEXT     DEFAULT NULL,
  p_category     TEXT     DEFAULT 'general',
  p_initiated_by UUID     DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
  v_ref TEXT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  INSERT INTO business_wallets (business_id, balance, currency, status)
  VALUES (p_business_id, 0, p_currency, 'active')
  ON CONFLICT (business_id) DO NOTHING;

  UPDATE business_wallets
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE business_id = p_business_id
  RETURNING balance INTO v_new_balance;

  v_ref := 'BW-CR-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;

  INSERT INTO business_wallet_transactions
    (business_id, type, amount, currency, description, status, reference, category, initiated_by)
  VALUES
    (p_business_id, 'credit', p_amount, p_currency, p_note, 'completed', v_ref, p_category, p_initiated_by);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── business_wallet_debit RPC ─────────────────────────────────
CREATE OR REPLACE FUNCTION business_wallet_debit(
  p_business_id  UUID,
  p_amount       NUMERIC,
  p_currency     TEXT     DEFAULT 'GHS',
  p_note         TEXT     DEFAULT NULL,
  p_category     TEXT     DEFAULT 'general',
  p_initiated_by UUID     DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_balance     NUMERIC;
  v_new_balance NUMERIC;
  v_ref         TEXT;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'Amount must be positive'; END IF;

  SELECT balance INTO v_balance FROM business_wallets
  WHERE business_id = p_business_id FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Business wallet not found for %', p_business_id;
  END IF;
  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient business wallet balance: % available, % requested', v_balance, p_amount;
  END IF;

  UPDATE business_wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE business_id = p_business_id
  RETURNING balance INTO v_new_balance;

  v_ref := 'BW-DR-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT;

  INSERT INTO business_wallet_transactions
    (business_id, type, amount, currency, description, status, reference, category, initiated_by)
  VALUES
    (p_business_id, 'debit', p_amount, p_currency, p_note, 'completed', v_ref, p_category, p_initiated_by);

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Auto-provision: when business is created, create wallet + owner member ────
CREATE OR REPLACE FUNCTION auto_provision_business_resources()
RETURNS TRIGGER AS $$
BEGIN
  -- Create business wallet
  INSERT INTO business_wallets (business_id, balance, currency, status)
  VALUES (NEW.id, 0, 'GHS', 'active')
  ON CONFLICT (business_id) DO NOTHING;

  -- Add owner as business member
  INSERT INTO business_members (business_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active')
  ON CONFLICT (business_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_auto_provision_business
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION auto_provision_business_resources();

-- ── Sales settlement: auto-credit business wallet on sale completion ──────────
CREATE OR REPLACE FUNCTION settle_sale_to_business(
  p_business_id UUID,
  p_sale_amount NUMERIC,
  p_sale_id     UUID,
  p_currency    TEXT DEFAULT 'GHS'
)
RETURNS NUMERIC AS $$
DECLARE
  -- Platform takes 2.5% transaction fee
  v_platform_fee  NUMERIC;
  v_net_amount    NUMERIC;
  v_new_balance   NUMERIC;
BEGIN
  v_platform_fee := ROUND(p_sale_amount * 0.025, 2);
  v_net_amount   := p_sale_amount - v_platform_fee;

  -- Record platform revenue
  INSERT INTO platform_revenue (source, revenue_type, amount, reference, status)
  VALUES ('marketplace_fee', 'marketplace_fee', v_platform_fee, 'SALE-' || p_sale_id::TEXT, 'settled');

  -- Credit net amount to business wallet
  v_new_balance := business_wallet_credit(
    p_business_id, v_net_amount, p_currency,
    'Sale settlement (net of 2.5% platform fee) for order ' || p_sale_id::TEXT,
    'sale_settlement'
  );

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION business_wallet_credit TO authenticated;
GRANT EXECUTE ON FUNCTION business_wallet_debit  TO authenticated;
GRANT EXECUTE ON FUNCTION settle_sale_to_business TO authenticated;
