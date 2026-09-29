-- Branch Orders: invoice-aligned schema (same invoice pattern as Sales)
-- Sales: add invoice_number for consistent invoice UX across Sales + Operations

alter table public.sales
  add column if not exists invoice_number text;

create unique index if not exists sales_invoice_number_uidx
  on public.sales (invoice_number)
  where invoice_number is not null;

-- Expand branch_orders beyond the stub columns
alter table public.branch_orders
  add column if not exists invoice_number text,
  add column if not exists order_date date,
  add column if not exists contact_person text,
  add column if not exists total_amount numeric(12,2) not null default 0,
  add column if not exists item_count int not null default 0;

update public.branch_orders
set order_date = coalesce(order_date, created_at::date)
where order_date is null;

alter table public.branch_orders
  alter column order_date set default current_date;

create unique index if not exists branch_orders_invoice_number_uidx
  on public.branch_orders (invoice_number)
  where invoice_number is not null;

create index if not exists branch_orders_order_date_idx
  on public.branch_orders (order_date desc);

create table if not exists public.branch_order_items (
  id uuid primary key default gen_random_uuid(),
  branch_order_id uuid not null references public.branch_orders (id) on delete cascade,
  name text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists branch_order_items_order_idx
  on public.branch_order_items (branch_order_id);

alter table public.branch_order_items enable row level security;

drop policy if exists branch_order_items_staff on public.branch_order_items;
create policy branch_order_items_staff on public.branch_order_items
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','SUPER_ADMIN','HQ_ADMIN'])
  );

comment on column public.sales.invoice_number is
  'Human-readable sales invoice id (INV-YYYYMMDD-####), same UX as Branch Orders BO- invoices';

comment on column public.branch_orders.invoice_number is
  'Human-readable branch order invoice id (BO-YYYYMMDD-####)';
