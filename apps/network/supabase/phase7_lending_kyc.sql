-- ============================================================
-- KENUXA Phase 7: Lending & KYC Tables
-- Run after phase6_migration.sql
-- ============================================================

-- ── Loan Applications ─────────────────────────────────────────
create table if not exists loan_applications (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid references businesses(id) on delete cascade,
  user_id         uuid references auth.users(id) on delete cascade,
  type            text not null check (type in ('working_capital','inventory_finance','invoice_finance','bnpl','equipment','revenue_advance')),
  amount          numeric(14,2) not null check (amount > 0),
  term_months     int not null check (term_months > 0),
  interest_rate   numeric(5,2),
  status          text not null default 'pending'
                  check (status in ('pending','approved','rejected','disbursed','repaying','defaulted','closed')),
  reviewed_by     uuid references auth.users(id),
  reviewed_at     timestamptz,
  disbursed_at    timestamptz,
  notes           text,
  metadata        jsonb default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists loan_applications_business_id_idx on loan_applications(business_id);
create index if not exists loan_applications_user_id_idx     on loan_applications(user_id);
create index if not exists loan_applications_status_idx      on loan_applications(status);

alter table loan_applications enable row level security;

-- Applicants can see their own applications
create policy "loan_applications_select_own"
  on loan_applications for select
  using (user_id = auth.uid());

-- Financial partners can see all applications (requires separate partner check in app logic)
create policy "loan_applications_select_partner"
  on loan_applications for select
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('financial_partner','super_admin','country_admin')
    )
  );

-- Applicants can insert their own
create policy "loan_applications_insert_own"
  on loan_applications for insert
  with check (user_id = auth.uid());

-- Partners/admins can update status
create policy "loan_applications_update_partner"
  on loan_applications for update
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('financial_partner','super_admin','country_admin')
    )
  );

-- ── Loan Repayments ───────────────────────────────────────────
create table if not exists loan_repayments (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid references loan_applications(id) on delete cascade,
  amount          numeric(14,2) not null,
  due_date        date not null,
  paid_date       date,
  status          text not null default 'pending'
                  check (status in ('pending','paid','overdue','waived')),
  payment_ref     text,
  created_at      timestamptz default now()
);

alter table loan_repayments enable row level security;

create policy "loan_repayments_own"
  on loan_repayments for select
  using (
    exists (
      select 1 from loan_applications la
      where la.id = application_id and la.user_id = auth.uid()
    )
  );

-- ── KYC Documents ─────────────────────────────────────────────
create table if not exists kyc_documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  doc_type      text not null check (doc_type in ('national_id','selfie','proof_address','business_reg','tin','utility_bill')),
  file_url      text not null,
  status        text not null default 'pending'
                check (status in ('pending','verified','rejected')),
  notes         text,
  reviewed_by   uuid references auth.users(id),
  submitted_at  timestamptz default now(),
  reviewed_at   timestamptz,
  unique (user_id, doc_type)
);

alter table kyc_documents enable row level security;

create policy "kyc_documents_own"
  on kyc_documents for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "kyc_documents_admin"
  on kyc_documents for all
  using (
    exists (
      select 1 from user_profiles
      where id = auth.uid() and role in ('super_admin','country_admin')
    )
  );

-- ── Add identity_status to user_profiles ─────────────────────
alter table user_profiles
  add column if not exists identity_status text default 'unverified'
  check (identity_status in ('unverified','pending','verified','rejected'));

-- ── Trigger: update loan_applications.updated_at ─────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists loan_applications_updated_at on loan_applications;
create trigger loan_applications_updated_at
  before update on loan_applications
  for each row execute function set_updated_at();

-- ── Storage Buckets ───────────────────────────────────────────
-- Run these via Supabase dashboard or CLI if not already created:
-- insert into storage.buckets (id, name, public) values ('kyc-documents', 'kyc-documents', false) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('business-assets', 'business-assets', true) on conflict do nothing;
