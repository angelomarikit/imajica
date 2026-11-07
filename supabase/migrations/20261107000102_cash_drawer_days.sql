-- Cash on Hand / daily drawer confirms — shared across devices (not localStorage).
-- scope = branch uuid text, or 'all' for HQ company combined (San Mateo+Pasig+Cainta+Lipa).

create table if not exists public.cash_drawer_days (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  branch_id uuid references public.branches (id) on delete set null,
  date_key date not null,
  confirmed_ending numeric(14, 2) not null default 0,
  manual_deducted numeric(14, 2) not null default 0,
  confirmed_by uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint cash_drawer_days_scope_date_unique unique (scope, date_key),
  constraint cash_drawer_days_manual_nonneg check (manual_deducted >= 0)
);

create index if not exists cash_drawer_days_date_idx
  on public.cash_drawer_days (date_key desc);

create index if not exists cash_drawer_days_branch_idx
  on public.cash_drawer_days (branch_id, date_key desc);

comment on table public.cash_drawer_days is
  'Cash on Hand daily confirms: per clinic or HQ scope all (company clinics combined).';

alter table public.cash_drawer_days enable row level security;

drop policy if exists cash_drawer_days_select on public.cash_drawer_days;
create policy cash_drawer_days_select
  on public.cash_drawer_days
  for select
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or scope = 'all'
    or (
      branch_id is not null
      and (
        branch_id in (select public.user_branch_ids())
        or branch_id in (select public.user_clinic_branch_ids())
      )
    )
  );

drop policy if exists cash_drawer_days_insert on public.cash_drawer_days;
create policy cash_drawer_days_insert
  on public.cash_drawer_days
  for insert
  to authenticated
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
    or (
      branch_id is not null
      and (
        branch_id in (select public.user_branch_ids())
        or branch_id in (select public.user_clinic_branch_ids())
      )
    )
  );

drop policy if exists cash_drawer_days_update on public.cash_drawer_days;
create policy cash_drawer_days_update
  on public.cash_drawer_days
  for update
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
    or (
      branch_id is not null
      and (
        branch_id in (select public.user_branch_ids())
        or branch_id in (select public.user_clinic_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
    or (
      branch_id is not null
      and (
        branch_id in (select public.user_branch_ids())
        or branch_id in (select public.user_clinic_branch_ids())
      )
    )
  );

grant select, insert, update on public.cash_drawer_days to authenticated;
