-- Durable catalog price overrides (services / products / packages)
-- Seed catalog ids are client keys like svc-seed-0001 / prod-seed-0001.
-- Edits must survive reloads even when seed defaults are re-applied in the app.

create table if not exists public.catalog_price_overrides (
  item_kind text not null check (item_kind in ('service', 'product', 'package')),
  item_key text not null,
  price numeric(12, 2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id),
  primary key (item_kind, item_key)
);

create index if not exists catalog_price_overrides_updated_idx
  on public.catalog_price_overrides (updated_at desc);

alter table public.catalog_price_overrides enable row level security;

drop policy if exists catalog_price_overrides_select on public.catalog_price_overrides;
create policy catalog_price_overrides_select on public.catalog_price_overrides
  for select to authenticated using (true);

drop policy if exists catalog_price_overrides_write on public.catalog_price_overrides;
create policy catalog_price_overrides_write on public.catalog_price_overrides
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'RECEPTIONIST', 'STAFF'])
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'RECEPTIONIST', 'STAFF'])
  );

comment on table public.catalog_price_overrides is
  'Persisted price edits for catalog services, products, and packages keyed by client catalog ids.';
