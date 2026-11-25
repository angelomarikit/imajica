-- Clinic stock, what a POS line consumes, and warehouse → clinic transfers.
-- Warehouse rows stay on warehouse_items. HQ and Operations Manager move stock.
-- Clinic staff read only their branch. Quantity changes go through these functions.

alter table public.sale_items
  add column if not exists catalog_ref text;

comment on column public.sale_items.catalog_ref is
  'Catalog id of the service, product, or package sold. Used to deduct stock.';

create table if not exists public.branch_stock (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  warehouse_item_id uuid not null references public.warehouse_items (id) on delete cascade,
  quantity int not null default 0,
  reorder_level int not null default 5,
  updated_at timestamptz not null default now(),
  unique (branch_id, warehouse_item_id)
);

create index if not exists branch_stock_branch_idx on public.branch_stock (branch_id);

create table if not exists public.stock_recipes (
  id uuid primary key default gen_random_uuid(),
  warehouse_item_id uuid not null references public.warehouse_items (id) on delete cascade,
  catalog_kind text not null check (catalog_kind in ('product', 'service', 'package')),
  catalog_id text not null,
  catalog_label text not null,
  quantity_per_sale int not null default 1 check (quantity_per_sale > 0),
  created_at timestamptz not null default now(),
  unique (warehouse_item_id, catalog_kind, catalog_id)
);

create index if not exists stock_recipes_catalog_idx
  on public.stock_recipes (catalog_kind, catalog_id);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  warehouse_item_id uuid not null references public.warehouse_items (id) on delete cascade,
  branch_id uuid references public.branches (id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('transfer', 'sale', 'sale_reversal', 'adjust')),
  sale_id uuid references public.sales (id) on delete set null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  reversed_at timestamptz
);

create unique index if not exists stock_movements_open_sale_uidx
  on public.stock_movements (sale_id, warehouse_item_id, branch_id)
  where sale_id is not null and reason = 'sale' and reversed_at is null;

create index if not exists stock_movements_sale_idx on public.stock_movements (sale_id);

alter table public.branch_stock enable row level security;
alter table public.stock_recipes enable row level security;
alter table public.stock_movements enable row level security;

drop policy if exists warehouse_items_staff on public.warehouse_items;
drop policy if exists warehouse_items_ops on public.warehouse_items;
create policy warehouse_items_ops on public.warehouse_items
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists branch_stock_read on public.branch_stock;
create policy branch_stock_read on public.branch_stock
  for select to authenticated
  using (
    public.can_access_operations_admin()
    or branch_id in (select public.user_branch_ids())
    or branch_id in (select public.user_clinic_branch_ids())
  );

drop policy if exists branch_stock_write on public.branch_stock;
create policy branch_stock_write on public.branch_stock
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists stock_recipes_read on public.stock_recipes;
create policy stock_recipes_read on public.stock_recipes
  for select to authenticated
  using (auth.uid() is not null);

drop policy if exists stock_recipes_write on public.stock_recipes;
create policy stock_recipes_write on public.stock_recipes
  for all to authenticated
  using (public.can_access_operations_admin())
  with check (public.can_access_operations_admin());

drop policy if exists stock_movements_read on public.stock_movements;
create policy stock_movements_read on public.stock_movements
  for select to authenticated
  using (
    public.can_access_operations_admin()
    or branch_id in (select public.user_branch_ids())
    or branch_id in (select public.user_clinic_branch_ids())
  );

-- ---------------------------------------------------------------------------
-- Read model
-- ---------------------------------------------------------------------------

