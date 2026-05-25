-- ============================================================
-- KENUXA CORE — Schema v2 (Ecosystem OS Upgrade)
-- Extends schema.sql — run AFTER schema.sql
-- ============================================================
-- New tables:
--   kenux_wallets, kenux_transactions,
--   subscription_tiers, subscriptions,
--   feature_gates, payment_events,
--   ecosystem_tokens, admin_logs
-- ============================================================

-- ─── KENUX Wallet System ──────────────────────────────────────

create table if not exists public.kenux_wallets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  org_id           uuid references public.organizations(id) on delete set null,
  balance          numeric(14, 2) not null default 0 check (balance >= 0),
  lifetime_earned  numeric(14, 2) not null default 0,
  lifetime_spent   numeric(14, 2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id)
);

create type public.kenux_tx_type as enum (
  'purchase', 'earn', 'spend', 'transfer_in', 'transfer_out',
  'refund', 'welcome_bonus', 'subscription_credit',
  'marketplace_sale', 'admin_grant'
);

create table if not exists public.kenux_transactions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  org_id         uuid references public.organizations(id) on delete set null,
  type           public.kenux_tx_type not null,
  amount         numeric(14, 2) not null,   -- positive=credit, negative=debit
  balance_before numeric(14, 2) not null,
  balance_after  numeric(14, 2) not null,
  description    text not null,
  reference      text,
  metadata       jsonb not null default '{}',
  created_at     timestamptz not null default now()
);

create index if not exists idx_kenux_wallets_user       on public.kenux_wallets(user_id);
create index if not exists idx_kenux_transactions_user  on public.kenux_transactions(user_id, created_at desc);

-- ─── Subscription Tiers ────────────────────────────────────────

create table if not exists public.subscription_tiers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  slug              text not null unique,
  badge_color       text not null default '#6b7280',
  monthly_price_usd numeric(8, 2) not null default 0,
  yearly_price_usd  numeric(8, 2) not null default 0,
  features          jsonb not null default '{}',
  limits            jsonb not null default '{}',
  kenux_monthly_bonus integer not null default 0,
  sort_order        integer not null default 0,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now()
);

insert into public.subscription_tiers
  (name, slug, badge_color, monthly_price_usd, yearly_price_usd, features, limits, kenux_monthly_bonus, sort_order)
values
  ('Free',        'free',        '#6b7280', 0,   0,    '{"basic_search":true,"public_intel":true}',  '{"ai_requests":100,"kenux_monthly":5000}',   5000,   0),
  ('Pro',         'pro',         '#6366f1', 29,  290,  '{"advanced_ai":true,"api_access":true}',     '{"ai_requests":1000,"kenux_monthly":20000}', 20000,  1),
  ('Business',    'business',    '#10b981', 79,  790,  '{"custom_crawlers":true,"team":true}',       '{"ai_requests":5000,"kenux_monthly":100000}',100000, 2),
  ('Enterprise',  'enterprise',  '#f59e0b', 299, 2990, '{"dedicated_infra":true,"sla":true}',        '{"ai_requests":50000,"kenux_monthly":-1}',   0,      3),
  ('Government',  'government',  '#ef4444', 499, 4990, '{"gov_security":true,"compliance":true}',   '{"ai_requests":100000,"kenux_monthly":-1}',  0,      4),
  ('Partner',     'partner',     '#8b5cf6', 0,   0,    '{"revenue_share":true,"co_marketing":true}','{"ai_requests":10000,"kenux_monthly":50000}', 50000,  5)
on conflict (slug) do nothing;

-- ─── Subscriptions ─────────────────────────────────────────────

