-- Close RLS gaps (tables that had RLS enabled with no policies) + remove demo transactional rows

-- ---------------------------------------------------------------------------
-- Policies for tables enabled in 000002 without policies
-- ---------------------------------------------------------------------------

-- Branches: authenticated staff can read; HQ / branch admins write
drop policy if exists branches_select_staff on public.branches;
create policy branches_select_staff on public.branches
  for select
  to authenticated
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN','HQ_ADMIN','SUPER_ADMIN'])
    or id in (select public.user_branch_ids())
  );

drop policy if exists branches_write_hq on public.branches;
create policy branches_write_hq on public.branches
  for all
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

-- Staff directory
drop policy if exists staff_select_staff on public.staff;
create policy staff_select_staff on public.staff
  for select
  to authenticated
  using (
    public.is_hq()
    or profile_id = auth.uid()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','HQ_ADMIN','SUPER_ADMIN','STAFF'])
  );

drop policy if exists staff_write_hq on public.staff;
create policy staff_write_hq on public.staff
  for all
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

-- User roles: users see own roles; HQ manages all
drop policy if exists user_roles_select_self_or_hq on public.user_roles;
create policy user_roles_select_self_or_hq on public.user_roles
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_hq());

drop policy if exists user_roles_write_hq on public.user_roles;
create policy user_roles_write_hq on public.user_roles
  for all
  using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']));

-- Inventory catalog items
drop policy if exists inventory_items_select_staff on public.inventory_items;
create policy inventory_items_select_staff on public.inventory_items
  for select
  to authenticated
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','STAFF','HQ_ADMIN','SUPER_ADMIN'])
  );

drop policy if exists inventory_items_write_staff on public.inventory_items;
create policy inventory_items_write_staff on public.inventory_items
  for all
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN'])
  );

-- Client documents / photos / packages
drop policy if exists client_documents_staff on public.client_documents;
create policy client_documents_staff on public.client_documents
  for all
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','HQ_ADMIN','SUPER_ADMIN'])
  );

drop policy if exists client_photos_staff on public.client_photos;
create policy client_photos_staff on public.client_photos
  for all
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','AESTHETICIAN','HQ_ADMIN','SUPER_ADMIN'])
  );

drop policy if exists client_packages_staff on public.client_packages;
create policy client_packages_staff on public.client_packages
  for all
  using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','STAFF','HQ_ADMIN','SUPER_ADMIN'])
  );

-- Payroll periods: HQ only
drop policy if exists payroll_periods_hq on public.payroll_periods;
create policy payroll_periods_hq on public.payroll_periods
  for all
  using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']));

-- Sentinel HQ branch — user_roles.branch_id is part of the PK (NOT NULL).
-- Assign SUPER_ADMIN / HQ_ADMIN roles to this branch_id when the user has no clinic branch.
insert into public.branches (
  id, name, code, address, status, is_main, branch_type
)
values (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Headquarters',
  'HQ',
  'Imajica HQ',
  'active',
  true,
  'company_owned'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Remove demo / placeholder transactional data (safe if already empty)
-- ---------------------------------------------------------------------------

delete from public.sms_campaign_recipients;

delete from public.marketing_campaigns;

delete from public.landing_promos;

delete from public.branch_order_items;

delete from public.branch_orders;

delete from public.operational_expenses;

delete from public.waste_logs;

-- Fixed seed branch UUIDs from former seed.sql only (do not delete HQ sentinel)
delete from public.branches
where id in (
  '11111111-1111-1111-1111-111111111101'::uuid,
  '11111111-1111-1111-1111-111111111102'::uuid,
  '11111111-1111-1111-1111-111111111103'::uuid,
  '11111111-1111-1111-1111-111111111104'::uuid
);
