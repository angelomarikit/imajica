-- Clinic managers could not INSERT new staff rows (franchise RLS required staff_branches
-- before the row existed). Allow BRANCH_ADMIN insert; keep branch-scoped update/delete.

drop policy if exists staff_write_hq on public.staff;

create policy staff_insert_people_ops_clinic
  on public.staff
  for insert
  to authenticated
  with check (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  );

create policy staff_update_people_ops_clinic
  on public.staff
  for update
  to authenticated
  using (
    public.is_people_ops()
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
        -- Also allow update when row is not yet branch-linked (right after insert)
        or not exists (
          select 1 from public.staff_branches sb where sb.staff_id = staff.id
        )
      )
    )
  )
  with check (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or public.has_role(array['BRANCH_ADMIN'])
  );

create policy staff_delete_people_ops_clinic
  on public.staff
  for delete
  to authenticated
  using (
    public.is_people_ops()
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