create table if not exists public.subscriptions (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  org_id                      uuid references public.organizations(id) on delete set null,
  tier_id                     uuid references public.subscription_tiers(id),
  status                      text not null default 'active' check (status in ('active','cancelled','expired','paused')),
  current_period_start        timestamptz,
  current_period_end          timestamptz,
  cancel_at_period_end        boolean not null default false,
  paystack_customer_code      text,
  paystack_subscription_code  text,
  paystack_plan_code          text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index if not exists idx_subscriptions_user on public.subscriptions(user_id);

-- ─── Feature Gates ─────────────────────────────────────────────

create table if not exists public.feature_gates (
  feature_key   text primary key,
  is_enabled    boolean not null default true,
  min_tier      text,
  required_kenux integer,
  allowed_orgs  text[] not null default '{}',
  metadata      jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

insert into public.feature_gates (feature_key, is_enabled, min_tier) values
  ('search_basic',         true,  'free'),
  ('search_advanced',      true,  'pro'),
  ('search_semantic',      true,  'business'),
  ('trends_basic',         true,  'free'),
  ('trends_advanced',      true,  'pro'),
  ('intelligence_export',  true,  'pro'),
  ('marketplace_browse',   true,  'free'),
  ('marketplace_sell',     true,  'pro'),
  ('api_access',           true,  'pro'),
  ('custom_crawlers',      true,  'business'),
  ('team_workspace',       true,  'business'),
  ('admin_access',         true,  null)
on conflict (feature_key) do nothing;

-- ─── Payment Events (Paystack idempotency log) ─────────────────

create table if not exists public.payment_events (
  id                  uuid primary key default gen_random_uuid(),
  event_type          text not null,
  amount              numeric(12, 2),
  currency            text not null default 'NGN',
  paystack_reference  text,
  paystack_event_id   text not null unique,
  status              text not null default 'success',
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now()
);

create index if not exists idx_payment_events_ref on public.payment_events(paystack_reference);

-- ─── Ecosystem Service Tokens ──────────────────────────────────
-- Cross-app service keys (app-to-app internal calls)

create table if not exists public.ecosystem_tokens (
  id           uuid primary key default gen_random_uuid(),
  app          text not null,
  key_hash     text not null unique,
  scopes       text[] not null default '{}',
  description  text,
  revoked_at   timestamptz,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ─── Admin Logs ────────────────────────────────────────────────

create table if not exists public.admin_logs (
  id            uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  action        text not null,
  target_type   text not null,
  target_id     text,
  description   text,
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

-- ─── RLS ───────────────────────────────────────────────────────

alter table public.kenux_wallets        enable row level security;
alter table public.kenux_transactions   enable row level security;
alter table public.subscription_tiers   enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.feature_gates        enable row level security;
alter table public.payment_events       enable row level security;
alter table public.ecosystem_tokens     enable row level security;
alter table public.admin_logs           enable row level security;

-- Users can see their own wallet and transactions
drop policy if exists "wallet_owner" on public.kenux_wallets;
create policy "wallet_owner" on public.kenux_wallets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "transactions_owner" on public.kenux_transactions;
create policy "transactions_owner" on public.kenux_transactions
  for select using (user_id = auth.uid());

-- Subscription tiers are public
drop policy if exists "tiers_public_read" on public.subscription_tiers;
create policy "tiers_public_read" on public.subscription_tiers
  for select using (true);

-- User can see their own subscription
drop policy if exists "subscriptions_owner" on public.subscriptions;
create policy "subscriptions_owner" on public.subscriptions
  for select using (user_id = auth.uid());

-- Feature gates are readable by all authenticated users
drop policy if exists "feature_gates_read" on public.feature_gates;
create policy "feature_gates_read" on public.feature_gates
  for select using (auth.uid() is not null);

-- ─── Wallet helper functions ───────────────────────────────────

create or replace function public.credit_kenux(
  p_user_id   uuid,
  p_amount    numeric,
  p_type      public.kenux_tx_type,
  p_desc      text,
  p_ref       text default null,
  p_meta      jsonb default '{}'
) returns public.kenux_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.kenux_wallets;
  v_tx     public.kenux_transactions;
begin
  -- upsert wallet
  insert into public.kenux_wallets (user_id, balance, lifetime_earned)
  values (p_user_id, p_amount, p_amount)
  on conflict (user_id) do update
    set balance         = kenux_wallets.balance + p_amount,
        lifetime_earned = kenux_wallets.lifetime_earned + p_amount,
        updated_at      = now()
  returning * into v_wallet;

  insert into public.kenux_transactions
    (user_id, type, amount, balance_before, balance_after, description, reference, metadata)
  values
    (p_user_id, p_type, p_amount,
     v_wallet.balance - p_amount, v_wallet.balance,
     p_desc, p_ref, p_meta)
  returning * into v_tx;

  return v_tx;
end;
$$;

create or replace function public.debit_kenux(
  p_user_id   uuid,
  p_amount    numeric,
  p_type      public.kenux_tx_type,
  p_desc      text,
  p_ref       text default null,
  p_meta      jsonb default '{}'
) returns public.kenux_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet public.kenux_wallets;
  v_tx     public.kenux_transactions;
begin
  select * into v_wallet from public.kenux_wallets where user_id = p_user_id for update;
  if not found then
    raise exception 'Wallet not found for user %', p_user_id;
  end if;
  if v_wallet.balance < p_amount then
    raise exception 'Insufficient KENUX balance: have %, need %', v_wallet.balance, p_amount;
  end if;

  update public.kenux_wallets
  set balance       = balance - p_amount,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at    = now()
  where user_id = p_user_id;

  insert into public.kenux_transactions
    (user_id, type, amount, balance_before, balance_after, description, reference, metadata)
  values
    (p_user_id, p_type, -p_amount,
     v_wallet.balance, v_wallet.balance - p_amount,
     p_desc, p_ref, p_meta)
  returning * into v_tx;

  return v_tx;
end;
$$;
