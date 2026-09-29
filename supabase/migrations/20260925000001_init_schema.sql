-- Imajica Medical Aesthetics — core schema
-- Apply with Supabase CLI: supabase db push

create extension if not exists "pgcrypto";

-- Roles enum-like table
create table if not exists public.roles (
  id text primary key,
  description text
);

insert into public.roles (id, description) values
  ('SUPER_ADMIN', 'Full organization access'),
  ('HQ_ADMIN', 'HQ administrator'),
  ('BRANCH_ADMIN', 'Branch administrator'),
  ('DOCTOR', 'Doctor / aesthetic physician'),
  ('NURSE', 'Nurse'),
  ('AESTHETICIAN', 'Aesthetician'),
  ('RECEPTIONIST', 'Front desk'),
  ('STAFF', 'General staff'),
  ('CLIENT', 'Client portal user')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  avatar_url text,
  preferred_branch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_id text not null references public.roles (id),
  branch_id uuid,
  primary key (user_id, role_id, branch_id)
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  address text not null,
  phone text,
  email text,
  manager_staff_id uuid,
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_main boolean not null default false,
  image_url text,
  treatment_rooms int not null default 0,
  consultation_rooms int not null default 0,
  waiting_areas int not null default 0,
  parking_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_preferred_branch_fk
  foreign key (preferred_branch_id) references public.branches (id);

alter table public.user_roles
  add constraint user_roles_branch_fk
  foreign key (branch_id) references public.branches (id);

create table if not exists public.branch_hours (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  is_open boolean not null default true,
  open_time time,
  close_time time,
  unique (branch_id, day_of_week)
);

create table if not exists public.branch_rooms (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null,
  room_type text not null check (room_type in ('treatment', 'consultation', 'waiting')),
  status text not null default 'active'
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  code text not null unique,
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  preferred_branch_id uuid references public.branches (id),
  status text not null default 'active',
  is_vip boolean not null default false,
  membership_label text,
  registered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_skin_profiles (
  client_id uuid primary key references public.clients (id) on delete cascade,
  skin_type text,
  concerns text[] default '{}',
  allergies text,
  medical_conditions text,
  contraindications text,
  updated_at timestamptz not null default now()
);

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  author_id uuid references public.profiles (id),
  body text not null,
  is_sensitive boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.client_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.client_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  storage_path text not null,
  kind text not null default 'general',
  created_at timestamptz not null default now()
);

