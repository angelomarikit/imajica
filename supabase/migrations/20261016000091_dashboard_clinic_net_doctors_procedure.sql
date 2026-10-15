-- Dashboard / analytics: recognize clinic net (80%) for doctor's procedure sales.
-- Customer still paid total_amount; clinic cards + cashflow use clinic_net_amount.

create or replace function public.branch_dashboard_sales_summary(
  p_branch_id uuid,
  p_from date,
  p_to date,
  p_today date default (timezone('Asia/Manila', now()))::date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_month_start date;
  v_range_sales numeric := 0;
  v_today_sales numeric := 0;
  v_month_sales numeric := 0;
  v_range_count int := 0;
  v_today_count int := 0;
  v_patients int := 0;
  v_bookings int := 0;
  v_latest date;
begin
  if p_branch_id is null or p_from is null or p_to is null then
    return jsonb_build_object('ok', false, 'error', 'branch_id, from, and to are required');
  end if;

  v_ok := public.is_hq()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or p_branch_id in (select public.user_branch_ids())
    or p_branch_id in (select public.user_clinic_branch_ids());

  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'not allowed for this branch');
  end if;

  v_month_start := date_trunc('month', p_to)::date;

  select
    coalesce(sum(
      case
        when coalesce(s.is_doctors_procedure, false)
          then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
        else s.total_amount
      end
    ) filter (
      where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
    ), 0),
    coalesce(count(*) filter (
      where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
    ), 0),
    coalesce(sum(
      case
        when coalesce(s.is_doctors_procedure, false)
          then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
        else s.total_amount
      end
    ) filter (
      where (timezone('Asia/Manila', s.created_at))::date = p_today
    ), 0),
    coalesce(count(*) filter (
      where (timezone('Asia/Manila', s.created_at))::date = p_today
    ), 0),
    coalesce(sum(
      case
        when coalesce(s.is_doctors_procedure, false)
          then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
        else s.total_amount
      end
    ) filter (
      where (timezone('Asia/Manila', s.created_at))::date >= v_month_start
        and (timezone('Asia/Manila', s.created_at))::date <= p_to
    ), 0),
    count(distinct s.client_id) filter (
      where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
        and s.client_id is not null
    ),
    count(distinct coalesce(nullif(s.booking_ref, ''), nullif(s.invoice_number, ''), s.id::text))
      filter (
        where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
      )
  into
    v_range_sales,
    v_range_count,
    v_today_sales,
    v_today_count,
    v_month_sales,
    v_patients,
    v_bookings
  from public.sales s
  where s.branch_id = p_branch_id
    and coalesce(s.lead_source, '') <> 'Migration';

  select max((timezone('Asia/Manila', s.created_at))::date)
  into v_latest
  from public.sales s
  where s.branch_id = p_branch_id
    and coalesce(s.lead_source, '') <> 'Migration';

  return jsonb_build_object(
    'ok', true,
    'branch_id', p_branch_id,
    'from', p_from,
    'to', p_to,
    'today', p_today,
    'range_sales', v_range_sales,
    'range_count', v_range_count,
    'today_sales', v_today_sales,
    'today_count', v_today_count,
    'month_sales', v_month_sales,
    'month_label', to_char(v_month_start, 'FMMonth YYYY'),
    'patients', coalesce(v_patients, 0),
    'bookings', coalesce(v_bookings, 0),
    'latest_sale_date', v_latest
  );
end;
$$;

comment on function public.branch_dashboard_sales_summary(uuid, date, date, date) is
  'Clinic dashboard cards from ops sales only; doctor''s procedure uses clinic net (80%).';

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
          when coalesce(fs.is_doctors_procedure, false)
            then round(si.line_total * 0.8, 2)
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
  'Sales KPIs; doctor''s procedure sales counted at clinic net (80%). Transaction fees still use paid amounts.';
