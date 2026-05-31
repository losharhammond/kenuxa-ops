-- ═══════════════════════════════════════════════════════════════════════════
-- KENUXA BUSINESS NETWORK — Full Database Schema
-- Multi-tenant, enterprise-grade, Ghana-first
-- ═══════════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE business_type AS ENUM (
  'retailer','supermarket','pharmacy','restaurant','hotel','manufacturer',
  'distributor','service_provider','professional','freelancer','agency',
  'contractor','wholesaler','importer'
);

CREATE TYPE business_status AS ENUM ('active','suspended','pending','closed');
CREATE TYPE verification_status AS ENUM ('unverified','pending','verified','rejected');
CREATE TYPE user_role AS ENUM (
  'super_admin','country_admin','business_owner','branch_manager',
  'cashier','employee','customer','supplier','delivery_rider',
  'recruiter','job_seeker','financial_partner'
);

CREATE TYPE order_status AS ENUM ('pending','confirmed','processing','shipped','delivered','cancelled','refunded');
CREATE TYPE payment_status AS ENUM ('pending','processing','paid','failed','refunded','partial');
CREATE TYPE payment_method AS ENUM ('cash','mtn_momo','telecel_cash','at_money','visa','mastercard','bank_transfer','wallet');
CREATE TYPE job_type AS ENUM ('full_time','part_time','contract','gig','internship');
CREATE TYPE delivery_status AS ENUM ('pending','assigned','picked_up','in_transit','delivered','failed');
CREATE TYPE invoice_status AS ENUM ('draft','sent','paid','overdue','cancelled');
CREATE TYPE campaign_type AS ENUM ('facebook','instagram','whatsapp','sms','email');
CREATE TYPE campaign_status AS ENUM ('draft','scheduled','active','paused','completed');

-- ─── CORE MULTI-TENANT: ORGANISATIONS ───────────────────────────────────────

CREATE TABLE organisations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  country         TEXT NOT NULL DEFAULT 'GH',
  currency        TEXT NOT NULL DEFAULT 'GHS',
  timezone        TEXT NOT NULL DEFAULT 'Africa/Accra',
  plan            TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USER PROFILES ───────────────────────────────────────────────────────────

CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id        UUID REFERENCES organisations(id),
  role          user_role NOT NULL DEFAULT 'customer',
  full_name     TEXT NOT NULL,
  phone         TEXT,
  avatar_url    TEXT,
  bio           TEXT,
  location      TEXT,
  country       TEXT DEFAULT 'GH',
  language      TEXT DEFAULT 'en',
  is_verified   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 1 & 2: BUSINESS DIRECTORY + REPUTATION ──────────────────────────

CREATE TABLE business_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  icon        TEXT,
  description TEXT,
  parent_id   UUID REFERENCES business_categories(id),
  sort_order  INT DEFAULT 0
);

CREATE TABLE businesses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id              UUID REFERENCES organisations(id),
  owner_id            UUID NOT NULL REFERENCES user_profiles(id),
  category_id         UUID REFERENCES business_categories(id),
  slug                TEXT UNIQUE NOT NULL,
  name                TEXT NOT NULL,
  type                business_type NOT NULL,
  tagline             TEXT,
  description         TEXT,
  logo_url            TEXT,
  banner_url          TEXT,
  phone               TEXT,
  whatsapp            TEXT,
  email               TEXT,
  website             TEXT,
  address             TEXT,
  city                TEXT,
  region              TEXT,
  country             TEXT NOT NULL DEFAULT 'GH',
  postal_code         TEXT,
  lat                 DOUBLE PRECISION,
  lng                 DOUBLE PRECISION,
  location            GEOMETRY(POINT, 4326),
  business_hours      JSONB DEFAULT '{}',
  social_links        JSONB DEFAULT '{}',
  tags                TEXT[] DEFAULT '{}',
  status              business_status NOT NULL DEFAULT 'active',
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  verified_at         TIMESTAMPTZ,
  is_featured         BOOLEAN DEFAULT FALSE,
  trust_score         NUMERIC(3,1) DEFAULT 0,
  avg_rating          NUMERIC(3,1) DEFAULT 0,
  total_reviews       INT DEFAULT 0,
  total_sales         BIGINT DEFAULT 0,
  view_count          INT DEFAULT 0,
  employee_count      TEXT,
  founded_year        INT,
  tax_id              TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_location   ON businesses USING GIST(location);