create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id),
  code text not null unique,
  full_name text not null,
  email text,
  phone text,
  role_id text not null references public.roles (id),
  title text,
  status text not null default 'active',
  hire_date date,
  employment_type text,
  base_salary numeric(12,2) not null default 0,
  rating numeric(3,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.staff_branches (
  staff_id uuid not null references public.staff (id) on delete cascade,
  branch_id uuid not null references public.branches (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (staff_id, branch_id)
);

create table if not exists public.staff_schedules (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  day_of_week int not null,
  start_time time not null,
  end_time time not null
);

create table if not exists public.treatment_categories (
  id text primary key,
  name text not null
);

create table if not exists public.treatments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id text references public.treatment_categories (id),
  description text,
  duration_minutes int not null,
  price numeric(12,2) not null,
  status text not null default 'active',
  image_url text,
  benefits text[] default '{}',
  procedure_info text,
  commission_rate numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.branch_treatments (
  branch_id uuid not null references public.branches (id) on delete cascade,
  treatment_id uuid not null references public.treatments (id) on delete cascade,
  primary key (branch_id, treatment_id)
);

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('package', 'membership', 'promo')),
  description text,
  regular_price numeric(12,2) not null,
  promo_price numeric(12,2),
  sessions int not null,
  validity_months int not null,
  status text not null default 'active',
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.package_items (
  package_id uuid not null references public.packages (id) on delete cascade,
  treatment_id uuid not null references public.treatments (id),
  quantity int not null default 1,
  primary key (package_id, treatment_id)
);

create table if not exists public.client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  package_id uuid not null references public.packages (id),
  sessions_total int not null,
  sessions_used int not null default 0,
  valid_until date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.package_usage (
  id uuid primary key default gen_random_uuid(),
  client_package_id uuid not null references public.client_packages (id),
  appointment_id uuid,
  used_at timestamptz not null default now(),
  unique (client_package_id, appointment_id)
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),
  branch_id uuid not null references public.branches (id),
  treatment_id uuid references public.treatments (id),
  package_id uuid references public.packages (id),
  staff_id uuid references public.staff (id),
  room_id uuid references public.branch_rooms (id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  duration_minutes int not null,
  status text not null default 'pending',
  notes text,
  price numeric(12,2) not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  status text not null,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now(),
  note text
);

create index if not exists appointments_branch_start_idx on public.appointments (branch_id, start_at);
create index if not exists appointments_staff_start_idx on public.appointments (staff_id, start_at);
create index if not exists appointments_client_idx on public.appointments (client_id);

-- Prevent overlapping staff bookings (exclusion requires btree_gist)
create extension if not exists btree_gist;
alter table public.appointments
  drop constraint if exists appointments_no_staff_overlap;
alter table public.appointments
  add constraint appointments_no_staff_overlap
  exclude using gist (
    staff_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (staff_id is not null and status not in ('cancelled', 'no_show', 'rescheduled'));

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  sku text not null unique,
  category text not null,
  unit_cost numeric(12,2) not null default 0,
  selling_price numeric(12,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.branch_inventory (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  item_id uuid not null references public.inventory_items (id),
  current_stock int not null default 0,
  reorder_level int not null default 0,
  expiration_date date,
  batch_number text,
  unique (branch_id, item_id)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  branch_inventory_id uuid not null references public.branch_inventory (id),
  movement_type text not null,
  quantity int not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  note text
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id),
  branch_id uuid not null references public.branches (id),
  staff_id uuid references public.staff (id),
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  tax numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  item_type text not null,
  item_id uuid,
  name text not null,
  quantity int not null default 1,
  unit_price numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  line_total numeric(12,2) not null
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id),
  provider text not null,
  payment_reference text,
  payment_method text not null,
  payment_status text not null default 'pending',
  payment_amount numeric(12,2) not null,
  payment_date timestamptz,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  staff_id uuid references public.staff (id),
  role_id text references public.roles (id),
  treatment_id uuid references public.treatments (id),
  package_id uuid references public.packages (id),
  branch_id uuid references public.branches (id),
  rate numeric(5,4) not null,
  active boolean not null default true
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id),
  source_sale_id uuid not null references public.sales (id),
  gross_amount numeric(12,2) not null,
  rate numeric(5,4) not null,
  amount numeric(12,2) not null,
  status text not null default 'pending',
  payroll_period_id uuid,
  created_at timestamptz not null default now(),
  unique (staff_id, source_sale_id)
);

create table if not exists public.incentives (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.staff (id),
  amount numeric(12,2) not null,
  label text not null,
  period_label text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_periods (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references public.payroll_periods (id),
  staff_id uuid not null references public.staff (id),
  base_salary numeric(12,2) not null,
  commission numeric(12,2) not null default 0,
  incentives numeric(12,2) not null default 0,
  deductions numeric(12,2) not null default 0,
  gross_pay numeric(12,2) not null,
  net_pay numeric(12,2) not null,
  status text not null default 'draft',
  unique (period_id, staff_id)
);

create table if not exists public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references public.payroll_items (id),
  amount numeric(12,2) not null,
  reason text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null,
  branch_id uuid references public.branches (id),
  audience text,
  content text,
  start_date date,
  end_date date,
  status text not null default 'draft',
  reach int default 0,
  conversions int default 0,
  revenue numeric(12,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_templates (
  id text primary key,
  channel text not null,
  subject text,
  body text not null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  channel text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value)
values ('default_commission_rate', '0.05'::jsonb)
on conflict (key) do nothing;

-- Helper functions for RLS
create or replace function public.has_role(target_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role_id = any(target_roles)
  );
$$;

create or replace function public.is_hq()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']);
$$;

create or replace function public.user_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select branch_id from public.user_roles
  where user_id = auth.uid() and branch_id is not null
  union
  select sb.branch_id from public.staff s
  join public.staff_branches sb on sb.staff_id = s.id
  where s.profile_id = auth.uid();
$$;
