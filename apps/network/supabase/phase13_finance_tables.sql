-- ============================================================
-- Phase 13: Finance Infrastructure Tables
-- Settlements, Escrow, Paystack Transfers, Exchange Rates
-- ============================================================

-- ── pending_settlements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS pending_settlements (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID        REFERENCES auth.users(id),
  business_name     TEXT        NOT NULL,
  amount            NUMERIC     NOT NULL CHECK (amount > 0),
  transaction_count INT         NOT NULL DEFAULT 0,
  due_date          DATE        NOT NULL,
  status            TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','on_hold','failed')),
  settled_at        TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlements_status  ON pending_settlements(status, due_date);
CREATE INDEX IF NOT EXISTS idx_settlements_biz     ON pending_settlements(business_id);

ALTER TABLE pending_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_admin_all" ON pending_settlements;
CREATE POLICY "settlements_admin_all" ON pending_settlements
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );

DROP POLICY IF EXISTS "settlements_business_view" ON pending_settlements;
CREATE POLICY "settlements_business_view" ON pending_settlements
  FOR SELECT USING (business_id = auth.uid());

-- ── escrow_holds ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow_holds (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID,
  buyer_id     UUID        REFERENCES auth.users(id),
  seller_id    UUID        REFERENCES auth.users(id),
  buyer_name   TEXT,
  seller_name  TEXT,
  amount       NUMERIC     NOT NULL CHECK (amount > 0),
  currency     TEXT        NOT NULL DEFAULT 'GHS',
  held_since   TIMESTAMPTZ NOT NULL DEFAULT now(),
  release_date TIMESTAMPTZ,
  status       TEXT        NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','refunded','disputed')),
  released_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_escrow_status   ON escrow_holds(status);
CREATE INDEX IF NOT EXISTS idx_escrow_order    ON escrow_holds(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_buyer    ON escrow_holds(buyer_id);
CREATE INDEX IF NOT EXISTS idx_escrow_seller   ON escrow_holds(seller_id);

ALTER TABLE escrow_holds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "escrow_admin_all" ON escrow_holds;
CREATE POLICY "escrow_admin_all" ON escrow_holds
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );

DROP POLICY IF EXISTS "escrow_participant_view" ON escrow_holds;
CREATE POLICY "escrow_participant_view" ON escrow_holds
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- ── paystack_transfers ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS paystack_transfers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id),
  recipient_name TEXT,
  account_number TEXT,
  bank_name      TEXT,
  bank_code      TEXT,
  amount         NUMERIC     NOT NULL CHECK (amount > 0),
  currency       TEXT        NOT NULL DEFAULT 'GHS',
  transfer_code  TEXT        UNIQUE,
  reference      TEXT        UNIQUE,
  reason         TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','success','failed','reversed')),
  transferred_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paystack_transfers_user    ON paystack_transfers(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paystack_transfers_status  ON paystack_transfers(status);

ALTER TABLE paystack_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pt_admin_all" ON paystack_transfers;
CREATE POLICY "pt_admin_all" ON paystack_transfers
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin'))
  );

-- ── exchange_rates ────────────────────────────────────────────
-- Stores GHS cross rates refreshed by the treasury cron job
CREATE TABLE IF NOT EXISTS exchange_rates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT        NOT NULL DEFAULT 'USD',
  to_currency   TEXT        NOT NULL,
  rate          NUMERIC     NOT NULL,
  source        TEXT        DEFAULT 'openexchangerates',
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Seed default rates (will be overwritten by cron)
INSERT INTO exchange_rates (from_currency, to_currency, rate) VALUES
  ('USD', 'GHS', 16.20),
  ('USD', 'NGN', 1540.00),
  ('USD', 'KES', 131.00),
  ('USD', 'ZAR', 18.80),
  ('USD', 'ETB', 57.00),
  ('USD', 'UGX', 3730.00),
  ('USD', 'TZS', 2760.00),
  ('USD', 'RWF', 1330.00)
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- ── platform_revenue: add missing columns if needed ───────────
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'settled';
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ── wallet_transactions: add settled_at ───────────────────────
ALTER TABLE IF EXISTS wallet_transactions ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS wallet_transactions ADD COLUMN IF NOT EXISTS provider_reference TEXT;
ALTER TABLE IF EXISTS wallet_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- ── Auto-create settlement from wallet transaction (trigger) ──
CREATE OR REPLACE FUNCTION update_settlement_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- When a wallet transaction from a business sale completes,
  -- check if there's a pending settlement to update
  IF NEW.status = 'completed' AND OLD.status = 'pending' THEN
    -- Nothing to auto-update here by default — settlements are admin-managed
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Index for wallet_transactions lookup
CREATE INDEX IF NOT EXISTS idx_wallet_tx_reference ON wallet_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_type ON wallet_transactions(user_id, type, created_at DESC);

-- ── Integrity: settlement status transitions ──────────────────
CREATE OR REPLACE FUNCTION process_settlement(p_settlement_id UUID)
RETURNS JSON AS $$
DECLARE
  v_settlement pending_settlements;
BEGIN
  SELECT * INTO v_settlement FROM pending_settlements WHERE id = p_settlement_id FOR UPDATE;

  IF v_settlement.id IS NULL THEN
    RAISE EXCEPTION 'Settlement not found';
  END IF;
  IF v_settlement.status NOT IN ('pending', 'processing') THEN
    RAISE EXCEPTION 'Settlement already in state: %', v_settlement.status;
  END IF;

  UPDATE pending_settlements
  SET status = 'completed', settled_at = NOW(), updated_at = NOW()
  WHERE id = p_settlement_id;

  RETURN json_build_object('ok', true, 'id', p_settlement_id, 'settled_at', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION process_settlement FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_settlement TO authenticated;
