-- New Hires onboarding checklist (fed automatically when recruitment status = hired)

create table if not exists public.new_hires (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null unique references public.recruitment_applicants (id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  applied_role text not null,
  branch_id uuid references public.branches (id),
  hired_at date not null default current_date,
  status text not null default 'onboarding'
    check (status in ('onboarding', 'ready', 'cancelled')),
  -- map of requirement_id -> { done: bool, done_at: timestamptz|null, note: text|null }
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists new_hires_status_idx on public.new_hires (status, hired_at desc);
create index if not exists new_hires_branch_idx on public.new_hires (branch_id);

comment on table public.new_hires is
  'HR New Hires — auto-created from hired recruitment applicants; checklist for benefits/ops setup';

alter table public.new_hires enable row level security;

grant select, insert, update, delete on public.new_hires to authenticated;

drop policy if exists new_hires_read on public.new_hires;
create policy new_hires_read on public.new_hires
  for select to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

drop policy if exists new_hires_write on public.new_hires;
create policy new_hires_write on public.new_hires
  for all to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']))
  with check (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

-- Backfill any already-hired applicants
insert into public.new_hires (
  applicant_id, full_name, email, phone, applied_role, branch_id, hired_at, status, checklist
)
select
  a.id,
  a.full_name,
  a.email,
  a.phone,
  a.applied_role,
  a.branch_id,
  coalesce(a.applied_at, current_date),
  'onboarding',
  '{}'::jsonb
from public.recruitment_applicants a
where a.status = 'hired'
on conflict (applicant_id) do nothing;
