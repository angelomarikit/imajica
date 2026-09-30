-- Franchise branch owner isolation (BRANCH_ADMIN + franchise branch_id)
-- Tighten write/select so branch admins only touch their assigned branch rows.
-- HQ (is_hq / SUPER_ADMIN / HQ_ADMIN) retains org-wide access.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_franchise_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.branch_id
  from public.user_roles ur
  join public.branches b on b.id = ur.branch_id
  where ur.user_id = auth.uid()
    and ur.role_id = 'BRANCH_ADMIN'
    and ur.branch_id is not null
    and b.branch_type = 'franchise';
$$;

create or replace function public.is_franchise_branch_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_franchise_branch_ids());
$$;

-- Optional branch_id on franchise_orders for precise RLS (text label remains for UI)
alter table public.franchise_orders
  add column if not exists branch_id uuid references public.branches (id);

create index if not exists franchise_orders_branch_id_idx
  on public.franchise_orders (branch_id);

-- ---------------------------------------------------------------------------
-- Clients — branch-scoped writes for BRANCH_ADMIN
-- ---------------------------------------------------------------------------

drop policy if exists clients_write_staff on public.clients;
create policy clients_write_staff on public.clients
  for all using (
    public.is_hq()
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF'])
      and (
        preferred_branch_id is null
        or preferred_branch_id in (select public.user_branch_ids())
        or not public.is_franchise_branch_owner()
      )
    )
  )
  with check (
    public.is_hq()
    or not public.is_franchise_branch_owner()
    or preferred_branch_id in (select public.user_franchise_branch_ids())
  );

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select using (
    profile_id = auth.uid()
    or public.is_hq()
    or preferred_branch_id in (select public.user_branch_ids())
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF'])
      and not public.is_franchise_branch_owner()
    )
  );

-- ---------------------------------------------------------------------------
-- Appointments — force branch_id ∈ user branches for franchise owners
-- ---------------------------------------------------------------------------

drop policy if exists appointments_write on public.appointments;
create policy appointments_write on public.appointments
  for all using (
    public.is_hq()
    or client_id in (select id from public.clients where profile_id = auth.uid())
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or client_id in (select id from public.clients where profile_id = auth.uid())
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Catalog — franchise owners cannot mutate global treatments/packages
-- (availability toggles use branch_treatments)
-- ---------------------------------------------------------------------------

drop policy if exists treatments_write on public.treatments;
create policy treatments_write on public.treatments
  for all using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']));

drop policy if exists packages_write on public.packages;
create policy packages_write on public.packages
  for all using (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']));

alter table public.branch_treatments enable row level security;

drop policy if exists branch_treatments_select on public.branch_treatments;
create policy branch_treatments_select on public.branch_treatments
  for select to authenticated using (true);

drop policy if exists branch_treatments_write on public.branch_treatments;
create policy branch_treatments_write on public.branch_treatments
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or branch_id in (select public.user_branch_ids())
  );

-- ---------------------------------------------------------------------------
-- Staff — franchise owners only their branch
-- ---------------------------------------------------------------------------

drop policy if exists staff_select_staff on public.staff;
create policy staff_select_staff on public.staff
  for select to authenticated
  using (
    public.is_hq()
    or profile_id = auth.uid()
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','HQ_ADMIN','SUPER_ADMIN','STAFF'])
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

drop policy if exists staff_write_hq on public.staff;
create policy staff_write_hq on public.staff
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
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

-- ---------------------------------------------------------------------------
-- Sales / payments / branch inventory (already branch-scoped; reaffirm)
-- ---------------------------------------------------------------------------

drop policy if exists sales_staff on public.sales;
create policy sales_staff on public.sales
  for all using (
    public.is_hq()
    or branch_id in (select public.user_branch_ids())
  );

drop policy if exists inventory_staff on public.branch_inventory;
create policy inventory_staff on public.branch_inventory
  for all using (
    public.is_hq()
    or branch_id in (select public.user_branch_ids())
  );

-- ---------------------------------------------------------------------------
-- Operational expenses
-- ---------------------------------------------------------------------------

drop policy if exists operational_expenses_read on public.operational_expenses;
create policy operational_expenses_read on public.operational_expenses
  for select using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','STAFF'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  );

drop policy if exists operational_expenses_write on public.operational_expenses;
create policy operational_expenses_write on public.operational_expenses
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (select public.user_franchise_branch_ids())
    )
  );

-- ---------------------------------------------------------------------------
-- Waste logs
-- ---------------------------------------------------------------------------

drop policy if exists waste_logs_staff on public.waste_logs;
create policy waste_logs_staff on public.waste_logs
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN','STAFF'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN','STAFF'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Branch orders
-- ---------------------------------------------------------------------------

drop policy if exists ops_tables_hq on public.branch_orders;
create policy branch_orders_access on public.branch_orders
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Franchise orders — owners can CRUD their own franchise branch only
-- ---------------------------------------------------------------------------

drop policy if exists franchise_orders_hq on public.franchise_orders;
create policy franchise_orders_access on public.franchise_orders
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
        or franchise_branch in (
          select b.name from public.branches b
          where b.id in (select public.user_franchise_branch_ids())
        )
      )
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
        or franchise_branch in (
          select b.name from public.branches b
          where b.id in (select public.user_franchise_branch_ids())
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Promo coupons — franchise write scoped to their branch
-- ---------------------------------------------------------------------------

drop policy if exists promo_coupons_write on public.promo_coupons;
create policy promo_coupons_write on public.promo_coupons
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST'])
      and (
        not public.is_franchise_branch_owner()
        or branch_id in (select public.user_franchise_branch_ids())
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Central warehouse — HQ only (franchise owners use branch_inventory / products UI)
-- ---------------------------------------------------------------------------

drop policy if exists warehouse_items_staff on public.warehouse_items;
create policy warehouse_items_hq on public.warehouse_items
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
  );

drop policy if exists warehouse_movements_staff on public.warehouse_stock_movements;
create policy warehouse_movements_hq on public.warehouse_stock_movements
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
  );

-- ---------------------------------------------------------------------------
-- Inventory catalog definitions — HQ write; staff read
-- ---------------------------------------------------------------------------

drop policy if exists inventory_items_write_staff on public.inventory_items;
create policy inventory_items_write_staff on public.inventory_items
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
  );

comment on function public.is_franchise_branch_owner() is
  'True when the auth user has BRANCH_ADMIN on a franchise branch';
