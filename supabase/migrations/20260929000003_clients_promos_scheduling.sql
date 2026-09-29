-- Feature sync: Client registration + Landing Special Promos + appointment status checks
-- Aligns DB with app work (New Customer form, Marketing promo slider, Client Scheduling)

-- ---------------------------------------------------------------------------
-- Clients: fields used by New Customer registration form
-- ---------------------------------------------------------------------------
alter table public.clients
  add column if not exists occupation text,
  add column if not exists avatar_url text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone text,
  add column if not exists medical_concerns text,
  add column if not exists current_medications text,
  add column if not exists admin_notes text,
  add column if not exists total_visits int not null default 0,
  add column if not exists total_spent numeric(12,2) not null default 0;

-- Keep skin profile medical fields in sync with registration "Allergies & Concerns"
alter table public.client_skin_profiles
  add column if not exists current_medications text,
  add column if not exists admin_notes text;

comment on column public.clients.occupation is 'Optional occupation from customer registration';
comment on column public.clients.emergency_contact_name is 'Emergency contact full name';
comment on column public.clients.emergency_contact_phone is 'Emergency contact phone';
comment on column public.clients.medical_concerns is 'Clinical medical concerns captured at registration';
comment on column public.clients.current_medications is 'Current medications at registration';
comment on column public.clients.admin_notes is 'Internal admin remarks from registration / CRM';

-- ---------------------------------------------------------------------------
-- Appointments: enforce statuses used by Client Scheduling (Show / No Show / Pending)
-- ---------------------------------------------------------------------------
alter table public.appointments
  drop constraint if exists appointments_status_check;

alter table public.appointments
  add constraint appointments_status_check
  check (
    status in (
      'pending',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
      'rescheduled'
    )
  );

create index if not exists appointments_status_start_idx
  on public.appointments (status, start_at);

-- ---------------------------------------------------------------------------
-- Landing page Special Offers (Marketing admin → public landing modal slider)
-- ---------------------------------------------------------------------------
create table if not exists public.landing_promos (
  id uuid primary key default gen_random_uuid(),
  badge text not null default 'Special Offer',
  headline text not null,
  description text not null,
  cta_label text not null default 'View Special Promo Today',
  modal_title text not null,
  modal_body text not null,
  highlights text[] not null default '{}',
  valid_until date,
  discount_label text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists landing_promos_active_sort_idx
  on public.landing_promos (is_active, sort_order);

comment on table public.landing_promos is
  'Landing Special Offer card + modal slider content, managed from Marketing admin';

-- ---------------------------------------------------------------------------
-- RLS for landing_promos
-- ---------------------------------------------------------------------------
alter table public.landing_promos enable row level security;

drop policy if exists landing_promos_public_read on public.landing_promos;
create policy landing_promos_public_read on public.landing_promos
  for select
  using (is_active = true or public.is_hq() or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN']));

drop policy if exists landing_promos_staff_write on public.landing_promos;
create policy landing_promos_staff_write on public.landing_promos
  for all
  using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

-- Public anon can read active promos on the marketing landing page
drop policy if exists landing_promos_anon_read on public.landing_promos;
create policy landing_promos_anon_read on public.landing_promos
  for select
  to anon
  using (is_active = true);

-- Ensure staff can insert client records (registration) — reinforce existing write policy scope
drop policy if exists clients_insert_staff on public.clients;
create policy clients_insert_staff on public.clients
  for insert
  with check (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','HQ_ADMIN','SUPER_ADMIN'])
  );

drop policy if exists client_skin_profiles_staff on public.client_skin_profiles;
create policy client_skin_profiles_staff on public.client_skin_profiles
  for all
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','HQ_ADMIN','SUPER_ADMIN'])
  );
