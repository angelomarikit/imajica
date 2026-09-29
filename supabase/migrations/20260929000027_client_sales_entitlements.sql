-- Client entitlements + installment plans (parity with sales import / profile Services tab)
-- App loads from public/data/sales-transactions.json until Supabase is connected.

comment on column public.clients.email is
  'Optional until registration; sales-import clients may use empty string placeholder';
comment on column public.clients.phone is
  'Optional until registration; sales-import clients may use empty string placeholder';

create table if not exists public.client_entitlements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  item_type text not null check (item_type in ('service', 'package', 'product')),
  item_name text not null,
  booking_ref text,
  branch_id uuid references public.branches (id),
  sessions_total int not null default 1,
  sessions_used int not null default 0,
  contract_amount numeric(12,2) not null default 0,
  sale_date date,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_entitlements_client_idx on public.client_entitlements (client_id);

create table if not exists public.client_installment_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  booking_ref text,
  item_name text not null,
  branch_id uuid references public.branches (id),
  total_amount numeric(12,2) not null default 0,
  paid_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,
  next_payment_date date,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_installment_plans_client_idx on public.client_installment_plans (client_id);

alter table public.client_entitlements enable row level security;
alter table public.client_installment_plans enable row level security;

drop policy if exists client_entitlements_staff on public.client_entitlements;
create policy client_entitlements_staff on public.client_entitlements
  for all to authenticated
  using (true)
  with check (true);

drop policy if exists client_installment_plans_staff on public.client_installment_plans;
create policy client_installment_plans_staff on public.client_installment_plans
  for all to authenticated
  using (true)
  with check (true);

-- Demo row shape (RONA-style installment); replace client_id when real clients exist in Supabase
-- insert into public.client_entitlements (...) values (...);
