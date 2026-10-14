-- Clinic managers could INSERT staff but INSERT…RETURNING failed SELECT RLS
-- because new rows had no staff_branches yet. Also allow SELECT via the
-- employee's user_roles.branch_id (Employee Database source of truth).

drop policy if exists staff_select_staff on public.staff;
create policy staff_select_staff
  on public.staff
  for select
  to authenticated
  using (
    public.is_people_ops()
    or profile_id = auth.uid()
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'HQ_ADMIN', 'SUPER_ADMIN', 'STAFF', 'HR'
      ])
      and (
        not public.is_franchise_branch_owner()
        or exists (
          select 1 from public.staff_branches sb
          where sb.staff_id = staff.id
            and sb.branch_id in (select public.user_franchise_branch_ids())
        )
        or exists (
          select 1 from public.user_roles ur
          where ur.user_id = staff.profile_id
            and ur.branch_id in (select public.user_franchise_branch_ids())
        )
      )
    )
  );
