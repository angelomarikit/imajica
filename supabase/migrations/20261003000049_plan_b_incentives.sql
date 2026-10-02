-- Plan B incentives: manually entered by branch managers for staff (or themselves)

create table if not exists public.plan_b_incentives (
  id uuid primary key default gen_random_uuid(),
  staff_user_id text not null,
  staff_name text not null,
  branch_id uuid not null references public.branches (id),
  branch_name text not null default '',
  period_month text not null check (period_month ~ '^\d{4}-\d{2}$'),
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_by_user_id text not null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_b_incentives_staff_period_idx
  on public.plan_b_incentives (staff_user_id, period_month);

create index if not exists plan_b_incentives_branch_period_idx
  on public.plan_b_incentives (branch_id, period_month);

comment on table public.plan_b_incentives is
  'Manual Plan B incentive amounts entered by branch managers for staff or themselves';

alter table public.plan_b_incentives enable row level security;

drop policy if exists plan_b_incentives_select on public.plan_b_incentives;
create policy plan_b_incentives_select
  on public.plan_b_incentives for select to authenticated
  using (
    staff_user_id = auth.uid()::text
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

drop policy if exists plan_b_incentives_insert on public.plan_b_incentives;
create policy plan_b_incentives_insert
  on public.plan_b_incentives for insert to authenticated
  with check (
    public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

drop policy if exists plan_b_incentives_update on public.plan_b_incentives;
create policy plan_b_incentives_update
  on public.plan_b_incentives for update to authenticated
  using (
    public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  )
  with check (
    public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

drop policy if exists plan_b_incentives_delete on public.plan_b_incentives;
create policy plan_b_incentives_delete
  on public.plan_b_incentives for delete to authenticated
  using (
    public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

grant select, insert, update, delete on public.plan_b_incentives to authenticated;