CREATE INDEX idx_businesses_category   ON businesses(category_id);
CREATE INDEX idx_businesses_type       ON businesses(type);
CREATE INDEX idx_businesses_city       ON businesses(city);
CREATE INDEX idx_businesses_status     ON businesses(status);
CREATE INDEX idx_businesses_name_trgm  ON businesses USING GIN(name gin_trgm_ops);
CREATE INDEX idx_businesses_tags       ON businesses USING GIN(tags);

CREATE TABLE business_branches (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  is_main     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE business_reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES user_profiles(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, reviewer_id)
);

CREATE TABLE business_disputes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  reporter_id UUID NOT NULL REFERENCES user_profiles(id),
  reason      TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 3: PRODUCT MARKETPLACE ───────────────────────────────────────────

CREATE TABLE product_categories (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name      TEXT NOT NULL,
  slug      TEXT UNIQUE NOT NULL,
  icon      TEXT,
  parent_id UUID REFERENCES product_categories(id)
);

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES product_categories(id),
  sku           TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  price         NUMERIC(15,2) NOT NULL DEFAULT 0,
  compare_price NUMERIC(15,2),
  cost_price    NUMERIC(15,2),
  currency      TEXT DEFAULT 'GHS',
  unit          TEXT DEFAULT 'pcs',
  images        TEXT[] DEFAULT '{}',
  tags          TEXT[] DEFAULT '{}',
  barcode       TEXT,
  weight        NUMERIC(10,3),
  stock_qty     INT DEFAULT 0,
  low_stock_threshold INT DEFAULT 5,
  track_inventory BOOLEAN DEFAULT TRUE,
  is_active     BOOLEAN DEFAULT TRUE,
  is_featured   BOOLEAN DEFAULT FALSE,
  allow_orders  BOOLEAN DEFAULT TRUE,
  avg_rating    NUMERIC(3,1) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  total_sold    INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_business  ON products(business_id);
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_name_trgm ON products USING GIN(name gin_trgm_ops);

-- ─── MODULE 4: SERVICE MARKETPLACE ───────────────────────────────────────────

CREATE TABLE services (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  category     TEXT,
  price_type   TEXT DEFAULT 'fixed',   -- fixed, hourly, quote
  price        NUMERIC(15,2),
  currency     TEXT DEFAULT 'GHS',
  duration     INT,                    -- minutes
  images       TEXT[] DEFAULT '{}',
  portfolio_urls TEXT[] DEFAULT '{}',
  is_active    BOOLEAN DEFAULT TRUE,
  avg_rating   NUMERIC(3,1) DEFAULT 0,
  total_reviews INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE service_quotes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id  UUID NOT NULL REFERENCES services(id),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES user_profiles(id),
  message     TEXT,
  budget      NUMERIC(15,2),
  status      TEXT DEFAULT 'pending',
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 5: POS SYSTEM ─────────────────────────────────────────────────────

CREATE TABLE pos_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  branch_id   UUID REFERENCES business_branches(id),
  cashier_id  UUID NOT NULL REFERENCES user_profiles(id),
  opened_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at   TIMESTAMPTZ,
  opening_float NUMERIC(15,2) DEFAULT 0,
  closing_float NUMERIC(15,2),
  total_sales NUMERIC(15,2) DEFAULT 0,
  total_cash  NUMERIC(15,2) DEFAULT 0,
  total_momo  NUMERIC(15,2) DEFAULT 0,
  total_card  NUMERIC(15,2) DEFAULT 0,
  notes       TEXT,
  status      TEXT DEFAULT 'open'
);

CREATE TABLE sales (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  branch_id       UUID REFERENCES business_branches(id),
  session_id      UUID REFERENCES pos_sessions(id),
  cashier_id      UUID REFERENCES user_profiles(id),
  customer_id     UUID REFERENCES user_profiles(id),
  receipt_no      TEXT UNIQUE NOT NULL,
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  tax_amount      NUMERIC(15,2) DEFAULT 0,
  total           NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid     NUMERIC(15,2) DEFAULT 0,
  change_amount   NUMERIC(15,2) DEFAULT 0,
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  payment_ref     TEXT,
  status          order_status NOT NULL DEFAULT 'confirmed',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sale_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  name        TEXT NOT NULL,
  sku         TEXT,
  qty         NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(15,2) NOT NULL,
  discount    NUMERIC(15,2) DEFAULT 0,
  total       NUMERIC(15,2) NOT NULL
);

