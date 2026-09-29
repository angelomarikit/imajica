-- Central Warehouse stock (Operations → Warehouse)

create table if not exists public.warehouse_items (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('product', 'consumable')),
  name text not null,
  unit_type text,
  warehouse_stock int not null default 0,
  acquisition_price numeric(12,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists warehouse_items_type_idx
  on public.warehouse_items (item_type);

create index if not exists warehouse_items_name_idx
  on public.warehouse_items (name);

create table if not exists public.warehouse_stock_movements (
  id uuid primary key default gen_random_uuid(),
  warehouse_item_id uuid not null references public.warehouse_items (id) on delete cascade,
  delta int not null,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists warehouse_stock_movements_item_idx
  on public.warehouse_stock_movements (warehouse_item_id, created_at desc);

alter table public.warehouse_items enable row level security;
alter table public.warehouse_stock_movements enable row level security;

drop policy if exists warehouse_items_staff on public.warehouse_items;
create policy warehouse_items_staff on public.warehouse_items
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','STAFF'])
  );

drop policy if exists warehouse_movements_staff on public.warehouse_stock_movements;
create policy warehouse_movements_staff on public.warehouse_stock_movements
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN','STAFF'])
  );

comment on table public.warehouse_items is
  'Central Warehouse catalog — products and consumables with HQ stock levels';
