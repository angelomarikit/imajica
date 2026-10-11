-- Fast dashboard metrics: aggregate in Postgres so clinic managers do not need to
-- download thousands of sale_items/payments rows (nested embeds time out under RLS).
-- Live checkouts keep writing to public.sales; this RPC always reads current totals.

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

  -- Caller must be HQ/people-ops or assigned to this clinic
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
    coalesce(sum(s.total_amount) filter (
      where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
    ), 0),
    coalesce(count(*) filter (
      where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
    ), 0),
    coalesce(sum(s.total_amount) filter (
      where (timezone('Asia/Manila', s.created_at))::date = p_today
    ), 0),
    coalesce(count(*) filter (
      where (timezone('Asia/Manila', s.created_at))::date = p_today
    ), 0),
    coalesce(sum(s.total_amount) filter (
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
  where s.branch_id = p_branch_id;

  select max((timezone('Asia/Manila', s.created_at))::date)
  into v_latest
  from public.sales s
  where s.branch_id = p_branch_id;

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
  'Clinic dashboard cards: SUM/COUNT from sales in Asia/Manila local dates (migration + live).';

grant execute on function public.branch_dashboard_sales_summary(uuid, date, date, date)
  to authenticated;

-- Index to keep branch + date aggregates fast as live sales grow
create index if not exists sales_branch_created_at_idx
  on public.sales (branch_id, created_at desc);
