-- ============================================================
-- Phase 12: Wallet Engine — Double-Entry Ledger RPCs
--           Platform Metrics Views, MRR/ARR, KENUX Economy
-- ============================================================

-- ── PREREQUISITE: wallets.user_id (schema.sql used owner_id) ────────────────
-- Adds user_id if wallets was created by schema.sql with owner_id instead.
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
UPDATE wallets SET user_id = owner_id WHERE user_id IS NULL AND owner_id IS NOT NULL;
DO $$
BEGIN
  -- Drop NOT NULL on owner_id if it exists (schema.sql originally had owner_id NOT NULL)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallets' AND column_name = 'owner_id'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE wallets ALTER COLUMN owner_id DROP NOT NULL;
  END IF;
END;
$$;
-- Also add status column if missing
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- ── PREREQUISITE: ensure platform_revenue.revenue_type exists ───────────────
ALTER TABLE IF EXISTS platform_revenue ADD COLUMN IF NOT EXISTS revenue_type TEXT;
UPDATE platform_revenue SET revenue_type = source WHERE revenue_type IS NULL;

-- ── PREREQUISITE: ensure kenux_ledger has balance_after/description ──────────
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS balance_after INTEGER NOT NULL DEFAULT 0;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS description  TEXT;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS reference    TEXT;
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS metadata     JSONB DEFAULT '{}'::jsonb;

