-- HR manual SL / VL days on salary (1 leave day = 1 regular full daily rate).
-- Approved leave filings still drive auto counts; this table stores period overrides.

create table if not exists public.payroll_leave_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  match_key text not null,
  employee_name text,
  period_from date not null,
  period_to date not null,
  sick_days numeric(6,2) not null default 0 check (sick_days >= 0),
  vacation_days numeric(6,2) not null default 0 check (vacation_days >= 0),
  notes text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint payroll_leave_adjustments_period_chk check (period_to >= period_from)
);

comment on table public.payroll_leave_adjustments is
  'HR period overrides for paid sick / vacation leave days on Branch Salary (1 day = full daily rate).';

create unique index if not exists payroll_leave_adjustments_match_period_uidx
  on public.payroll_leave_adjustments (match_key, period_from, period_to);

create index if not exists payroll_leave_adjustments_user_period_idx
  on public.payroll_leave_adjustments (user_id, period_from, period_to);

create index if not exists payroll_leave_adjustments_period_idx
  on public.payroll_leave_adjustments (period_from, period_to);

alter table public.payroll_leave_adjustments enable row level security;

grant select, insert, update, delete on public.payroll_leave_adjustments to authenticated;

drop policy if exists payroll_leave_adjustments_select on public.payroll_leave_adjustments;
create policy payroll_leave_adjustments_select on public.payroll_leave_adjustments
  for select to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (user_id is not null and user_id = auth.uid())
  );

drop policy if exists payroll_leave_adjustments_write on public.payroll_leave_adjustments;
create policy payroll_leave_adjustments_write on public.payroll_leave_adjustments
  for all to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
  )
  with check (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
  );
