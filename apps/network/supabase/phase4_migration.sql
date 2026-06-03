-- =============================================================================
-- KENUXA PHASE 4 MIGRATION — B2B Procurement + Financial Infrastructure
-- Run after phase3_migration.sql
-- =============================================================================

-- ─── PREREQUISITE: ensure user_profiles.business_id exists ──────────────────
-- Required by all RLS policies in this file. Safe to run multiple times.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- ─── 45. LOAN_APPLICATIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL,
  term_months   INT NOT NULL,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE loan_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses see own applications" ON loan_applications;
DROP POLICY IF EXISTS "Businesses submit applications"  ON loan_applications;
CREATE POLICY "Businesses see own applications" ON loan_applications FOR SELECT
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY "Businesses submit applications"  ON loan_applications FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));

GRANT ALL ON loan_applications TO authenticated;

-- ─── 46. RFQS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfqs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID REFERENCES businesses(id) ON DELETE CASCADE,
  business_name TEXT,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  quantity      NUMERIC(12,2),
  unit          TEXT DEFAULT 'units',
  budget_min    NUMERIC(12,2),
  budget_max    NUMERIC(12,2),
  deadline      DATE,
  status        TEXT NOT NULL DEFAULT 'open',
  created_by    UUID REFERENCES auth.users(id),
  bids_count    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Open RFQs are public"      ON rfqs;
DROP POLICY IF EXISTS "Businesses manage own RFQs" ON rfqs;
CREATE POLICY "Open RFQs are public"       ON rfqs FOR SELECT USING (true);
CREATE POLICY "Businesses manage own RFQs" ON rfqs FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));

ALTER TABLE rfqs ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
GRANT ALL ON rfqs TO authenticated;
GRANT SELECT ON rfqs TO anon;

