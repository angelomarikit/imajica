-- Product retail prices: inventory_items.selling_price is the only source of truth.
-- Clear legacy product price overrides and allow clinic ops to read/write retail catalog.

delete from public.catalog_price_overrides
where item_kind = 'product';

-- Staff / OM / clinic roles must read selling_price for booking.
drop policy if exists inventory_items_select_staff on public.inventory_items;
create policy inventory_items_select_staff on public.inventory_items
  for select
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array[
      'SUPER_ADMIN',
      'HQ_ADMIN',
      'BRANCH_ADMIN',
      'RECEPTIONIST',
      'STAFF',
      'DOCTOR',
      'NURSE',
      'AESTHETICIAN',
      'CSR_MARKETING'
    ])
  );

-- HQ + clinic managers + OM may maintain retail product prices in inventory_items.
drop policy if exists inventory_items_write_staff on public.inventory_items;
create policy inventory_items_write_staff on public.inventory_items
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

comment on policy inventory_items_select_staff on public.inventory_items is
  'Authenticated clinic/HQ staff can read retail catalog prices for booking.';

comment on policy inventory_items_write_staff on public.inventory_items is
  'HQ, Operations Manager, and Clinic Manager can upsert retail product prices.';