CREATE INDEX idx_sales_business   ON sales(business_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_cashier    ON sales(cashier_id);

-- ─── MODULE 6: INVENTORY ──────────────────────────────────────────────────────

CREATE TABLE warehouses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name        TEXT NOT NULL,
  address     TEXT,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_transactions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  warehouse_id  UUID REFERENCES warehouses(id),
  product_id    UUID NOT NULL REFERENCES products(id),
  type          TEXT NOT NULL,  -- purchase, sale, adjustment, return, transfer
  qty           NUMERIC(10,3) NOT NULL,
  qty_before    NUMERIC(10,3),
  qty_after     NUMERIC(10,3),
  unit_cost     NUMERIC(15,2),
  reference_id  UUID,
  notes         TEXT,
  created_by    UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 7: CRM ───────────────────────────────────────────────────────────

CREATE TABLE crm_customers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  user_id       UUID REFERENCES user_profiles(id),
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  address       TEXT,
  city          TEXT,
  notes         TEXT,
  tags          TEXT[] DEFAULT '{}',
  segment       TEXT DEFAULT 'general',
  lifetime_value NUMERIC(15,2) DEFAULT 0,
  total_orders  INT DEFAULT 0,
  last_purchase TIMESTAMPTZ,
  loyalty_points INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_interactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  customer_id UUID NOT NULL REFERENCES crm_customers(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,   -- call, sms, email, visit, purchase, note
  subject     TEXT,
  body        TEXT,
  staff_id    UUID REFERENCES user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  source      TEXT,
  status      TEXT DEFAULT 'new',  -- new, contacted, qualified, converted, lost
  value       NUMERIC(15,2),
  notes       TEXT,
  assigned_to UUID REFERENCES user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 8: INVOICING & ACCOUNTING ────────────────────────────────────────

CREATE TABLE invoices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  customer_id   UUID REFERENCES crm_customers(id),
  invoice_no    TEXT NOT NULL,
  type          TEXT DEFAULT 'invoice',  -- quote, invoice, receipt
  subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_rate      NUMERIC(5,2) DEFAULT 0,
  tax_amount    NUMERIC(15,2) DEFAULT 0,
  discount      NUMERIC(15,2) DEFAULT 0,
  total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid   NUMERIC(15,2) DEFAULT 0,
  balance_due   NUMERIC(15,2) DEFAULT 0,
  currency      TEXT DEFAULT 'GHS',
  status        invoice_status NOT NULL DEFAULT 'draft',
  issued_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE,
  paid_date     DATE,
  notes         TEXT,
  terms         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(business_id, invoice_no)
);

CREATE TABLE invoice_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id  UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  description TEXT NOT NULL,
  qty         NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_price  NUMERIC(15,2) NOT NULL,
  discount    NUMERIC(15,2) DEFAULT 0,
  total       NUMERIC(15,2) NOT NULL
);

CREATE TABLE expenses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  amount      NUMERIC(15,2) NOT NULL,
  currency    TEXT DEFAULT 'GHS',
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor      TEXT,
  receipt_url TEXT,
  payment_method payment_method DEFAULT 'cash',
  recorded_by UUID REFERENCES user_profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 9: JOBS MARKETPLACE ──────────────────────────────────────────────

CREATE TABLE job_listings (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  type          job_type NOT NULL DEFAULT 'full_time',
  category      TEXT,
  location      TEXT,
  is_remote     BOOLEAN DEFAULT FALSE,
  salary_min    NUMERIC(15,2),
  salary_max    NUMERIC(15,2),
  salary_period TEXT DEFAULT 'monthly',
  currency      TEXT DEFAULT 'GHS',
  skills        TEXT[] DEFAULT '{}',
  requirements  TEXT,
  benefits      TEXT,
  deadline      DATE,
  openings      INT DEFAULT 1,
  is_active     BOOLEAN DEFAULT TRUE,
  views         INT DEFAULT 0,
  applications  INT DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE job_applications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id      UUID NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES user_profiles(id),
  cover_letter TEXT,
  cv_url      TEXT,
  status      TEXT DEFAULT 'pending',  -- pending, reviewing, shortlisted, interviewed, hired, rejected
  notes       TEXT,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(job_id, applicant_id)
);

