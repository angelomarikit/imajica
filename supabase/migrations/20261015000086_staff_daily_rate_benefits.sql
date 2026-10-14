-- Persist Employee Database daily rate + itemized benefits on staff (not localStorage-only).
-- Ensures Salary / payslip picks up clinic-manager edits after refresh / other devices.

alter table public.staff
  add column if not exists daily_rate numeric(14, 2) not null default 0;

alter table public.staff
  add column if not exists benefits jsonb not null default '[]'::jsonb;

comment on column public.staff.daily_rate is
  'Daily wage from Employee Database — feeds salary/payslip basic pay and late deduction.';

comment on column public.staff.benefits is
  'Itemized monthly benefits [{id,name,monthlyCost,notes}] — deduct once/month on 2nd semi-monthly pay.';
