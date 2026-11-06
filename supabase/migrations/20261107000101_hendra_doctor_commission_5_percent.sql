-- Hendra Sandigan (hendra.sandigan@imajica.com) earns 5% when her name is the doctor.
-- Outsourced doctors stay at 20%. Rewrite existing Hendra procedures to 5% / 95% clinic net,
-- and prorate analytics line items by the stored clinic net instead of a fixed 80%.

update public.sales s
set
  doctor_fee_amount = round(s.total_amount * 0.05, 2),
  clinic_net_amount = round(s.total_amount * 0.95, 2)
where coalesce(s.is_doctors_procedure, false)
  and s.total_amount is not null
  and (
    s.doctor_name ilike '%hendra.sandigan@imajica.com%'
    or regexp_replace(lower(coalesce(s.doctor_name, '')), '[^a-z ]', '', 'g') ~ '(^| )hendra($| )'
  );

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
    select
      s.*,
      case
        when coalesce(s.is_doctors_procedure, false)
          then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
        else s.total_amount
      end as recognized_amount
    from public.sales s
    where (p_from is null or s.created_at::date >= p_from)
      and (p_to is null or s.created_at::date <= p_to)
      and (p_branch_id is null or s.branch_id = p_branch_id)
  ),
  item_totals as (
    select
      si.item_type,
      sum(
        case
          when coalesce(fs.is_doctors_procedure, false) and fs.total_amount > 0
            then round(
              si.line_total * coalesce(fs.clinic_net_amount, round(fs.total_amount * 0.8, 2))
              / fs.total_amount,
              2
            )
          else si.line_total
        end
      ) as amount
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
    coalesce((select sum(recognized_amount) from filtered_sales), 0),
    coalesce((select sum(amount) from item_totals where lower(item_type) = 'product'), 0),
    coalesce((
      select sum(amount) from item_totals
      where lower(item_type) in ('service', 'package', 'treatment')
    ), 0),
    0::numeric as gross_commission,
    (select total_expenses from expenses),
    (select total_fees from fees),
    coalesce((select sum(recognized_amount) from filtered_sales), 0)
      - (select total_expenses from expenses)
      - (select total_fees from fees);
$$;

comment on function public.analytics_sales_summary(date, date, uuid) is
  'Sales KPIs; doctor procedure sales counted at stored clinic net (80% outsourced, 95% when the doctor is Hendra).';