-- ── wallet_credit: credit a user's wallet (double-entry) ─────
-- ── DROP existing functions to allow return type changes ────────────────────
DROP FUNCTION IF EXISTS wallet_credit(UUID, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS wallet_credit(UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS wallet_credit(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS wallet_credit(uuid, numeric, text);
DROP FUNCTION IF EXISTS wallet_debit(UUID, NUMERIC, TEXT, TEXT);
DROP FUNCTION IF EXISTS wallet_debit(UUID, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS wallet_debit(uuid, numeric, text, text);
DROP FUNCTION IF EXISTS wallet_debit(uuid, numeric, text);
DROP FUNCTION IF EXISTS kenux_credit(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS kenux_credit(uuid, int, text);
DROP FUNCTION IF EXISTS kenux_debit(UUID, INT, TEXT);
DROP FUNCTION IF EXISTS kenux_debit(uuid, int, text);

CREATE OR REPLACE FUNCTION wallet_credit(
  p_user_id   UUID,
  p_amount    NUMERIC,
  p_currency  TEXT DEFAULT 'GHS',
  p_note      TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_new_balance NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Credit amount must be positive';
  END IF;

  -- Ensure wallet exists
  INSERT INTO wallets (user_id, balance, currency, status)
  VALUES (p_user_id, 0, p_currency, 'active')
  ON CONFLICT (user_id) DO NOTHING;

  -- Atomic increment + return new balance
  UPDATE wallets
  SET balance    = balance + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  -- Ledger entry
  INSERT INTO wallet_ledger (user_id, entry_type, amount, currency, balance_after, note, created_at)
  VALUES (p_user_id, 'credit', p_amount, p_currency, v_new_balance, p_note, NOW());

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── wallet_debit: debit a user's wallet (double-entry) ───────
CREATE OR REPLACE FUNCTION wallet_debit(
  p_user_id   UUID,
  p_amount    NUMERIC,
  p_currency  TEXT DEFAULT 'GHS',
  p_note      TEXT DEFAULT NULL
)
RETURNS NUMERIC AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance     NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive';
  END IF;

  -- Lock the row for this operation
  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for user %', p_user_id;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: available %, requested %', v_current_balance, p_amount;
  END IF;

  UPDATE wallets
  SET balance    = balance - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  -- Ledger entry
  INSERT INTO wallet_ledger (user_id, entry_type, amount, currency, balance_after, note, created_at)
  VALUES (p_user_id, 'debit', p_amount, p_currency, v_new_balance, p_note, NOW());

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── wallet_transfer: atomic peer-to-peer transfer ────────────
CREATE OR REPLACE FUNCTION wallet_transfer(
  p_sender_id   UUID,
  p_receiver_id UUID,
  p_amount      NUMERIC,
  p_currency    TEXT DEFAULT 'GHS',
  p_note        TEXT DEFAULT NULL,
  p_reference   TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sender_balance   NUMERIC;
  v_receiver_balance NUMERIC;
  v_ref              TEXT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transfer amount must be positive';
  END IF;
  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION 'Cannot transfer to self';
  END IF;

  v_ref := COALESCE(p_reference, 'TRF-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '-' || SUBSTRING(p_sender_id::TEXT, 1, 6));

  -- Debit sender (checks balance inside)
  v_sender_balance   := wallet_debit(p_sender_id,   p_amount, p_currency, COALESCE(p_note, 'Transfer to ' || p_receiver_id));
  -- Credit receiver
  v_receiver_balance := wallet_credit(p_receiver_id, p_amount, p_currency, COALESCE(p_note, 'Transfer from ' || p_sender_id));

  -- Record transfer
  INSERT INTO wallet_transfers (sender_id, receiver_id, amount, currency, reference, note, status, created_at)
  VALUES (p_sender_id, p_receiver_id, p_amount, p_currency, v_ref, p_note, 'completed', NOW());

  RETURN json_build_object(
    'ok',               true,
    'reference',        v_ref,
    'sender_balance',   v_sender_balance,
    'receiver_balance', v_receiver_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── PREREQUISITE: kenux_ledger.reason alias ──────────────────────────────
ALTER TABLE IF EXISTS kenux_ledger ADD COLUMN IF NOT EXISTS reason TEXT;
-- sync reason from description if description exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='kenux_ledger' AND column_name='description') THEN
    UPDATE kenux_ledger SET reason = description WHERE reason IS NULL AND description IS NOT NULL;
  END IF;
END;
$$;

-- ── kenux_credit: credit KENUX reward points ─────────────────
CREATE OR REPLACE FUNCTION kenux_credit(
  p_user_id UUID,
  p_points  INT,
  p_reason  TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_new_points INT;
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Points must be positive';
  END IF;

  INSERT INTO rewards_accounts (user_id, points, lifetime_points, tier)
  VALUES (p_user_id, p_points, p_points, 'bronze')
  ON CONFLICT (user_id) DO UPDATE
    SET points          = rewards_accounts.points + p_points,
        lifetime_points = rewards_accounts.lifetime_points + p_points,
        tier = CASE
          WHEN rewards_accounts.lifetime_points + p_points >= 20000 THEN 'platinum'
          WHEN rewards_accounts.lifetime_points + p_points >= 5000  THEN 'gold'
          WHEN rewards_accounts.lifetime_points + p_points >= 1000  THEN 'silver'
          ELSE 'bronze'
        END,
        updated_at = NOW()
  RETURNING points INTO v_new_points;

  -- Activity log
  INSERT INTO kenux_ledger (user_id, entry_type, points, reason, created_at)
  VALUES (p_user_id, 'earn', p_points, p_reason, NOW());

  RETURN v_new_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── kenux_debit: spend KENUX points ──────────────────────────
CREATE OR REPLACE FUNCTION kenux_debit(
  p_user_id UUID,
  p_points  INT,
  p_reason  TEXT DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
  v_current INT;
  v_new     INT;
BEGIN
  SELECT points INTO v_current FROM rewards_accounts WHERE user_id = p_user_id FOR UPDATE;
  IF v_current IS NULL OR v_current < p_points THEN
    RAISE EXCEPTION 'Insufficient KENUX balance: available %, requested %', COALESCE(v_current, 0), p_points;
  END IF;

  UPDATE rewards_accounts SET points = points - p_points, updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING points INTO v_new;

  INSERT INTO kenux_ledger (user_id, entry_type, points, reason, created_at)
  VALUES (p_user_id, 'spend', p_points, p_reason, NOW());

  RETURN v_new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Ledger tables (if not yet created) ───────────────────────
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id),
  entry_type    TEXT        NOT NULL CHECK (entry_type IN ('credit','debit')),
  amount        NUMERIC     NOT NULL CHECK (amount > 0),
  currency      TEXT        NOT NULL DEFAULT 'GHS',
  balance_after NUMERIC     NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user ON wallet_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wallet_transfers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    UUID        NOT NULL REFERENCES auth.users(id),
  receiver_id  UUID        NOT NULL REFERENCES auth.users(id),
  amount       NUMERIC     NOT NULL,
  currency     TEXT        NOT NULL DEFAULT 'GHS',
  reference    TEXT        UNIQUE,
  note         TEXT,
  status       TEXT        NOT NULL DEFAULT 'completed',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_sender   ON wallet_transfers(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transfers_receiver ON wallet_transfers(receiver_id, created_at DESC);

CREATE TABLE IF NOT EXISTS kenux_ledger (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id),
  entry_type TEXT        NOT NULL CHECK (entry_type IN ('earn','spend')),
  points     INT         NOT NULL CHECK (points > 0),
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kenux_ledger_user ON kenux_ledger(user_id, created_at DESC);

-- ── wallets.updated_at column ─────────────────────────────────
ALTER TABLE IF EXISTS wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── Platform Metrics View (for admin stats API) ───────────────
CREATE OR REPLACE VIEW platform_metrics AS
SELECT
  -- User counts
  (SELECT COUNT(*) FROM user_profiles)                                              AS total_users,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at > NOW() - INTERVAL '1 day') AS new_users_today,
  (SELECT COUNT(*) FROM user_profiles WHERE created_at > NOW() - INTERVAL '7 days') AS new_users_7d,

  -- Business counts
  (SELECT COUNT(*) FROM businesses)                                                 AS total_businesses,
  (SELECT COUNT(*) FROM businesses WHERE status = 'active')                         AS active_businesses,
  (SELECT COUNT(*) FROM businesses WHERE verification_status = 'pending')           AS pending_verification,

  -- Finance
  (SELECT COALESCE(SUM(balance), 0) FROM wallets WHERE status = 'active')          AS total_wallet_balance_ghs,
  (SELECT COALESCE(SUM(amount), 0) FROM platform_revenue
   WHERE created_at > DATE_TRUNC('month', NOW()))                                  AS total_revenue_mtd,
  (SELECT COALESCE(SUM(amount), 0) FROM platform_revenue
   WHERE revenue_type = 'subscription'
   AND created_at > DATE_TRUNC('month', NOW()))                                    AS mrr_ghs,

  -- KENUX
  (SELECT COALESCE(SUM(points), 0) FROM rewards_accounts)                          AS kenux_in_circulation,
  (SELECT COALESCE(SUM(points), 0) FROM kenux_ledger WHERE entry_type = 'earn')    AS kenux_total_earned,
  (SELECT COALESCE(SUM(points), 0) FROM kenux_ledger WHERE entry_type = 'spend')   AS kenux_total_spent,

  -- Transactions
  (SELECT COUNT(*) FROM wallet_transactions WHERE created_at > NOW() - INTERVAL '1 day') AS transactions_today,
  (SELECT COUNT(*) FROM wallet_transactions WHERE status = 'completed')             AS total_completed_txns,

  -- KYC
  (SELECT COUNT(*) FROM kyc_documents WHERE status = 'pending')                    AS pending_kyc,

  -- Disputes
  (SELECT COUNT(*) FROM disputes WHERE status = 'open')                            AS open_disputes,

  -- Loans
  (SELECT COUNT(*) FROM loan_applications WHERE status = 'active')                 AS active_loans,
  (SELECT COALESCE(SUM(amount), 0) FROM loan_applications WHERE status = 'active') AS total_loan_book_ghs,

  -- GMV
  (SELECT COALESCE(SUM(total), 0) FROM sales WHERE created_at > NOW() - INTERVAL '1 day') AS gmv_today,
  (SELECT COALESCE(SUM(total), 0) FROM sales WHERE created_at > DATE_TRUNC('month', NOW())) AS gmv_mtd;

-- ── RLS Policies for new tables ───────────────────────────────
ALTER TABLE wallet_ledger    ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kenux_ledger     ENABLE ROW LEVEL SECURITY;

-- Users can only read their own ledger entries
DROP POLICY IF EXISTS "wallet_ledger_owner" ON wallet_ledger;
CREATE POLICY "wallet_ledger_owner" ON wallet_ledger
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_transfers_participant" ON wallet_transfers;
CREATE POLICY "wallet_transfers_participant" ON wallet_transfers
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "kenux_ledger_owner" ON kenux_ledger;
CREATE POLICY "kenux_ledger_owner" ON kenux_ledger
  FOR SELECT USING (user_id = auth.uid());

-- ── Integrity validation: balance snapshot ────────────────────
-- Verifies ledger sum matches wallet balance (use for audits)
CREATE OR REPLACE FUNCTION validate_wallet_integrity(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_wallet_balance   NUMERIC;
  v_ledger_credits   NUMERIC;
  v_ledger_debits    NUMERIC;
  v_ledger_balance   NUMERIC;
BEGIN
  SELECT COALESCE(balance, 0) INTO v_wallet_balance FROM wallets WHERE user_id = p_user_id;
  SELECT
    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'credit'), 0),
    COALESCE(SUM(amount) FILTER (WHERE entry_type = 'debit'),  0)
  INTO v_ledger_credits, v_ledger_debits
  FROM wallet_ledger WHERE user_id = p_user_id;

  v_ledger_balance := v_ledger_credits - v_ledger_debits;

  RETURN json_build_object(
    'user_id',          p_user_id,
    'wallet_balance',   v_wallet_balance,
    'ledger_balance',   v_ledger_balance,
    'credits',          v_ledger_credits,
    'debits',           v_ledger_debits,
    'is_balanced',      ABS(v_wallet_balance - v_ledger_balance) < 0.001,
    'discrepancy',      v_wallet_balance - v_ledger_balance,
    'checked_at',       NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to validation function for admins
REVOKE ALL ON FUNCTION validate_wallet_integrity FROM PUBLIC;
GRANT EXECUTE ON FUNCTION validate_wallet_integrity TO authenticated;
