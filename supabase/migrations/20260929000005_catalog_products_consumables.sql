-- Catalog Products: retail inventory, categories, consumables

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extend inventory_items for catalog product list fields if missing
alter table public.inventory_items
  add column if not exists category_id uuid references public.product_categories (id),
  add column if not exists is_retail_product boolean not null default true;

comment on column public.inventory_items.is_retail_product is
  'true = Catalog Products inventory; false can mark non-retail stock rows';

create table if not exists public.consumables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stock int not null default 0,
  reorder_level int not null default 10,
  price numeric(12,2) not null default 0,
  branch_id uuid references public.branches (id),
  branch_label text not null default 'Global',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consumables_branch_idx on public.consumables (branch_id);
create index if not exists product_categories_name_idx on public.product_categories (name);

alter table public.product_categories enable row level security;
alter table public.consumables enable row level security;

drop policy if exists product_categories_read on public.product_categories;
create policy product_categories_read on public.product_categories
  for select to authenticated using (true);

drop policy if exists product_categories_write on public.product_categories;
create policy product_categories_write on public.product_categories
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN','RECEPTIONIST','STAFF'])
  );

drop policy if exists consumables_staff on public.consumables;
create policy consumables_staff on public.consumables
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','HQ_ADMIN','SUPER_ADMIN','RECEPTIONIST','STAFF','NURSE'])
  );

-- Seed a few categories (idempotent by name)
insert into public.product_categories (name, subtitle)
select v.name, v.subtitle
from (values
  ('SKIN CARE SET', 'Home Care'),
  ('SUNSCREEN', 'Sun Protection'),
  ('CREAMS', 'N/A'),
  ('IV TIP', 'Vitamin Infusion'),
  ('MESOLIPO', 'Fat Burning / Melting')
) as v(name, subtitle)
where not exists (
  select 1 from public.product_categories pc where pc.name = v.name
);