-- ─── 47. RFQ_BIDS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rfq_bids (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id           UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  bidder_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bidder_name      TEXT NOT NULL,
  price_per_unit   NUMERIC(12,2) NOT NULL,
  total_price      NUMERIC(12,2) NOT NULL,
  delivery_days    INT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rfq_bids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Bids visible to RFQ owner and bidder" ON rfq_bids;
DROP POLICY IF EXISTS "Auth users can bid"                   ON rfq_bids;
DROP POLICY IF EXISTS "Bidders manage own bids"              ON rfq_bids;
CREATE POLICY "Bids visible to RFQ owner and bidder" ON rfq_bids FOR SELECT
  USING (
    auth.uid() = bidder_id
    OR EXISTS (
      SELECT 1 FROM rfqs r
      JOIN user_profiles up ON up.business_id = r.business_id
      WHERE r.id = rfq_id AND up.id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Auth users can bid" ON rfq_bids;
CREATE POLICY "Auth users can bid"      ON rfq_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);
DROP POLICY IF EXISTS "Bidders manage own bids" ON rfq_bids;
CREATE POLICY "Bidders manage own bids" ON rfq_bids FOR UPDATE USING (auth.uid() = bidder_id);

GRANT ALL ON rfq_bids TO authenticated;

-- Increment bids count helper
CREATE OR REPLACE FUNCTION increment_rfq_bids(p_rfq_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE rfqs SET bids_count = bids_count + 1 WHERE id = p_rfq_id;
END;
$$;

-- Auto-update bids_count via trigger (alternative to RPC)
CREATE OR REPLACE FUNCTION on_rfq_bid_insert()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE rfqs SET bids_count = bids_count + 1 WHERE id = NEW.rfq_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_rfq_bid_insert ON rfq_bids;
CREATE TRIGGER on_rfq_bid_insert
  AFTER INSERT ON rfq_bids
  FOR EACH ROW EXECUTE FUNCTION on_rfq_bid_insert();

-- ─── 48. BUSINESSES: updated_at trigger ──────────────────────────────────────
-- Ensure logo_url/banner_url/category exist (idempotent, also in phase3)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS logo_url   TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS category   TEXT;

UPDATE businesses SET category = type::TEXT WHERE category IS NULL AND type IS NOT NULL;

-- ─── 49. PRODUCTS: image_url column ─────────────────────────────────────────
ALTER TABLE inventory_items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ─── 50. JOB_APPLICATIONS: extended fields ───────────────────────────────────
ALTER TABLE job_applications
  ADD COLUMN IF NOT EXISTS cover_letter TEXT,
  ADD COLUMN IF NOT EXISTS resume_url   TEXT,
  ADD COLUMN IF NOT EXISTS applied_at   TIMESTAMPTZ NOT NULL DEFAULT now();

-- ─── 51. API_KEYS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,
  key_hash     TEXT NOT NULL,
  permissions  TEXT[] NOT NULL DEFAULT '{}',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  calls_count  INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own keys" ON api_keys;
CREATE POLICY "Users manage own keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON api_keys TO authenticated;

-- ─── 52. MOMO_FLOAT_ACCOUNTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS momo_float_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  network         TEXT NOT NULL,
  balance         NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_balance     NUMERIC(12,2) NOT NULL DEFAULT 500,
  last_topped_up  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, network)
);
ALTER TABLE momo_float_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own floats" ON momo_float_accounts;
CREATE POLICY "Businesses manage own floats" ON momo_float_accounts FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON momo_float_accounts TO authenticated;

-- ─── 53. MOMO_TRANSACTIONS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS momo_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  amount          NUMERIC(12,2) NOT NULL,
  fee             NUMERIC(10,4) DEFAULT 0,
  commission      NUMERIC(10,4) DEFAULT 0,
  network         TEXT NOT NULL,
  reference       TEXT,
  customer_name   TEXT,
  customer_phone  TEXT,
  status          TEXT NOT NULL DEFAULT 'completed',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE momo_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own momo_transactions" ON momo_transactions;
CREATE POLICY "Businesses manage own momo_transactions" ON momo_transactions FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON momo_transactions TO authenticated;

-- ─── 54. MENU_ITEMS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT,
  category          TEXT NOT NULL DEFAULT 'Main Course',
  price             NUMERIC(10,2) NOT NULL,
  preparation_time  INT,
  is_available      BOOLEAN NOT NULL DEFAULT true,
  is_popular        BOOLEAN NOT NULL DEFAULT false,
  image_url         TEXT,
  allergens         TEXT[],
  calories          INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Menu items public read" ON menu_items;
DROP POLICY IF EXISTS "Businesses manage own menu" ON menu_items;
CREATE POLICY "Menu items public read" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Businesses manage own menu" ON menu_items FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON menu_items TO authenticated;
GRANT SELECT ON menu_items TO anon;

-- ─── 55. RESTAURANT_TABLES ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_number      TEXT NOT NULL,
  capacity          INT NOT NULL DEFAULT 4,
  status            TEXT NOT NULL DEFAULT 'available',
  current_order_id  UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own tables" ON restaurant_tables;
CREATE POLICY "Businesses manage own tables" ON restaurant_tables FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON restaurant_tables TO authenticated;

-- ─── 56. DINING_ORDERS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dining_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  table_number      TEXT,
  order_type        TEXT NOT NULL DEFAULT 'dine_in',
  status            TEXT NOT NULL DEFAULT 'pending',
  items             JSONB NOT NULL DEFAULT '[]',
  total_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  customer_name     TEXT,
  estimated_ready   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE dining_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own dining_orders" ON dining_orders;
CREATE POLICY "Businesses manage own dining_orders" ON dining_orders FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON dining_orders TO authenticated;

-- ─── 57. PHARMACY_MEDICINES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_medicines (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  generic_name          TEXT,
  category              TEXT NOT NULL DEFAULT 'Other',
  unit                  TEXT NOT NULL DEFAULT 'Tablets',
  stock_quantity        INT NOT NULL DEFAULT 0,
  reorder_level         INT NOT NULL DEFAULT 20,
  unit_cost             NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  expiry_date           DATE,
  batch_number          TEXT,
  supplier              TEXT,
  requires_prescription BOOLEAN NOT NULL DEFAULT false,
  storage_temp          TEXT NOT NULL DEFAULT 'Room Temperature (15–25°C)',
  is_active             BOOLEAN NOT NULL DEFAULT true,
  image_url             TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pharmacy_medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own medicines" ON pharmacy_medicines;
CREATE POLICY "Businesses manage own medicines" ON pharmacy_medicines FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON pharmacy_medicines TO authenticated;

-- ─── 58. PHARMACY_PRESCRIPTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pharmacy_prescriptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  patient_name     TEXT NOT NULL,
  patient_phone    TEXT,
  doctor_name      TEXT,
  prescription_url TEXT,
  items            JSONB NOT NULL DEFAULT '[]',
  status           TEXT NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE pharmacy_prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own prescriptions" ON pharmacy_prescriptions;
CREATE POLICY "Businesses manage own prescriptions" ON pharmacy_prescriptions FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON pharmacy_prescriptions TO authenticated;

-- ─── 59. HOTEL_ROOMS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_rooms (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_number      TEXT NOT NULL,
  room_type        TEXT NOT NULL DEFAULT 'Standard',
  floor            INT NOT NULL DEFAULT 1,
  capacity         INT NOT NULL DEFAULT 2,
  rate_per_night   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'available',
  amenities        TEXT[] NOT NULL DEFAULT '{}',
  current_guest    TEXT,
  checkout_date    DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, room_number)
);
ALTER TABLE hotel_rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own hotel_rooms" ON hotel_rooms;
CREATE POLICY "Businesses manage own hotel_rooms" ON hotel_rooms FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON hotel_rooms TO authenticated;

-- ─── 60. HOTEL_RESERVATIONS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_reservations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  room_id          UUID NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
  room_number      TEXT NOT NULL,
  guest_name       TEXT NOT NULL,
  guest_email      TEXT,
  guest_phone      TEXT,
  check_in         DATE NOT NULL,
  check_out        DATE NOT NULL,
  adults           INT NOT NULL DEFAULT 1,
  children         INT NOT NULL DEFAULT 0,
  total_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'confirmed',
  special_requests TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE hotel_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own hotel_reservations" ON hotel_reservations;
CREATE POLICY "Businesses manage own hotel_reservations" ON hotel_reservations FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON hotel_reservations TO authenticated;

-- ─── 61. FARM_CROPS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farm_crops (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id          UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  variety              TEXT,
  field_name           TEXT NOT NULL,
  area_acres           NUMERIC(8,2) NOT NULL DEFAULT 1,
  planting_date        DATE NOT NULL,
  expected_harvest     DATE NOT NULL,
  status               TEXT NOT NULL DEFAULT 'land_prep',
  estimated_yield_kg   NUMERIC(12,2) NOT NULL DEFAULT 0,
  actual_yield_kg      NUMERIC(12,2),
  selling_price_per_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
  input_cost           NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE farm_crops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own farm_crops" ON farm_crops;
CREATE POLICY "Businesses manage own farm_crops" ON farm_crops FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON farm_crops TO authenticated;

-- ─── 62. FARM_PRODUCE ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farm_produce (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  crop_name     TEXT NOT NULL,
  quantity_kg   NUMERIC(12,2) NOT NULL DEFAULT 0,
  available_kg  NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_per_kg  NUMERIC(10,2) NOT NULL DEFAULT 0,
  harvest_date  DATE NOT NULL,
  location      TEXT NOT NULL,
  grade         TEXT NOT NULL DEFAULT 'Grade A (Premium)',
  is_listed     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE farm_produce ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Farm produce public read" ON farm_produce;
DROP POLICY IF EXISTS "Businesses manage own farm_produce" ON farm_produce;
CREATE POLICY "Farm produce public read" ON farm_produce FOR SELECT USING (is_listed = true);
CREATE POLICY "Businesses manage own farm_produce" ON farm_produce FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON farm_produce TO authenticated;
GRANT SELECT ON farm_produce TO anon;

-- ─── 63. CLINIC_PATIENTS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_patients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  date_of_birth     DATE,
  gender            TEXT,
  blood_group       TEXT,
  allergies         TEXT,
  emergency_contact TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE clinic_patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own clinic_patients" ON clinic_patients;
CREATE POLICY "Businesses manage own clinic_patients" ON clinic_patients FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON clinic_patients TO authenticated;

-- ─── 64. CLINIC_APPOINTMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clinic_appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  patient_id       UUID,
  patient_name     TEXT NOT NULL,
  patient_phone    TEXT,
  doctor_name      TEXT NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'General Consultation',
  date             DATE NOT NULL,
  time             TIME NOT NULL DEFAULT '09:00',
  duration_minutes INT NOT NULL DEFAULT 30,
  status           TEXT NOT NULL DEFAULT 'scheduled',
  notes            TEXT,
  fee              NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_paid          BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE clinic_appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own clinic_appointments" ON clinic_appointments;
CREATE POLICY "Businesses manage own clinic_appointments" ON clinic_appointments FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON clinic_appointments TO authenticated;

-- ─── 65. SCHOOL_STUDENTS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_students (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id      UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  student_id       TEXT NOT NULL,
  full_name        TEXT NOT NULL,
  class_name       TEXT NOT NULL,
  gender           TEXT,
  date_of_birth    DATE,
  parent_name      TEXT,
  parent_phone     TEXT,
  enrollment_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'active',
  fees_paid        NUMERIC(10,2) NOT NULL DEFAULT 0,
  fees_owing       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE school_students ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own school_students" ON school_students;
CREATE POLICY "Businesses manage own school_students" ON school_students FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON school_students TO authenticated;

-- ─── 66. SCHOOL_ATTENDANCE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_attendance (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  student_id   TEXT NOT NULL,
  student_name TEXT NOT NULL,
  class_name   TEXT NOT NULL,
  date         DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'present',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE school_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own school_attendance" ON school_attendance;
CREATE POLICY "Businesses manage own school_attendance" ON school_attendance FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON school_attendance TO authenticated;

-- ─── 67. SCHOOL_FEE_PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_fee_payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  student_id     TEXT NOT NULL,
  student_name   TEXT NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  term           TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE school_fee_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own school_fee_payments" ON school_fee_payments;
CREATE POLICY "Businesses manage own school_fee_payments" ON school_fee_payments FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON school_fee_payments TO authenticated;

-- ─── 68. PROFESSIONAL_CLIENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  company      TEXT,
  email        TEXT,
  phone        TEXT,
  industry     TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  total_billed NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE professional_clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own professional_clients" ON professional_clients;
CREATE POLICY "Businesses manage own professional_clients" ON professional_clients FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON professional_clients TO authenticated;

-- ─── 69. PROFESSIONAL_PROJECTS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id    UUID,
  client_name  TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT,
  type         TEXT NOT NULL DEFAULT 'Business Consulting',
  status       TEXT NOT NULL DEFAULT 'proposal',
  start_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date     DATE,
  budget       NUMERIC(12,2) NOT NULL DEFAULT 0,
  billed       NUMERIC(12,2) NOT NULL DEFAULT 0,
  hours_logged NUMERIC(8,2) NOT NULL DEFAULT 0,
  hourly_rate  NUMERIC(10,2) NOT NULL DEFAULT 150,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE professional_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own professional_projects" ON professional_projects;
CREATE POLICY "Businesses manage own professional_projects" ON professional_projects FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON professional_projects TO authenticated;

-- ─── 70. PROFESSIONAL_TIME_ENTRIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS professional_time_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL,
  project_title TEXT NOT NULL,
  client_name   TEXT NOT NULL,
  description   TEXT NOT NULL,
  hours         NUMERIC(6,2) NOT NULL,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE professional_time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Businesses manage own time_entries" ON professional_time_entries;
CREATE POLICY "Businesses manage own time_entries" ON professional_time_entries FOR ALL
  USING (business_id IN (SELECT business_id FROM user_profiles WHERE id = auth.uid()));
GRANT ALL ON professional_time_entries TO authenticated;

-- ─── 70. GRA E-INVOICING COLUMNS (invoices table) ───────────────────────────
-- Add GRA EFRIS submission tracking fields to the core invoices table.
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gra_submission_id  TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gra_status         TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gra_submitted_at   TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tin                TEXT;       -- buyer TIN (optional)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number     TEXT;       -- alias for invoice_no (API compat)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_name        TEXT;       -- denormalized client name
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email       TEXT;       -- denormalized client email
-- Add tax as plain alias column (GENERATED columns can conflict with existing constraints)
DO $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invoices' AND column_name='tax') THEN
    ALTER TABLE invoices ADD COLUMN tax NUMERIC(15,2);
    UPDATE invoices SET tax = tax_amount WHERE tax IS NULL AND tax_amount IS NOT NULL;
  END IF;
END;
$;

-- Index for fast GRA status lookups
CREATE INDEX IF NOT EXISTS idx_invoices_gra_status ON invoices(gra_status) WHERE gra_status IS NOT NULL;

-- ─── 71. SKILL PROFILES (Module 19 — Skills Marketplace) ───────────────────
CREATE TABLE IF NOT EXISTS skill_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT NOT NULL,
  avatar_url      TEXT,
  title           TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other',
  skills          TEXT[] NOT NULL DEFAULT '{}',
  level           TEXT NOT NULL DEFAULT 'Intermediate',
  availability    TEXT NOT NULL DEFAULT 'Freelance',
  hourly_rate     NUMERIC(10,2),
  location        TEXT,
  bio             TEXT,
  verified        BOOLEAN NOT NULL DEFAULT false,
  rating          NUMERIC(3,1) NOT NULL DEFAULT 0,
  reviews_count   INT NOT NULL DEFAULT 0,
  jobs_completed  INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE skill_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read skill_profiles" ON skill_profiles;
CREATE POLICY "Public read skill_profiles" ON skill_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Own skill_profiles" ON skill_profiles;
CREATE POLICY "Own skill_profiles" ON skill_profiles FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT ALL ON skill_profiles TO authenticated;
GRANT SELECT ON skill_profiles TO anon;

CREATE INDEX IF NOT EXISTS idx_skill_profiles_category ON skill_profiles(category);
CREATE INDEX IF NOT EXISTS idx_skill_profiles_rating ON skill_profiles(rating DESC);
