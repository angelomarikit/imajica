-- Product detail fields + richer stock movement history for Catalog → Products

alter table public.inventory_items
  add column if not exists supplier text,
  add column if not exists manufacturing_date date,
  add column if not exists expiration_date date,
  add column if not exists removal_date date;

comment on column public.inventory_items.supplier is
  'Optional supplier label for retail catalog products';

alter table public.inventory_movements
  add column if not exists previous_qty int,
  add column if not exists new_qty int,
  add column if not exists reference text,
  add column if not exists branch_id uuid references public.branches (id),
  add column if not exists item_id uuid references public.inventory_items (id);

comment on column public.inventory_movements.previous_qty is
  'Stock quantity before this movement';
comment on column public.inventory_movements.new_qty is
  'Stock quantity after this movement';
comment on column public.inventory_movements.reference is
  'External ref (booking id, transfer id, etc.)';

create index if not exists inventory_movements_item_idx
  on public.inventory_movements (item_id, created_at desc);

create index if not exists inventory_movements_branch_item_idx
  on public.inventory_movements (branch_id, item_id, created_at desc);
