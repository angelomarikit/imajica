-- Operations Manager (OM): org-wide clinic ops + HQ operations + employee My* features.
-- Not full HQ (no user-access / branch directory CRUD) and not HR people-ops owner.

insert into public.roles (id, description) values
  (
    'OPERATIONS_MANAGER',
    'Operations Manager — org-wide clinic ops + HQ warehouse/orders; employee timeclock & leave'
  )
on conflict (id) do update
  set description = excluded.description;

create or replace function public.is_operations_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['OPERATIONS_MANAGER']);
$$;

comment on function public.is_operations_manager() is
  'True when the signed-in user has OPERATIONS_MANAGER (OM).';

-- HQ or OM — warehouse, franchise orders, org ops admin surfaces
create or replace function public.can_access_operations_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_hq() or public.is_operations_manager();
$$;

comment on function public.can_access_operations_admin() is
  'HQ or Operations Manager — central warehouse / franchise ops admin.';

revoke all on function public.is_operations_manager() from public;
revoke all on function public.can_access_operations_admin() from public;
grant execute on function public.is_operations_manager() to authenticated, service_role;
grant execute on function public.can_access_operations_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Account assignment: OM is org-wide on HQ sentinel (like HR / Marketing)
-- ---------------------------------------------------------------------------
create or replace function public.upsert_branch_account_assignment(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_role_id text,
  p_branch_id uuid,
  p_status text default 'active'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_type text;
  v_branch_status text;
  v_is_service boolean;
  v_is_hq boolean;
  v_hq constant uuid := '00000000-0000-0000-0000-000000000001';
  v_branch uuid;
  v_is_org_role boolean;
begin
  v_is_service := (auth.role() = 'service_role');
  v_is_hq := public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']);

  if not (v_is_service or v_is_hq) then
    raise exception 'not authorized: HQ only';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'full_name and email are required';
  end if;

  if p_role_id not in (
    'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'BRANCH_MARKETING',
    'OPERATIONS_MANAGER',
    'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
    'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
  ) then
    raise exception 'invalid role: %', p_role_id;
  end if;

  if p_status not in ('active', 'inactive') then
    raise exception 'invalid status';
  end if;

  v_is_org_role := p_role_id in (
    'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'OPERATIONS_MANAGER', 'CLIENT'
  );
  v_branch := case when v_is_org_role then v_hq else p_branch_id end;

  if v_branch is null then
    raise exception 'branch is required for role %', p_role_id;
  end if;

  select branch_type, status into v_branch_type, v_branch_status
  from public.branches
  where id = v_branch;

  if v_branch_status is null then
    raise exception 'branch not found';
  end if;

  if v_branch_status <> 'active' then
    raise exception 'branch is not active';
  end if;

  if not v_is_org_role then
    if v_branch = v_hq then
      raise exception 'cannot tag clinic staff roles to HQ sentinel';
    end if;
    if v_branch_type = 'warehouse' then
      raise exception 'cannot tag branch accounts to warehouse';
    end if;
    if v_branch_type not in ('franchise', 'company_owned') then
      raise exception 'branch accounts must tag franchise or company-owned clinics';
    end if;
  end if;

  insert into public.profiles (id, full_name, email, status)
  values (p_user_id, trim(p_full_name), lower(trim(p_email)), p_status)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        status = excluded.status,
        updated_at = now();

  delete from public.user_roles
  where user_id = p_user_id
    and role_id in (
      'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'BRANCH_MARKETING',
      'OPERATIONS_MANAGER',
      'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
      'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
    );

  insert into public.user_roles (user_id, role_id, branch_id)
  values (p_user_id, p_role_id, v_branch)
  on conflict do nothing;
end;
$$;

comment on function public.upsert_branch_account_assignment is
  'HQ: clinic roles on clinic branch; SUPER/HQ/HR/MARKETING/OPERATIONS_MANAGER/CLIENT on HQ sentinel';

-- ---------------------------------------------------------------------------
-- Directory: include OM as org-wide All Branches account
-- ---------------------------------------------------------------------------
drop view if exists public.v_branch_accounts_directory;
create view public.v_branch_accounts_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.status,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  ur.role_id,
  ur.branch_id,
  case
    when ur.role_id in ('HR', 'MARKETING', 'OPERATIONS_MANAGER')
      then 'All Branches (organization)'
    else b.name
  end as branch_name,
  b.code as branch_code,
  b.branch_type,
  p.employee_code
from public.profiles p
inner join lateral (
  select ur2.role_id, ur2.branch_id
  from public.user_roles ur2
  where ur2.user_id = p.id
    and ur2.branch_id is not null
    and ur2.role_id not in ('CLIENT', 'SUPER_ADMIN', 'HQ_ADMIN')
    and (
      (
        ur2.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
        and ur2.role_id not in ('HR', 'MARKETING', 'OPERATIONS_MANAGER')
      )
      or ur2.role_id in ('HR', 'MARKETING', 'OPERATIONS_MANAGER')
    )
  order by
    case
      when ur2.role_id in ('HR', 'MARKETING', 'OPERATIONS_MANAGER') then 0
      when ur2.role_id = 'BRANCH_MARKETING' then 1
      when ur2.role_id = 'BRANCH_ADMIN' then 2
      else 3
    end,
    ur2.role_id
  limit 1
) ur on true
inner join public.branches b on b.id = ur.branch_id
where
  ur.role_id in ('HR', 'MARKETING', 'BRANCH_MARKETING', 'OPERATIONS_MANAGER')
  or coalesce(b.branch_type, 'company_owned') <> 'warehouse';

comment on view public.v_branch_accounts_directory is
  'Team → Branches Accounts — clinic staff + Branch Marketing + org HR / Marketing / OM';

grant select on public.v_branch_accounts_directory to authenticated;

-- ---------------------------------------------------------------------------
-- Branches list — OM can see all clinics
-- ---------------------------------------------------------------------------
drop policy if exists branches_select_staff on public.branches;
create policy branches_select_staff on public.branches
  for select
  to authenticated
  using (
    public.is_people_ops()
    or public.can_access_marketing()
    or public.is_operations_manager()
    or public.has_role(array[
      'BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN',
      'HQ_ADMIN','SUPER_ADMIN','HR','MARKETING','BRANCH_MARKETING','OPERATIONS_MANAGER'
    ])
    or id in (select public.user_branch_ids())
  );

-- ---------------------------------------------------------------------------
-- HQ-only ops tables → HQ or OM
-- ---------------------------------------------------------------------------
drop policy if exists warehouse_items_staff on public.warehouse_items;
create policy warehouse_items_staff on public.warehouse_items
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists warehouse_movements_staff on public.warehouse_stock_movements;
create policy warehouse_movements_staff on public.warehouse_stock_movements
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists franchise_orders_hq on public.franchise_orders;
create policy franchise_orders_hq on public.franchise_orders
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists franchise_order_items_hq on public.franchise_order_items;
create policy franchise_order_items_hq on public.franchise_order_items
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists operational_expenses_read on public.operational_expenses;
create policy operational_expenses_read on public.operational_expenses
  for select to authenticated
  using (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  );

drop policy if exists operational_expenses_write on public.operational_expenses;
create policy operational_expenses_write on public.operational_expenses
  for all to authenticated
  using (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  )
  with check (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  );

drop policy if exists ops_tables_hq on public.branch_orders;
create policy ops_tables_hq on public.branch_orders
  for all to authenticated
  using (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  )
  with check (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  );

drop policy if exists waste_logs_staff on public.waste_logs;
create policy waste_logs_staff on public.waste_logs
  for all to authenticated
  using (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','STAFF'])
  )
  with check (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','STAFF'])
  );

drop policy if exists stock_transfers_staff on public.stock_transfers;
create policy stock_transfers_staff on public.stock_transfers
  for all to authenticated
  using (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  )
  with check (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  );

drop policy if exists imajica_forms_staff on public.imajica_forms;
create policy imajica_forms_staff on public.imajica_forms
  for all to authenticated
  using (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','RECEPTIONIST'])
  )
  with check (
    public.can_access_operations_admin()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','RECEPTIONIST'])
  );

-- ---------------------------------------------------------------------------
-- Sales / payments — OM reads/writes across clinics (like HQ)
-- ---------------------------------------------------------------------------
drop policy if exists sales_staff on public.sales;
create policy sales_staff on public.sales
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or branch_id in (select public.user_branch_ids())
    or branch_id in (select public.user_clinic_branch_ids())
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or branch_id in (select public.user_branch_ids())
    or branch_id in (select public.user_clinic_branch_ids())
  );

drop policy if exists sale_items_staff on public.sale_items;
create policy sale_items_staff on public.sale_items
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or public.is_operations_manager()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or public.is_operations_manager()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  );

drop policy if exists payments_staff on public.payments;
create policy payments_staff on public.payments
  for all
  to authenticated
  using (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or public.is_operations_manager()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  )
  with check (
    public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or exists (
      select 1
      from public.sales s
      where s.id = sale_id
        and (
          public.is_hq()
          or public.is_people_ops()
          or public.is_operations_manager()
          or s.branch_id in (select public.user_branch_ids())
          or s.branch_id in (select public.user_clinic_branch_ids())
        )
    )
  );
