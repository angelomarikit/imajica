-- Analytics: sales report columns + reporting views
-- Aligns with Sales Payments, Operations Expenses, Catalog products/services/packages

-- Lead channel for New Client Sales Report
alter table public.clients
  add column if not exists lead_source text;

comment on column public.clients.lead_source is
  'Marketing acquisition channel (Walk-In, Facebook, Instagram, Referral, …)';

-- Sale header fields used by Analytics / invoice UX
alter table public.sales
  add column if not exists payment_type text default 'Full Payment',
  add column if not exists booking_ref text;

comment on column public.sales.payment_type is
  'Full Payment | Installment | Partial — shown on Sales Transactions & New Client Sales';
comment on column public.sales.booking_ref is
  'Short booking / transaction id displayed under service name (e.g. 8330)';

-- Snapshot COGS at sale time for product P&L
alter table public.sale_items
  add column if not exists unit_cost numeric(12,2) not null default 0,
  add column if not exists sku text;

comment on column public.sale_items.unit_cost is
  'Base cost snapshot at sale — used by Sales Product Report COGS';
comment on column public.sale_items.sku is
  'Optional SKU snapshot for product lines';

-- ---------------------------------------------------------------------------
-- Fee helper: Credit Card 3%, QRPH-style e-wallets ₱15 flat
-- ---------------------------------------------------------------------------
create or replace function public.imajica_transaction_fee(
  p_method text,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  select case
    when lower(coalesce(p_method, '')) in ('credit_card', 'card') then
      round(coalesce(p_amount, 0) * 0.03, 2)
    when lower(coalesce(p_method, '')) in ('gcash', 'paymaya', 'paymongo', 'qrph') then
      15.00
    else 0.00
  end;
$$;

comment on function public.imajica_transaction_fee(text, numeric) is
  'Transaction fee rule: CC 3%, GCash/PayMaya/PayMongo/QRPH ₱15 flat';

-- ---------------------------------------------------------------------------
-- View: flat transaction lines for Sales Reports table
-- ---------------------------------------------------------------------------
create or replace view public.v_analytics_sales_transactions as
select
  s.id as sale_id,
  s.invoice_number,
  coalesce(s.booking_ref, right(coalesce(s.invoice_number, s.id::text), 4)) as booking_ref,
  s.created_at,
  s.created_at::date as sale_date,
  s.total_amount,
  s.status as sale_status,
  coalesce(s.payment_type, 'Full Payment') as payment_type,
  c.id as client_id,
  c.full_name as customer_name,
  c.lead_source,
  b.id as branch_id,
  b.name as branch_name,
  st.id as staff_id,
  st.full_name as staff_name,
  si.id as sale_item_id,
  si.name as item_name,
  si.item_type,
  si.quantity,
  si.unit_price,
  si.unit_cost,
  si.sku,
  si.line_total,
  p.payment_method,
  p.payment_status,
  public.imajica_transaction_fee(p.payment_method, coalesce(p.payment_amount, s.total_amount)) as transaction_fee
from public.sales s
left join public.clients c on c.id = s.client_id
left join public.branches b on b.id = s.branch_id
left join public.staff st on st.id = s.staff_id
left join public.sale_items si on si.sale_id = s.id
left join lateral (
  select pay.*
  from public.payments pay
  where pay.sale_id = s.id
  order by pay.created_at desc
  limit 1
) p on true;

comment on view public.v_analytics_sales_transactions is
  'Analytics Sales Transactions — one row per sale_item (or sale if no items)';

-- ---------------------------------------------------------------------------
-- RPC: Sales summary KPIs + net sales (gross − branch expenses − fees)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_sales_summary(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (
  bookings bigint,
  gross_sales numeric,
  product_sales numeric,
  service_sales numeric,
  gross_commission numeric,
  branch_expenses numeric,
  transaction_fees numeric,
  net_sales numeric
)
language sql
stable
security invoker
as $$
  with filtered_sales as (
    select s.*
    from public.sales s
    where (p_from is null or s.created_at::date >= p_from)
      and (p_to is null or s.created_at::date <= p_to)
      and (p_branch_id is null or s.branch_id = p_branch_id)
  ),
  item_totals as (
    select
      si.item_type,
      sum(si.line_total) as amount
    from public.sale_items si
    join filtered_sales fs on fs.id = si.sale_id
    group by si.item_type
  ),
  fees as (
    select coalesce(sum(
      public.imajica_transaction_fee(p.payment_method, p.payment_amount)
    ), 0) as total_fees
    from public.payments p
    join filtered_sales fs on fs.id = p.sale_id
  ),
  expenses as (
    select coalesce(sum(e.amount), 0) as total_expenses
    from public.operational_expenses e
    where e.scope = 'branch'
      and e.status = 'active'
      and (p_from is null or e.expense_date >= p_from)
      and (p_to is null or e.expense_date <= p_to)
      and (p_branch_id is null or e.branch_id = p_branch_id)
  )
  select
    (select count(*) from filtered_sales)::bigint,
    coalesce((select sum(total_amount) from filtered_sales), 0),
    coalesce((select sum(amount) from item_totals where lower(item_type) = 'product'), 0),
    coalesce((
      select sum(amount) from item_totals
      where lower(item_type) in ('service', 'package', 'treatment')
    ), 0),
    0::numeric as gross_commission,
    (select total_expenses from expenses),
    (select total_fees from fees),
    coalesce((select sum(total_amount) from filtered_sales), 0)
      - (select total_expenses from expenses)
      - (select total_fees from fees);
$$;

-- ---------------------------------------------------------------------------
-- View / query: Sales Product Report (units, COGS, margin)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_product_sales_report(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (
  product_name text,
  sku text,
  units_sold bigint,
  base_cost numeric,
  retail_price numeric,
  total_revenue numeric,
  total_cost numeric,
  total_profit numeric,
  profit_margin numeric
)
language sql
stable
security invoker
as $$
  select
    si.name as product_name,
    coalesce(si.sku, inv.sku, 'N/A') as sku,
    sum(si.quantity)::bigint as units_sold,
    coalesce(
      nullif(avg(si.unit_cost), 0),
      avg(inv.unit_cost),
      0
    ) as base_cost,
    avg(si.unit_price) as retail_price,
    sum(si.line_total) as total_revenue,
    sum(si.quantity * coalesce(nullif(si.unit_cost, 0), inv.unit_cost, 0)) as total_cost,
    sum(si.line_total)
      - sum(si.quantity * coalesce(nullif(si.unit_cost, 0), inv.unit_cost, 0)) as total_profit,
    case
      when sum(si.line_total) > 0 then
        round(
          (
            (
              sum(si.line_total)
              - sum(si.quantity * coalesce(nullif(si.unit_cost, 0), inv.unit_cost, 0))
            ) / sum(si.line_total)
          ) * 100,
          2
        )
      else 0
    end as profit_margin
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  left join public.inventory_items inv
    on inv.id = si.item_id and lower(si.item_type) = 'product'
  where lower(si.item_type) = 'product'
    and (p_from is null or s.created_at::date >= p_from)
    and (p_to is null or s.created_at::date <= p_to)
    and (p_branch_id is null or s.branch_id = p_branch_id)
  group by si.name, coalesce(si.sku, inv.sku, 'N/A')
  order by units_sold desc;
$$;

-- ---------------------------------------------------------------------------
-- Best Selling Treatments (services + packages ranked by bookings)
-- ---------------------------------------------------------------------------
create or replace function public.analytics_best_selling_treatments(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (
  rank bigint,
  treatment_name text,
  item_type text,
  total_booked bigint,
  total_revenue numeric
)
language sql
stable
security invoker
as $$
  select
    row_number() over (order by count(*) desc, sum(si.line_total) desc) as rank,
    si.name as treatment_name,
    case
      when lower(si.item_type) = 'package' then 'Package'
      else 'Service'
    end as item_type,
    count(*)::bigint as total_booked,
    sum(si.line_total) as total_revenue
  from public.sale_items si
  join public.sales s on s.id = si.sale_id
  where lower(si.item_type) in ('service', 'package', 'treatment')
    and (p_from is null or s.created_at::date >= p_from)
    and (p_to is null or s.created_at::date <= p_to)
    and (p_branch_id is null or s.branch_id = p_branch_id)
  group by si.name, case when lower(si.item_type) = 'package' then 'Package' else 'Service' end
  order by total_booked desc, total_revenue desc;
$$;

-- ---------------------------------------------------------------------------
-- New Client Sales: first paid/pending sale per client in range
-- ---------------------------------------------------------------------------
create or replace function public.analytics_new_client_sales(
  p_from date default null,
  p_to date default null,
  p_lead_source text default null,
  p_branch_id uuid default null
)
returns table (
  first_booking_date date,
  customer_name text,
  booking_ref text,
  availed text,
  lead_source text,
  staff_name text,
  amount_paid numeric,
  payment_type text,
  status text,
  branch_name text
)
language sql
stable
security invoker
as $$
  with first_sales as (
    select distinct on (s.client_id)
      s.id,
      s.client_id,
      s.created_at,
      s.total_amount,
      s.status,
      coalesce(s.payment_type, 'Full Payment') as payment_type,
      coalesce(s.booking_ref, s.invoice_number) as booking_ref,
      s.branch_id,
      s.staff_id
    from public.sales s
    where s.client_id is not null
    order by s.client_id, s.created_at asc
  ),
  availed as (
    select
      si.sale_id,
      string_agg(si.name || ', (x' || si.quantity || ')', '; ' order by si.name) as items
    from public.sale_items si
    group by si.sale_id
  )
  select
    fs.created_at::date as first_booking_date,
    c.full_name as customer_name,
    fs.booking_ref,
    coalesce(a.items, '—') as availed,
    coalesce(c.lead_source, 'Walk-In') as lead_source,
    coalesce(st.full_name, '—') as staff_name,
    fs.total_amount as amount_paid,
    fs.payment_type,
    case
      when lower(fs.status) = 'paid' then 'Paid'
      when lower(fs.status) = 'pending' then 'Pending'
      else initcap(fs.status)
    end as status,
    b.name as branch_name
  from first_sales fs
  join public.clients c on c.id = fs.client_id
  left join public.branches b on b.id = fs.branch_id
  left join public.staff st on st.id = fs.staff_id
  left join availed a on a.sale_id = fs.id
  where (p_from is null or fs.created_at::date >= p_from)
    and (p_to is null or fs.created_at::date <= p_to)
    and (p_branch_id is null or fs.branch_id = p_branch_id)
    and (
      p_lead_source is null
      or p_lead_source = ''
      or lower(p_lead_source) = 'all'
      or lower(coalesce(c.lead_source, 'Walk-In')) = lower(p_lead_source)
    )
  order by fs.created_at desc;
$$;

grant execute on function public.imajica_transaction_fee(text, numeric) to authenticated;
grant execute on function public.analytics_sales_summary(date, date, uuid) to authenticated;
grant execute on function public.analytics_product_sales_report(date, date, uuid) to authenticated;
grant execute on function public.analytics_best_selling_treatments(date, date, uuid) to authenticated;
grant execute on function public.analytics_new_client_sales(date, date, text, uuid) to authenticated;

grant select on public.v_analytics_sales_transactions to authenticated;
