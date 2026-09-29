-- Administration → Operations → Expenses
-- Aligns with Operational Expenses UI (All / Branch / Ops tabs)

create table if not exists public.operational_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  department text,
  amount numeric(12,2) not null default 0,
  expense_type text not null default 'manual'
    check (expense_type in ('manual', 'automatic')),
  deduct_cash boolean not null default false,
  status text not null default 'active' check (status in ('active', 'inactive')),
  scope text not null check (scope in ('branch', 'ops')),
  expense_date date not null,
  branch_id uuid references public.branches (id),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operational_expenses_scope_date_idx
  on public.operational_expenses (scope, expense_date desc);

create index if not exists operational_expenses_branch_idx
  on public.operational_expenses (branch_id);

create index if not exists operational_expenses_category_idx
  on public.operational_expenses (category);

alter table public.operational_expenses enable row level security;

drop policy if exists operational_expenses_read on public.operational_expenses;
create policy operational_expenses_read on public.operational_expenses
  for select using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN','RECEPTIONIST','STAFF'])
  );

drop policy if exists operational_expenses_write on public.operational_expenses;
create policy operational_expenses_write on public.operational_expenses
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

comment on table public.operational_expenses is
  'Administration Operations Expenses — All / Branch / Ops expense logs';

-- Placeholder tables for remaining Operations pages (structure ready, UI blank for now)
create table if not exists public.branch_orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id),
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.franchise_orders (
  id uuid primary key default gen_random_uuid(),
  franchise_label text,
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.waste_logs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id),
  item_label text not null,
  quantity numeric(12,2) not null default 0,
  reason text,
  logged_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  from_branch_id uuid references public.branches (id),
  to_branch_id uuid references public.branches (id),
  status text not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.imajica_forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  form_type text,
  storage_path text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.branch_orders enable row level security;
alter table public.franchise_orders enable row level security;
alter table public.waste_logs enable row level security;
alter table public.stock_transfers enable row level security;
alter table public.imajica_forms enable row level security;

drop policy if exists ops_tables_hq on public.branch_orders;
create policy ops_tables_hq on public.branch_orders for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN']));

drop policy if exists franchise_orders_hq on public.franchise_orders;
create policy franchise_orders_hq on public.franchise_orders for all using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']));

drop policy if exists waste_logs_staff on public.waste_logs;
create policy waste_logs_staff on public.waste_logs for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','STAFF']));

drop policy if exists stock_transfers_staff on public.stock_transfers;
create policy stock_transfers_staff on public.stock_transfers for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN']));

drop policy if exists imajica_forms_staff on public.imajica_forms;
create policy imajica_forms_staff on public.imajica_forms for all using (public.is_hq() or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','RECEPTIONIST']));
