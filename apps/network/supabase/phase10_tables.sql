-- ============================================================
-- Phase 10: Missing Tables
-- commodity_prices, subscriptions, payment_transactions
-- ============================================================

-- ── Commodity Prices ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commodity_prices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop          text NOT NULL,
  price         numeric(10,2) NOT NULL,
  unit          text NOT NULL DEFAULT 'kg',
  change_24h    numeric(8,2) DEFAULT 0,
  category      text NOT NULL,  -- grain, vegetable, tuber, fruit, spice, legume, cash_crop
  country       text NOT NULL DEFAULT 'GH',
  source        text DEFAULT 'manual',
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crop, country)
);

-- Seed initial prices for Ghana
INSERT INTO commodity_prices (crop, price, unit, change_24h, category, country) VALUES
  ('Maize',     2.40,  'kg', 0.10,  'grain',     'GH'),
  ('Tomato',    4.20,  'kg', -0.30, 'vegetable', 'GH'),
  ('Cassava',   0.85,  'kg', 0.05,  'tuber',     'GH'),
  ('Yam',       3.50,  'kg', 0.20,  'tuber',     'GH'),
  ('Pepper',   13.00,  'kg', 1.00,  'spice',     'GH'),
  ('Plantain',  1.80,  'kg', -0.10, 'fruit',     'GH'),
  ('Rice',      5.50,  'kg', 0.00,  'grain',     'GH'),
  ('Onion',     3.80,  'kg', -0.20, 'vegetable', 'GH'),
  ('Garden Egg',6.50,  'kg', 0.30,  'vegetable', 'GH'),
  ('Cocoa',    16.00,  'kg', 0.50,  'cash_crop', 'GH'),
  ('Cowpea',    9.00,  'kg', 0.20,  'legume',    'GH'),
  ('Soybean',   7.50,  'kg', -0.10, 'legume',    'GH')
ON CONFLICT (crop, country) DO NOTHING;

-- RLS
ALTER TABLE commodity_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "commodity_prices_read_all" ON commodity_prices;
CREATE POLICY "commodity_prices_read_all" ON commodity_prices FOR SELECT USING (true);
DROP POLICY IF EXISTS "commodity_prices_admin_write" ON commodity_prices;
CREATE POLICY "commodity_prices_admin_write" ON commodity_prices FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')));

-- ── Subscriptions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                        uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  paystack_subscription_code     text UNIQUE,
  paystack_customer_code         text,
  plan_code                      text,
  plan_name                      text,
  status                         text NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','cancelled','past_due','paused','trialling')),
  amount                         numeric(10,2),
  currency                       text DEFAULT 'GHS',
  interval                       text DEFAULT 'monthly',
  next_payment_date              timestamptz,
  created_at                     timestamptz DEFAULT now(),
  updated_at                     timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subscriptions_self" ON subscriptions;
CREATE POLICY "subscriptions_self" ON subscriptions FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "subscriptions_admin" ON subscriptions;
CREATE POLICY "subscriptions_admin" ON subscriptions FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')));

-- ── Payment Transactions (unified) ────────────────────────────
CREATE TABLE IF NOT EXISTS payment_transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  amount        numeric(12,2) NOT NULL,
  currency      text NOT NULL DEFAULT 'GHS',
  method        text NOT NULL,   -- card, mobile_money, wallet, bank_transfer
  type          text NOT NULL,   -- debit, credit
  purpose       text,
  reference     text UNIQUE NOT NULL DEFAULT ('TXN-' || gen_random_uuid()::text),
  description   text,
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','completed','failed','reversed')),
  provider      text,
  provider_ref  text,
  metadata      jsonb,
  created_at    timestamptz DEFAULT now(),
  settled_at    timestamptz
);

ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_transactions_self" ON payment_transactions;
CREATE POLICY "payment_transactions_self" ON payment_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
DROP POLICY IF EXISTS "payment_transactions_insert_self" ON payment_transactions;
CREATE POLICY "payment_transactions_insert_self" ON payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "payment_transactions_admin" ON payment_transactions;
CREATE POLICY "payment_transactions_admin" ON payment_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('super_admin','country_admin')));

-- ── Index for performance ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_commodity_prices_country ON commodity_prices(country);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_sender ON payment_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_recipient ON payment_transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created ON payment_transactions(created_at DESC);
