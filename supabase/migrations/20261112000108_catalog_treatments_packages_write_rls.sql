-- Allow HQ, Operations Manager, and Clinic Manager to create/update catalog
-- services (treatments) and packages. Franchise owners previously could only
-- toggle branch_treatments; Service Management save needs treatments write.

drop policy if exists treatments_write on public.treatments;
create policy treatments_write on public.treatments
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  )
  with check (
    public.is_hq()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  );

drop policy if exists packages_write on public.packages;
create policy packages_write on public.packages
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  )
  with check (
    public.is_hq()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  );

drop policy if exists package_items_staff on public.package_items;
create policy package_items_staff on public.package_items
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  )
  with check (
    public.is_hq()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN'])
  );
