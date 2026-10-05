-- Employee leave management: balances + requests (sick / vacation / emergency)
-- Approvers: people-ops (HQ + HR) now; clinic managers (BRANCH_ADMIN) for their branch; HQ already covered.

create table if not exists public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  year int not null,
  sick_days numeric(6,2) not null default 10,
  vacation_days numeric(6,2) not null default 15,
  emergency_days numeric(6,2) not null default 5,
  sick_used numeric(6,2) not null default 0,
  vacation_used numeric(6,2) not null default 0,
  emergency_used numeric(6,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, year)
);

comment on table public.leave_balances is
  'Annual leave credits per employee (sick / vacation / emergency).';

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  employee_name text not null,
  employee_email text,
  branch_id uuid references public.branches (id),
  branch_name text,
  leave_type text not null check (leave_type in ('sick', 'vacation', 'emergency')),
  start_date date not null,
  end_date date not null,
  days numeric(6,2) not null check (days > 0),
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  -- employee_applied | hr_designated | manager_designated
  source text not null default 'employee_applied',
  reviewed_by uuid references public.profiles (id),
  reviewed_by_name text,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_dates_chk check (end_date >= start_date)
);

create index if not exists leave_requests_user_id_idx on public.leave_requests (user_id, created_at desc);
create index if not exists leave_requests_status_idx on public.leave_requests (status, start_date);
create index if not exists leave_requests_branch_id_idx on public.leave_requests (branch_id);

comment on table public.leave_requests is
  'Leave applications and HR/manager-designated leaves (sick, vacation, emergency).';

-- True when caller may approve / designate leave org-wide or for a branch
create or replace function public.can_approve_leave(p_branch_id uuid default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        p_branch_id is null
        or p_branch_id in (select public.user_branch_ids())
      )
    );
$$;

comment on function public.can_approve_leave(uuid) is
  'HQ / HR / clinic managers may approve leave (managers scoped to their branch).';

revoke all on function public.can_approve_leave(uuid) from public;
grant execute on function public.can_approve_leave(uuid) to authenticated, service_role;

alter table public.leave_balances enable row level security;
alter table public.leave_requests enable row level security;

grant select, insert, update, delete on public.leave_balances to authenticated;
grant select, insert, update, delete on public.leave_requests to authenticated;

-- Balances: own row, or approvers
drop policy if exists leave_balances_select on public.leave_balances;
create policy leave_balances_select on public.leave_balances
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_approve_leave(null)
  );

drop policy if exists leave_balances_write on public.leave_balances;
create policy leave_balances_write on public.leave_balances
  for all to authenticated
  using (public.can_approve_leave(null))
  with check (public.can_approve_leave(null));

-- Requests: employee sees own; approvers see all / branch
drop policy if exists leave_requests_select on public.leave_requests;
create policy leave_requests_select on public.leave_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        branch_id is null
        or branch_id in (select public.user_branch_ids())
      )
    )
  );

drop policy if exists leave_requests_insert_own on public.leave_requests;
create policy leave_requests_insert_own on public.leave_requests
  for insert to authenticated
  with check (
    user_id = auth.uid()
    or public.can_approve_leave(branch_id)
  );

drop policy if exists leave_requests_update on public.leave_requests;
create policy leave_requests_update on public.leave_requests
  for update to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.can_approve_leave(branch_id)
  )
  with check (
    (user_id = auth.uid() and status in ('pending', 'cancelled'))
    or public.can_approve_leave(branch_id)
  );

drop policy if exists leave_requests_delete on public.leave_requests;
create policy leave_requests_delete on public.leave_requests
  for delete to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']));
