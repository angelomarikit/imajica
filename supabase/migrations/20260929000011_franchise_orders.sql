-- Franchise Orders: invoice-aligned schema (same pattern as Branch Orders / Sales)

alter table public.franchise_orders
  add column if not exists invoice_number text,
  add column if not exists order_date date default current_date,
  add column if not exists franchise_branch text,
  add column if not exists phone text,
  add column if not exists contact_person text,
  add column if not exists supplier text default 'Imajica Aesthetic',
  add column if not exists item_count int not null default 0,
  add column if not exists subtotal numeric(12,2) not null default 0,
  add column if not exists shipping numeric(12,2) not null default 0,
  add column if not exists other_charges numeric(12,2) not null default 0,
  add column if not exists total_amount numeric(12,2) not null default 0,
  add column if not exists deduct_on_daily_cash boolean not null default false,
  add column if not exists remarks text;

-- Expand status domain for franchise workflow
alter table public.franchise_orders drop constraint if exists franchise_orders_status_check;
alter table public.franchise_orders
  add constraint franchise_orders_status_check
  check (status in ('draft', 'pending', 'approved', 'dispatched', 'completed', 'cancelled', 'submitted'));

create unique index if not exists franchise_orders_invoice_number_uidx
  on public.franchise_orders (invoice_number)
  where invoice_number is not null;

create index if not exists franchise_orders_order_date_idx
  on public.franchise_orders (order_date desc);

create table if not exists public.franchise_order_items (
  id uuid primary key default gen_random_uuid(),
  franchise_order_id uuid not null references public.franchise_orders (id) on delete cascade,
  item_no int,
  category text,
  unit_type text,
  name text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists franchise_order_items_order_idx
  on public.franchise_order_items (franchise_order_id);

alter table public.franchise_order_items enable row level security;

drop policy if exists franchise_order_items_hq on public.franchise_order_items;
create policy franchise_order_items_hq on public.franchise_order_items
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
  );

comment on column public.franchise_orders.invoice_number is
  'Human-readable franchise order invoice id (FO-YYYYMMDD-####)';