CREATE TABLE worker_profiles (
  id              UUID PRIMARY KEY REFERENCES user_profiles(id),
  headline        TEXT,
  bio             TEXT,
  skills          TEXT[] DEFAULT '{}',
  experience_years INT,
  hourly_rate     NUMERIC(10,2),
  availability    TEXT DEFAULT 'available',
  portfolio_url   TEXT,
  cv_url          TEXT,
  certifications  TEXT[] DEFAULT '{}',
  languages       TEXT[] DEFAULT '{}',
  avg_rating      NUMERIC(3,1) DEFAULT 0,
  jobs_completed  INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 10: SUPPLIER NETWORK ─────────────────────────────────────────────

CREATE TABLE supplier_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  categories      TEXT[] DEFAULT '{}',
  moq             INT,                 -- minimum order quantity
  lead_time_days  INT,
  payment_terms   TEXT,
  certifications  TEXT[] DEFAULT '{}',
  is_verified     BOOLEAN DEFAULT FALSE,
  avg_rating      NUMERIC(3,1) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rfqs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id    UUID NOT NULL REFERENCES businesses(id),
  supplier_id UUID REFERENCES businesses(id),
  title       TEXT NOT NULL,
  description TEXT,
  items       JSONB DEFAULT '[]',
  deadline    DATE,
  status      TEXT DEFAULT 'open',  -- open, quoted, accepted, closed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  supplier_id   UUID REFERENCES businesses(id),
  po_number     TEXT NOT NULL,
  subtotal      NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount    NUMERIC(15,2) DEFAULT 0,
  total         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency      TEXT DEFAULT 'GHS',
  status        TEXT DEFAULT 'draft',  -- draft, sent, confirmed, partial, received, cancelled
  expected_date DATE,
  received_date DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id       UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id  UUID REFERENCES products(id),
  description TEXT NOT NULL,
  qty         NUMERIC(10,3) NOT NULL DEFAULT 1,
  unit_cost   NUMERIC(15,2) NOT NULL,
  total       NUMERIC(15,2) NOT NULL,
  received_qty NUMERIC(10,3) DEFAULT 0
);

-- ─── MODULE 11: DELIVERY NETWORK ─────────────────────────────────────────────

