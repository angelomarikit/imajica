-- Employee payslips released by HR → visible on staff My Salary page

create table if not exists public.employee_payslips (
  id uuid primary key default gen_random_uuid(),
  employee_user_id uuid references public.profiles (id) on delete set null,
  employee_email text not null,
  employee_name text not null,
  branch_id uuid references public.branches (id) on delete set null,
  branch_name text not null default '',
  period_from date not null,
  period_to date not null,
  period_label text not null default '',
  gross_earnings numeric(14, 2) not null default 0,
  total_incentives numeric(14, 2) not null default 0,
  total_deductions numeric(14, 2) not null default 0,
  net_pay numeric(14, 2) not null default 0,
  snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'sent' check (status in ('draft', 'sent', 'viewed')),
  sent_by_user_id uuid references public.profiles (id) on delete set null,
  sent_by_name text not null default '',
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists employee_payslips_employee_user_idx
  on public.employee_payslips (employee_user_id, sent_at desc);

create index if not exists employee_payslips_employee_email_idx
  on public.employee_payslips (lower(employee_email), sent_at desc);

comment on table public.employee_payslips is
  'HR-released payslips with full transparent computation snapshot for employee My Salary';

alter table public.employee_payslips enable row level security;

drop policy if exists employee_payslips_select on public.employee_payslips;
create policy employee_payslips_select
  on public.employee_payslips for select to authenticated
  using (
    public.is_people_ops()
    or employee_user_id = auth.uid()
    or lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists employee_payslips_insert on public.employee_payslips;
create policy employee_payslips_insert
  on public.employee_payslips for insert to authenticated
  with check (public.is_people_ops());

drop policy if exists employee_payslips_update on public.employee_payslips;
create policy employee_payslips_update
  on public.employee_payslips for update to authenticated
  using (
    public.is_people_ops()
    or employee_user_id = auth.uid()
  )
  with check (
    public.is_people_ops()
    or employee_user_id = auth.uid()
  );

grant select, insert, update on public.employee_payslips to authenticated;
