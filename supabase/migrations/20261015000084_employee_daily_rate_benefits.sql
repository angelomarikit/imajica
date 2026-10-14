-- Itemized monthly benefits on payroll profiles (Employee Database → Salary / payslip).
-- Daily rate already lives on salary_per_day; benefits deduct once per month (semi-monthly pay).

alter table public.payroll_employee_profiles
  add column if not exists benefits jsonb not null default '[]'::jsonb;

comment on column public.payroll_employee_profiles.benefits is
  'Itemized benefits [{id,name,monthlyCost,notes}] — full monthly cost deducted once per month (not split across semi-monthly payslips).';

-- Clinic managers may read/write payroll profiles for their own clinic; HR/people-ops keep org-wide.
drop policy if exists payroll_employee_profiles_hq_select on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_select
  on public.payroll_employee_profiles
  for select
  to authenticated
  using (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  );

drop policy if exists payroll_employee_profiles_hq_write on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_write
  on public.payroll_employee_profiles
  for all
  to authenticated
  using (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  )
  with check (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  );
