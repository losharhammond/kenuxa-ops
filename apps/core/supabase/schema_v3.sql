-- ============================================================
-- KENUXA CORE — Schema v3 (Phase 2: Premium Infrastructure)
-- Run AFTER schema.sql and schema_v2.sql
-- ============================================================
-- New tables:
--   notifications, audit_logs,
--   ai_providers, ai_provider_keys, ai_routing_rules, ai_failover_logs,
--   wallet_escrows, billing_accounts,
--   org_invitations, device_sessions
-- ============================================================

-- ─── Notifications ────────────────────────────────────────────

create type public.notification_type as enum (
  'info', 'success', 'warning', 'error',
  'system', 'billing', 'security', 'ai', 'event', 'workflow'
);

create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  type            public.notification_type not null default 'info',
  title           text not null,
  body            text not null,
  action_url      text,
  action_label    text,
  icon            text,
  is_read         boolean not null default false,
  read_at         timestamptz,
  expires_at      timestamptz,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_notifications_user   on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_org    on public.notifications(organization_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifications_owner" on public.notifications;
create policy "notifications_owner" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Audit Logs ───────────────────────────────────────────────

create table if not exists public.audit_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  actor_type      text not null default 'user',   -- user | system | api_key | service
  actor_id        text not null,
  action          text not null,
  resource_type   text not null,
  resource_id     text,
  description     text,
  ip_address      inet,
  user_agent      text,
  request_id      text,
  status          text not null default 'success' check (status in ('success','failure','error')),
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_audit_logs_org    on public.audit_logs(organization_id, created_at desc);
create index if not exists idx_audit_logs_user   on public.audit_logs(user_id, created_at desc);
create index if not exists idx_audit_logs_action on public.audit_logs(action, resource_type, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_org_admin" on public.audit_logs;
create policy "audit_logs_org_admin" on public.audit_logs
  for select using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
      and role in ('organization_owner','organization_admin','super_admin')
    )
  );

-- ─── AI Providers Registry ────────────────────────────────────

create table if not exists public.ai_providers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique,
  base_url     text not null,
  is_active    boolean not null default true,
  capabilities text[] not null default '{}',
  models       jsonb not null default '[]',
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

insert into public.ai_providers (name, slug, base_url, capabilities, models) values
  ('Groq',        'groq',        'https://api.groq.com/openai/v1',         array['chat','fast'],           '["llama-3.1-8b-instant","llama-3.3-70b-versatile","mixtral-8x7b-32768"]'),
  ('OpenAI',      'openai',      'https://api.openai.com/v1',              array['chat','vision','embed'], '["gpt-4o","gpt-4o-mini","text-embedding-3-small"]'),
  ('Anthropic',   'anthropic',   'https://api.anthropic.com/v1',           array['chat','analysis'],       '["claude-opus-4-7","claude-sonnet-4-6","claude-haiku-4-5-20251001"]'),
  ('OpenRouter',  'openrouter',  'https://openrouter.ai/api/v1',           array['chat','routing'],        '["meta-llama/llama-3.3-70b","google/gemini-pro"]'),
  ('Gemini',      'gemini',      'https://generativelanguage.googleapis.com/v1beta', array['chat','vision'], '["gemini-1.5-pro","gemini-1.5-flash","gemini-2.0-flash"]'),
  ('Ollama',      'ollama',      'http://localhost:11434/v1',               array['chat','local'],          '["llama3","mistral","codellama"]')
on conflict (slug) do nothing;

-- ─── AI Provider Keys (per-org, per-app) ─────────────────────

create table if not exists public.ai_provider_keys (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider_id     uuid not null references public.ai_providers(id),
  app_scope       text not null default 'core',  -- core|reach|ops|zuria|academy|*
  key_name        text not null,
  key_hash        text not null,               -- SHA-256 of actual key
  key_prefix      text not null,               -- first 8 chars for display
  is_active       boolean not null default true,
  last_used_at    timestamptz,
  usage_count     bigint not null default 0,
  monthly_limit   integer,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  revoked_at      timestamptz,
  unique (organization_id, provider_id, app_scope, key_name)
);

