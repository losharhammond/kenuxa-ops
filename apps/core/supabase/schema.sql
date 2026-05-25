create extension if not exists "pgcrypto";
create extension if not exists "vector";

create type public.member_role as enum (
  'super_admin',
  'organization_owner',
  'organization_admin',
  'operator',
  'analyst',
  'contributor',
  'viewer'
);

create type public.subscription_tier as enum ('free', 'growth', 'scale', 'enterprise');
create type public.event_status as enum ('queued', 'processing', 'completed', 'failed', 'retrying');
create type public.memory_type as enum ('user', 'organization', 'workflow', 'ai_interaction', 'business', 'vector', 'conversation');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  timezone text default 'UTC',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  branding jsonb not null default '{}',
  subscription_tier public.subscription_tier not null default 'free',
  usage_metrics jsonb not null default '{}',
  quotas jsonb not null default '{"ai_requests_monthly":1000,"events_monthly":10000,"storage_mb":500}',
  api_limits jsonb not null default '{"requests_per_minute":120}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  role public.member_role not null,
  resource text not null,
  action text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique(role, resource, action)
);

create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  key_hash text not null,
  scopes text[] not null default '{}',
  rate_limit_per_minute integer not null default 120,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.ai_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'groq',
  model text not null,
  capability text not null default 'chat',
  active boolean not null default true,
  cost_profile jsonb not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(provider, model, capability)
);

create table public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  provider text not null,
  model text not null,
  task text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  estimated_cost_usd numeric(12, 6) not null default 0,
  latency_ms integer,
  status text not null default 'completed',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.ai_memory (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  type public.memory_type not null,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vector_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  memory_id uuid references public.ai_memory(id) on delete cascade,
  source_type text not null,
  source_id text,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event text not null,
  source text not null,
  payload jsonb not null default '{}',
  status public.event_status not null default 'queued',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  idempotency_key text,
  next_retry_at timestamptz,
  processed_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  unique(organization_id, idempotency_key)
);

create table public.event_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_pattern text not null,
  target_type text not null check (target_type in ('webhook', 'workflow', 'realtime')),
  target_config jsonb not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  trigger_type text not null,
  trigger_config jsonb not null default '{}',
  conditions jsonb not null default '[]',
  actions jsonb not null default '[]',
  enabled boolean not null default true,
  version integer not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid references public.events(id),
  status text not null default 'queued',
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.webhook_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  subscription_id uuid references public.event_subscriptions(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  url text not null,
  status_code integer,
  request_body jsonb not null default '{}',
  response_body text,
  error text,
  created_at timestamptz not null default now()
);

create table public.integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  name text not null,
  config jsonb not null default '{}',
  secret_ref text,
  enabled boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.usage_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  metric text not null,
  value numeric not null default 0,
  window_name text not null,
  recorded_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  resource_type text not null,
  resource_id text,
  ip_address inet,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.graph_nodes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null,
  label text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  from_node_id uuid not null references public.graph_nodes(id) on delete cascade,
  to_node_id uuid not null references public.graph_nodes(id) on delete cascade,
  relationship text not null,
  weight numeric(4, 3) not null default 0.5,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_org_members_user on public.organization_members(user_id);
create index idx_events_org_status on public.events(organization_id, status, created_at desc);
create index idx_ai_memory_org_type on public.ai_memory(organization_id, type, created_at desc);
create index idx_vector_embeddings_org on public.vector_embeddings(organization_id);
create index idx_vector_embeddings_embedding on public.vector_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_graph_nodes_org_type on public.graph_nodes(organization_id, type);
create index idx_graph_edges_org_from on public.graph_edges(organization_id, from_node_id);
create index idx_graph_edges_org_to on public.graph_edges(organization_id, to_node_id);

create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, required public.member_role)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org
      and user_id = auth.uid()
      and role in ('super_admin', required)
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.permissions enable row level security;
alter table public.api_keys enable row level security;
alter table public.ai_models enable row level security;
alter table public.ai_requests enable row level security;
alter table public.ai_memory enable row level security;
alter table public.vector_embeddings enable row level security;
alter table public.events enable row level security;
alter table public.event_subscriptions enable row level security;
alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.webhook_logs enable row level security;
alter table public.integrations enable row level security;
alter table public.usage_metrics enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.graph_nodes enable row level security;
alter table public.graph_edges enable row level security;

create policy "profiles_self" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "organizations_member_read" on public.organizations for select using (public.is_org_member(id));
create policy "organization_members_member_read" on public.organization_members for select using (public.is_org_member(organization_id));

create policy "org_scoped_api_keys" on public.api_keys for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_ai_requests" on public.ai_requests for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_ai_memory" on public.ai_memory for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_vectors" on public.vector_embeddings for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_events" on public.events for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_subscriptions" on public.event_subscriptions for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_workflows" on public.workflows for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_workflow_runs" on public.workflow_runs for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_webhook_logs" on public.webhook_logs for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_integrations" on public.integrations for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_usage" on public.usage_metrics for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_notifications" on public.notifications for all using (public.is_org_member(organization_id) or user_id = auth.uid()) with check (public.is_org_member(organization_id) or user_id = auth.uid());
create policy "org_scoped_activity" on public.activity_logs for all using (organization_id is null or public.is_org_member(organization_id)) with check (organization_id is null or public.is_org_member(organization_id));
create policy "org_scoped_graph_nodes" on public.graph_nodes for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "org_scoped_graph_edges" on public.graph_edges for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));

insert into public.ai_models (provider, model, capability) values
  ('groq', 'llama3-70b-8192', 'chat'),
  ('groq', 'llama3-8b-8192', 'chat'),
  ('groq', 'mixtral-8x7b-32768', 'chat'),
  ('groq', 'gemma-7b-it', 'chat')
on conflict do nothing;