CREATE TABLE delivery_riders (
  id          UUID PRIMARY KEY REFERENCES user_profiles(id),
  vehicle_type TEXT DEFAULT 'motorcycle',
  plate_number TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  current_lat  DOUBLE PRECISION,
  current_lng  DOUBLE PRECISION,
  zone         TEXT,
  rating       NUMERIC(3,1) DEFAULT 0,
  total_trips  INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE delivery_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL REFERENCES businesses(id),
  sale_id         UUID REFERENCES sales(id),
  rider_id        UUID REFERENCES delivery_riders(id),
  pickup_address  TEXT NOT NULL,
  pickup_lat      DOUBLE PRECISION,
  pickup_lng      DOUBLE PRECISION,
  delivery_address TEXT NOT NULL,
  delivery_lat    DOUBLE PRECISION,
  delivery_lng    DOUBLE PRECISION,
  recipient_name  TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  delivery_fee    NUMERIC(10,2) DEFAULT 0,
  distance_km     NUMERIC(8,2),
  status          delivery_status NOT NULL DEFAULT 'pending',
  estimated_mins  INT,
  picked_up_at    TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 12: PAYMENTS ─────────────────────────────────────────────────────

CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id    UUID NOT NULL REFERENCES user_profiles(id),
  business_id UUID REFERENCES businesses(id),
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency    TEXT NOT NULL DEFAULT 'GHS',
  is_locked   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID REFERENCES businesses(id),
  wallet_id       UUID REFERENCES wallets(id),
  reference       TEXT UNIQUE NOT NULL,
  type            TEXT NOT NULL,   -- payment, refund, settlement, topup, withdrawal
  amount          NUMERIC(15,2) NOT NULL,
  fee             NUMERIC(15,2) DEFAULT 0,
  net_amount      NUMERIC(15,2),
  currency        TEXT DEFAULT 'GHS',
  method          payment_method NOT NULL,
  provider_ref    TEXT,
  status          payment_status NOT NULL DEFAULT 'pending',
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE escrow_accounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id    UUID NOT NULL REFERENCES user_profiles(id),
  seller_id   UUID NOT NULL REFERENCES businesses(id),
  amount      NUMERIC(15,2) NOT NULL,
  currency    TEXT DEFAULT 'GHS',
  status      TEXT DEFAULT 'held',  -- held, released, refunded, disputed
  reference   TEXT NOT NULL,
  released_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 13: AI BUSINESS ASSISTANT ────────────────────────────────────────

CREATE TABLE ai_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  user_id     UUID NOT NULL REFERENCES user_profiles(id),
  title       TEXT,
  messages    JSONB DEFAULT '[]',
  model       TEXT DEFAULT 'llama-3.1-70b-versatile',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ai_insights (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  type        TEXT NOT NULL,   -- sales_trend, reorder_alert, customer_insight, forecast
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  data        JSONB DEFAULT '{}',
  priority    TEXT DEFAULT 'normal',
  is_read     BOOLEAN DEFAULT FALSE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 14: MARKETING PLATFORM ───────────────────────────────────────────

CREATE TABLE marketing_campaigns (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name        TEXT NOT NULL,
  type        campaign_type NOT NULL,
  status      campaign_status NOT NULL DEFAULT 'draft',
  subject     TEXT,
  content     TEXT NOT NULL,
  audience    JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at     TIMESTAMPTZ,
  recipients  INT DEFAULT 0,
  delivered   INT DEFAULT 0,
  opened      INT DEFAULT 0,
  clicked     INT DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketing_contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name        TEXT NOT NULL,
  phone       TEXT,
  email       TEXT,
  tags        TEXT[] DEFAULT '{}',
  is_subscribed BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── MODULE 15 & 16: ANALYTICS + FINANCIAL SERVICES ──────────────────────────

CREATE TABLE analytics_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  event_type  TEXT NOT NULL,
  entity_type TEXT,
  entity_id   UUID,
  value       NUMERIC(15,2),
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_business   ON analytics_events(business_id);
CREATE INDEX idx_analytics_type       ON analytics_events(event_type);
CREATE INDEX idx_analytics_created_at ON analytics_events(created_at);

CREATE TABLE business_credit_scores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id     UUID NOT NULL UNIQUE REFERENCES businesses(id),
  score           SMALLINT NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 850),
  grade           TEXT,                   -- A, B, C, D, F
  sales_score     SMALLINT DEFAULT 0,
  payment_score   SMALLINT DEFAULT 0,
  customer_score  SMALLINT DEFAULT 0,
  activity_score  SMALLINT DEFAULT 0,
  factors         JSONB DEFAULT '[]',
  last_calculated TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE loan_applications (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL REFERENCES businesses(id),
  lender_id     UUID REFERENCES businesses(id),
  amount        NUMERIC(15,2) NOT NULL,
  currency      TEXT DEFAULT 'GHS',
  purpose       TEXT NOT NULL,
  term_months   INT NOT NULL,
  interest_rate NUMERIC(5,2),
  credit_score  SMALLINT,
  status        TEXT DEFAULT 'pending',
  approved_at   TIMESTAMPTZ,
  disbursed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES user_profiles(id),
  business_id UUID REFERENCES businesses(id),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE organisations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE products                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE services                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_customers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_interactions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_orders            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;

-- Public read policies for directory
CREATE POLICY "public_read_businesses" ON businesses
  FOR SELECT USING (status = 'active');

CREATE POLICY "public_read_products" ON products
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_job_listings" ON job_listings
  FOR SELECT USING (is_active = true);

-- Owner policies
CREATE POLICY "owner_all_businesses" ON businesses
  FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "owner_all_products" ON products
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "owner_all_sales" ON sales
  FOR ALL USING (
    business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    OR cashier_id = auth.uid()
  );

CREATE POLICY "own_profile" ON user_profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "own_notifications" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ─── SEED DATA: Business Categories ─────────────────────────────────────────

INSERT INTO business_categories (name, slug, icon) VALUES
  ('Retail & Shops',       'retail',        '🛒'),
  ('Food & Restaurants',   'food',          '🍽️'),
  ('Health & Pharmacy',    'health',        '💊'),
  ('Professional Services','professional',  '💼'),
  ('Technology',           'technology',    '💻'),
  ('Construction & Trades','construction',  '🔨'),
  ('Education & Training', 'education',     '📚'),
  ('Transport & Logistics','transport',     '🚚'),
  ('Agriculture',          'agriculture',   '🌾'),
  ('Finance & Insurance',  'finance',       '🏦'),
  ('Beauty & Wellness',    'beauty',        '💆'),
  ('Entertainment',        'entertainment', '🎭'),
  ('Real Estate',          'real-estate',   '🏠'),
  ('Manufacturing',        'manufacturing', '🏭'),
  ('Hospitality & Hotels', 'hospitality',   '🏨');

INSERT INTO product_categories (name, slug, icon) VALUES
  ('Electronics',     'electronics',    '📱'),
  ('Food & Groceries','groceries',      '🛒'),
  ('Fashion & Apparel','fashion',       '👕'),
  ('Health & Beauty', 'health-beauty',  '💄'),
  ('Home & Garden',   'home-garden',    '🏡'),
  ('Automotive',      'automotive',     '🚗'),
  ('Books & Stationery','books',        '📖'),
  ('Sports & Fitness','sports',         '⚽'),
  ('Baby & Kids',     'baby-kids',      '👶'),
  ('Agriculture',     'agriculture',    '🌱');