create index if not exists idx_ai_keys_org      on public.ai_provider_keys(organization_id);
create index if not exists idx_ai_keys_provider on public.ai_provider_keys(provider_id);

alter table public.ai_provider_keys enable row level security;

-- ─── AI Routing Rules ─────────────────────────────────────────

create table if not exists public.ai_routing_rules (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete cascade,
  name             text not null,
  priority         integer not null default 100,
  conditions       jsonb not null default '{}',
  provider_id      uuid references public.ai_providers(id),
  model            text,
  fallback_chain   text[] not null default '{}',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- ─── AI Failover Logs ─────────────────────────────────────────

create table if not exists public.ai_failover_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  from_provider   text not null,
  to_provider     text not null,
  model           text,
  reason          text,
  latency_ms      integer,
  created_at      timestamptz not null default now()
);

create index if not exists idx_failover_org on public.ai_failover_logs(organization_id, created_at desc);

-- ─── Wallet Escrows ───────────────────────────────────────────

create type public.escrow_status as enum ('held','released','cancelled','disputed');

create table if not exists public.wallet_escrows (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid not null references auth.users(id),
  to_user_id      uuid references auth.users(id),
  organization_id uuid references public.organizations(id) on delete set null,
  amount          numeric(14,2) not null check (amount > 0),
  status          public.escrow_status not null default 'held',
  purpose         text not null,
  release_condition text,
  held_at         timestamptz not null default now(),
  released_at     timestamptz,
  cancelled_at    timestamptz,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

alter table public.wallet_escrows enable row level security;

-- ─── Billing Accounts ─────────────────────────────────────────

create table if not exists public.billing_accounts (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  billing_email         text,
  company_name          text,
  vat_number            text,
  address               jsonb not null default '{}',
  paystack_customer_id  text unique,
  stripe_customer_id    text unique,
  payment_method        text,
  auto_recharge_enabled boolean not null default false,
  auto_recharge_threshold numeric(14,2),
  auto_recharge_amount  numeric(14,2),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (organization_id)
);

alter table public.billing_accounts enable row level security;

-- ─── Organization Invitations ─────────────────────────────────

create table if not exists public.org_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invited_by      uuid not null references auth.users(id),
  email           text not null,
  role            text not null default 'viewer',
  token           text not null unique default encode(gen_random_bytes(32), 'hex'),
  status          text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  expires_at      timestamptz not null default (now() + interval '7 days'),
  accepted_at     timestamptz,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create index if not exists idx_invitations_org   on public.org_invitations(organization_id);
create index if not exists idx_invitations_email on public.org_invitations(email, status);
create index if not exists idx_invitations_token on public.org_invitations(token);

alter table public.org_invitations enable row level security;

-- ─── Device Sessions ──────────────────────────────────────────

create table if not exists public.device_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  device_name     text,
  device_type     text,
  browser         text,
  os              text,
  ip_address      inet,
  user_agent      text,
  location        text,
  is_current      boolean not null default false,
  last_active_at  timestamptz not null default now(),
  revoked_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_device_sessions_user on public.device_sessions(user_id, last_active_at desc);

alter table public.device_sessions enable row level security;

drop policy if exists "device_sessions_owner" on public.device_sessions;
create policy "device_sessions_owner" on public.device_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── OPS Command Logs ─────────────────────────────────────────
-- Supports KENUXA OPS voice/command execution

create table if not exists public.ops_commands (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete set null,
  command_type    text not null,  -- voice | text | api | scheduled
  input           text not null,
  parsed_intent   jsonb,
  execution_plan  jsonb,
  status          text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
  result          jsonb,
  error           text,
  duration_ms     integer,
  app_source      text not null default 'ops',
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  completed_at    timestamptz
);

create index if not exists idx_ops_commands_org  on public.ops_commands(organization_id, created_at desc);
create index if not exists idx_ops_commands_user on public.ops_commands(user_id, created_at desc);

alter table public.ops_commands enable row level security;
