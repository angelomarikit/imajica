-- Create Branch Order form fields (phone, supplier, shipping, cash deduct, line meta)

alter table public.branch_orders
  add column if not exists phone text,
  add column if not exists supplier text default 'Imajica Aesthetic',
  add column if not exists subtotal numeric(12,2) not null default 0,
  add column if not exists shipping numeric(12,2) not null default 0,
  add column if not exists other_charges numeric(12,2) not null default 0,
  add column if not exists deduct_on_daily_cash boolean not null default false,
  add column if not exists remarks text;

alter table public.branch_order_items
  add column if not exists item_no int,
  add column if not exists category text,
  add column if not exists unit_type text;

comment on column public.branch_orders.deduct_on_daily_cash is
  'When true, order total deducts from branch daily cash for the order date';
