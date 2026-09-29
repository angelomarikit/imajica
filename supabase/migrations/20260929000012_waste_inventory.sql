-- Waste Inventory: expired / wasted products tracking

alter table public.waste_logs
  add column if not exists product_name text,
  add column if not exists category text,
  add column if not exists base_price numeric(12,2) not null default 0,
  add column if not exists expiry_date date,
  add column if not exists days_expired int;

-- Backfill product_name from legacy item_label when present
update public.waste_logs
set product_name = coalesce(product_name, item_label)
where product_name is null and item_label is not null;

create index if not exists waste_logs_expiry_idx
  on public.waste_logs (expiry_date);

create index if not exists waste_logs_branch_idx
  on public.waste_logs (branch_id);

comment on table public.waste_logs is
  'Administration Operations Waste Inventory — expired / wasted product rows';