create or replace function public.list_inventory(p_branch_id uuid default null)
returns table (
  warehouse_item_id uuid,
  item_name text,
  unit_type text,
  item_type text,
  warehouse_stock int,
  branch_id uuid,
  branch_name text,
  branch_quantity int,
  reorder_level int
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ops boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  v_ops := public.can_access_operations_admin();

  if not v_ops then
    if p_branch_id is not null
       and p_branch_id not in (select public.user_branch_ids())
       and p_branch_id not in (select public.user_clinic_branch_ids()) then
      raise exception 'branch not assigned';
    end if;
  end if;

  if v_ops then
    return query
    select
      w.id,
      w.name,
      w.unit_type,
      w.item_type,
      w.warehouse_stock,
      null::uuid,
      null::text,
      null::int,
      5
    from public.warehouse_items w
    where w.status = 'active'
    order by w.name;
  end if;

  return query
  select
    w.id,
    w.name,
    w.unit_type,
    w.item_type,
    case when v_ops then w.warehouse_stock else null end,
    b.id,
    b.name,
    bs.quantity,
    bs.reorder_level
  from public.branch_stock bs
  join public.warehouse_items w on w.id = bs.warehouse_item_id
  join public.branches b on b.id = bs.branch_id
  where b.branch_type in ('company_owned', 'franchise')
    and b.id <> '00000000-0000-0000-0000-000000000001'
    and (
      p_branch_id is null and (
        v_ops
        or bs.branch_id in (select public.user_branch_ids())
        or bs.branch_id in (select public.user_clinic_branch_ids())
      )
      or bs.branch_id = p_branch_id
    )
  order by b.name, w.name;
end;
$$;

revoke all on function public.list_inventory(uuid) from public;
grant execute on function public.list_inventory(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Warehouse item + recipe maintenance (HQ / OM)
-- ---------------------------------------------------------------------------

create or replace function public.save_warehouse_item(
  p_name text,
  p_item_type text,
  p_unit_type text,
  p_quantity int,
  p_acquisition_price numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_access_operations_admin() then
    raise exception 'not authorized';
  end if;
  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'item name is required';
  end if;
  if p_item_type not in ('product', 'consumable') then
    raise exception 'invalid item type';
  end if;

  insert into public.warehouse_items (
    item_type, name, unit_type, warehouse_stock, acquisition_price
  ) values (
    p_item_type,
    trim(p_name),
    nullif(trim(coalesce(p_unit_type, '')), ''),
    greatest(coalesce(p_quantity, 0), 0),
    greatest(coalesce(p_acquisition_price, 0), 0)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.save_warehouse_item(text, text, text, int, numeric) from public;
grant execute on function public.save_warehouse_item(text, text, text, int, numeric) to authenticated, service_role;

create or replace function public.save_stock_recipe(
  p_warehouse_item_id uuid,
  p_catalog_kind text,
  p_catalog_id text,
  p_catalog_label text,
  p_quantity int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.can_access_operations_admin() then
    raise exception 'not authorized';
  end if;
  if p_catalog_kind not in ('product', 'service', 'package') then
    raise exception 'invalid catalog kind';
  end if;
  if coalesce(p_quantity, 0) < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  insert into public.stock_recipes (
    warehouse_item_id, catalog_kind, catalog_id, catalog_label, quantity_per_sale
  ) values (
    p_warehouse_item_id, p_catalog_kind, p_catalog_id, coalesce(nullif(trim(p_catalog_label), ''), 'Item'), p_quantity
  )
  on conflict (warehouse_item_id, catalog_kind, catalog_id)
  do update set
    catalog_label = excluded.catalog_label,
    quantity_per_sale = excluded.quantity_per_sale
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.save_stock_recipe(uuid, text, text, text, int) from public;
grant execute on function public.save_stock_recipe(uuid, text, text, text, int) to authenticated, service_role;

create or replace function public.delete_stock_recipe(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_access_operations_admin() then
    raise exception 'not authorized';
  end if;
  delete from public.stock_recipes where id = p_id;
end;
$$;

revoke all on function public.delete_stock_recipe(uuid) from public;
grant execute on function public.delete_stock_recipe(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Transfer warehouse → clinic
-- ---------------------------------------------------------------------------

create or replace function public.transfer_warehouse_stock(
  p_warehouse_item_id uuid,
  p_branch_id uuid,
  p_quantity int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock int;
  v_name text;
  v_branch text;
  v_left int;
  v_arrived int;
begin
  if not public.can_access_operations_admin() then
    raise exception 'not authorized';
  end if;
  if coalesce(p_quantity, 0) < 1 then
    raise exception 'quantity must be at least 1';
  end if;

  if not exists (
    select 1 from public.branches b
    where b.id = p_branch_id
      and b.branch_type in ('company_owned', 'franchise')
      and b.id <> '00000000-0000-0000-0000-000000000001'
  ) then
    raise exception 'pick a clinic or franchise';
  end if;

  select w.warehouse_stock, w.name
  into v_stock, v_name
  from public.warehouse_items w
  where w.id = p_warehouse_item_id
  for update;

  if v_name is null then
    raise exception 'item not found';
  end if;
  if coalesce(v_stock, 0) < p_quantity then
    raise exception 'not enough stock in the warehouse';
  end if;

  update public.warehouse_items
  set warehouse_stock = warehouse_stock - p_quantity,
      updated_at = now()
  where id = p_warehouse_item_id
  returning warehouse_stock into v_left;

  insert into public.branch_stock (branch_id, warehouse_item_id, quantity)
  values (p_branch_id, p_warehouse_item_id, p_quantity)
  on conflict (branch_id, warehouse_item_id)
  do update set
    quantity = public.branch_stock.quantity + excluded.quantity,
    updated_at = now()
  returning quantity into v_arrived;

  select name into v_branch from public.branches where id = p_branch_id;

  insert into public.stock_movements (
    warehouse_item_id, branch_id, delta, reason, note, created_by
  ) values (
    p_warehouse_item_id,
    p_branch_id,
    p_quantity,
    'transfer',
    format('Transferred %s from warehouse to %s', p_quantity, v_branch),
    auth.uid()
  );

  return jsonb_build_object(
    'item_name', v_name,
    'branch_name', v_branch,
    'quantity', p_quantity,
    'warehouse_left', v_left,
    'branch_on_hand', v_arrived
  );
end;
$$;

revoke all on function public.transfer_warehouse_stock(uuid, uuid, int) from public;
grant execute on function public.transfer_warehouse_stock(uuid, uuid, int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- POS deduction and reversal
-- ---------------------------------------------------------------------------

create or replace function public.apply_sale_stock(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch uuid;
  v_line record;
  v_ref text;
  v_kind text;
  v_needed int;
  v_item uuid;
  v_usage jsonb := '{}'::jsonb;
  rec record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select s.branch_id into v_branch from public.sales s where s.id = p_sale_id;
  if v_branch is null then
    raise exception 'sale not found';
  end if;

  if not (
    public.can_access_operations_admin()
    or v_branch in (select public.user_branch_ids())
    or v_branch in (select public.user_clinic_branch_ids())
  ) then
    raise exception 'not authorized';
  end if;

  if exists (
    select 1 from public.stock_movements m
    where m.sale_id = p_sale_id and m.reason = 'sale' and m.reversed_at is null
  ) then
    return;
  end if;

  -- A later installment payment is money only. The original checkout already deducted stock.
  if exists (
    select 1 from public.sales s
    where s.id = p_sale_id and s.payment_type = 'Installment Payment'
  ) then
    return;
  end if;

  for v_line in
    select si.item_type, si.name, si.quantity, si.catalog_ref, si.item_id, si.sku
    from public.sale_items si
    where si.sale_id = p_sale_id
  loop
    v_kind := case
      when lower(coalesce(v_line.item_type, '')) in ('product', 'package') then lower(v_line.item_type)
      else 'service'
    end;
    v_ref := coalesce(nullif(v_line.catalog_ref, ''), v_line.item_id::text, '');

    if v_ref = '' then
      if v_kind = 'product' then
        select ii.id::text into v_ref
        from public.inventory_items ii
        where lower(trim(ii.name)) = lower(trim(v_line.name))
           or (v_line.sku is not null and ii.sku = v_line.sku)
        limit 1;
      elsif v_kind = 'package' then
        select p.id::text into v_ref
        from public.packages p
        where lower(trim(p.name)) = lower(trim(v_line.name))
        limit 1;
      else
        select t.id::text into v_ref
        from public.treatments t
        where lower(trim(t.name)) = lower(trim(v_line.name))
        limit 1;
      end if;
    end if;

    v_needed := greatest(coalesce(v_line.quantity, 1), 1);

    if v_ref is not null and v_ref <> '' and exists (
      select 1 from public.stock_recipes r
      where r.catalog_kind = v_kind and r.catalog_id = v_ref
    ) then
      for rec in
        select r.warehouse_item_id, r.quantity_per_sale * v_needed as qty
        from public.stock_recipes r
        where r.catalog_kind = v_kind and r.catalog_id = v_ref
      loop
        v_usage := jsonb_set(
          v_usage,
          array[rec.warehouse_item_id::text],
          to_jsonb(coalesce((v_usage ->> rec.warehouse_item_id::text)::int, 0) + rec.qty)
        );
      end loop;
    elsif v_kind = 'package' and v_ref is not null and v_ref <> '' then
      for rec in
        select r.warehouse_item_id, r.quantity_per_sale * pi.quantity * v_needed as qty
        from public.package_items pi
        join public.stock_recipes r
          on r.catalog_kind = 'service'
         and r.catalog_id = pi.treatment_id::text
        where pi.package_id::text = v_ref
      loop
        v_usage := jsonb_set(
          v_usage,
          array[rec.warehouse_item_id::text],
          to_jsonb(coalesce((v_usage ->> rec.warehouse_item_id::text)::int, 0) + rec.qty)
        );
      end loop;
    elsif v_kind = 'product' then
      select w.id into v_item
      from public.warehouse_items w
      where lower(trim(w.name)) = lower(trim(v_line.name))
      limit 1;
      if v_item is not null then
        v_usage := jsonb_set(
          v_usage,
          array[v_item::text],
          to_jsonb(coalesce((v_usage ->> v_item::text)::int, 0) + v_needed)
        );
      end if;
    end if;
  end loop;

  for rec in
    select key::uuid as warehouse_item_id, value::int as qty
    from jsonb_each_text(v_usage)
    where value::int > 0
  loop
    insert into public.branch_stock (branch_id, warehouse_item_id, quantity)
    values (v_branch, rec.warehouse_item_id, 0)
    on conflict (branch_id, warehouse_item_id) do nothing;

    update public.branch_stock
    set quantity = quantity - rec.qty,
        updated_at = now()
    where branch_id = v_branch
      and warehouse_item_id = rec.warehouse_item_id;

    insert into public.stock_movements (
      warehouse_item_id, branch_id, delta, reason, sale_id, created_by
    ) values (
      rec.warehouse_item_id, v_branch, -rec.qty, 'sale', p_sale_id, auth.uid()
    );
  end loop;
end;
$$;

revoke all on function public.apply_sale_stock(uuid) from public;
grant execute on function public.apply_sale_stock(uuid) to authenticated, service_role;

create or replace function public.reverse_sale_stock(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch uuid;
  rec record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select s.branch_id into v_branch from public.sales s where s.id = p_sale_id;

  if v_branch is not null and not (
    public.can_access_operations_admin()
    or v_branch in (select public.user_branch_ids())
    or v_branch in (select public.user_clinic_branch_ids())
  ) then
    raise exception 'not authorized';
  end if;

  for rec in
    select m.id, m.warehouse_item_id, m.branch_id, m.delta
    from public.stock_movements m
    where m.sale_id = p_sale_id
      and m.reason = 'sale'
      and m.reversed_at is null
  loop
    update public.branch_stock
    set quantity = quantity - rec.delta,
        updated_at = now()
    where branch_id = rec.branch_id
      and warehouse_item_id = rec.warehouse_item_id;

    update public.stock_movements
    set reversed_at = now()
    where id = rec.id;
  end loop;
end;
$$;

revoke all on function public.reverse_sale_stock(uuid) from public;
grant execute on function public.reverse_sale_stock(uuid) to authenticated, service_role;
