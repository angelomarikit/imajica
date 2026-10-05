-- Recurring other deductions / allowances on payroll master (HR Deductions & Benefits).
-- Statutory SSS / Pag-IBIG / PhilHealth already exist; these cover extra recurring items.

alter table public.payroll_employee_profiles
  add column if not exists other_deduction numeric(12,2) not null default 0,
  add column if not exists allowance numeric(12,2) not null default 0,
  add column if not exists notes text;

comment on column public.payroll_employee_profiles.other_deduction is
  'Recurring monthly employee deduction (loans, cash advance amort., etc.) — salary basis';
comment on column public.payroll_employee_profiles.allowance is
  'Recurring monthly benefit / allowance added to pay — salary basis';

create unique index if not exists payroll_employee_profiles_user_id_uidx
  on public.payroll_employee_profiles (user_id)
  where user_id is not null;

-- People-ops (HQ + HR) already have select/write via is_people_ops() from 000052.
