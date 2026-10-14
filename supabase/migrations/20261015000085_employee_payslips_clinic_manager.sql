-- Clinic managers may release / manage payslips they send (and see clinic branch slips).
-- Fixes: new row violates row-level security policy for table "employee_payslips"

drop policy if exists employee_payslips_select on public.employee_payslips;
create policy employee_payslips_select
  on public.employee_payslips
  for select
  to authenticated
  using (
    public.is_people_ops()
    or employee_user_id = auth.uid()
    or lower(employee_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        sent_by_user_id = auth.uid()
        or branch_id in (select public.user_branch_ids())
      )
    )
  );

drop policy if exists employee_payslips_insert on public.employee_payslips;
create policy employee_payslips_insert
  on public.employee_payslips
  for insert
  to authenticated
  with check (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and sent_by_user_id = auth.uid()
    )
  );

drop policy if exists employee_payslips_update on public.employee_payslips;
create policy employee_payslips_update
  on public.employee_payslips
  for update
  to authenticated
  using (
    public.is_people_ops()
    or employee_user_id = auth.uid()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and sent_by_user_id = auth.uid()
    )
  )
  with check (
    public.is_people_ops()
    or employee_user_id = auth.uid()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and sent_by_user_id = auth.uid()
    )
  );

drop policy if exists employee_payslips_delete on public.employee_payslips;
create policy employee_payslips_delete
  on public.employee_payslips
  for delete
  to authenticated
  using (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and sent_by_user_id = auth.uid()
    )
  );
