-- Operations Manager (+ dual-role OM/HR) may maintain employee benefits / payroll profiles.
-- Previously only is_people_ops() / BRANCH_ADMIN could write — OM alone was blocked on staff.benefits.

drop policy if exists staff_insert_people_ops_clinic on public.staff;
create policy staff_insert_people_ops_clinic
  on public.staff
  for insert
  to authenticated
  with check (
    public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  );

drop policy if exists staff_update_people_ops_clinic on public.staff;
create policy staff_update_people_ops_clinic
  on public.staff
  for update
  to authenticated
  using (
    public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or exists (
          select 1 from public.staff_branches sb
          where sb.staff_id = staff.id
            and sb.branch_id in (select public.user_franchise_branch_ids())
        )
        or not exists (
          select 1 from public.staff_branches sb where sb.staff_id = staff.id
        )
      )
    )
  )
  with check (
    public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  );

drop policy if exists staff_delete_people_ops_clinic on public.staff;
create policy staff_delete_people_ops_clinic
  on public.staff
  for delete
  to authenticated
  using (
    public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or exists (
          select 1 from public.staff_branches sb
          where sb.staff_id = staff.id
            and sb.branch_id in (select public.user_franchise_branch_ids())
        )
      )
    )
  );

drop policy if exists payroll_employee_profiles_hq_select on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_select
  on public.payroll_employee_profiles
  for select
  to authenticated
  using (
    public.is_people_ops()
    or public.is_operations_manager()
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
    or public.is_operations_manager()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  )
  with check (
    public.is_people_ops()
    or public.is_operations_manager()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  );
