-- Payment Channels Report: same date/branch rules as branch_dashboard_sales_summary.
-- Sums payment rows (gross collected); falls back to sales.payment_methods + total_amount when no payments exist.

create or replace function public.normalize_payment_channel_key(p_method text)
returns text
language sql
immutable
as $$
  select case
    when lower(replace(replace(trim(coalesce(p_method, '')), ' ', '_'), '-', '_')) in ('', 'null') then 'other'
    when lower(replace(replace(trim(p_method), ' ', '_'), '-', '_')) = 'cash' then 'cash'
    when lower(replace(replace(trim(p_method), ' ', '_'), '-', '_')) in ('credit_card', 'creditcard', 'card') then 'credit_card'
    when lower(replace(replace(trim(p_method), ' ', '_'), '-', '_')) in ('debit_card', 'debitcard') then 'debit_card'
    when lower(replace(replace(trim(p_method), ' ', '_'), '-', '_')) in (
      'qr_ph', 'qrph', 'qr', 'gcash', 'paymaya', 'paymongo'
    ) then 'qr_ph'
    when lower(replace(replace(trim(p_method), ' ', '_'), '-', '_')) in ('owners_account', 'ownersaccount') then 'owners_account'
    else 'other'
  end;
$$;

create or replace function public.payment_channels_report(
  p_branch_id uuid,
  p_from date,
  p_to date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_total numeric := 0;
  v_txn int := 0;
  v_sales_gross numeric := 0;
  v_sales_count int := 0;
  v_channels jsonb := '[]'::jsonb;
begin
  if p_from is null or p_to is null then
    return jsonb_build_object('ok', false, 'error', 'from and to are required');
  end if;

  if p_branch_id is not null then
    v_ok := public.is_hq()
      or public.is_people_ops()
      or public.is_operations_manager()
      or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
      or p_branch_id in (select public.user_branch_ids())
      or p_branch_id in (select public.user_clinic_branch_ids());
    if not v_ok then
      return jsonb_build_object('ok', false, 'error', 'not allowed for this branch');
    end if;
  else
    v_ok := public.is_hq()
      or public.is_people_ops()
      or public.is_operations_manager()
      or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']);
    if not v_ok then
      return jsonb_build_object('ok', false, 'error', 'all branches requires HQ or OM');
    end if;
  end if;

  with sales_in_range as (
    select s.id, s.total_amount, s.payment_methods
    from public.sales s
    where coalesce(s.lead_source, '') <> 'Migration'
      and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
      and (p_branch_id is null or s.branch_id = p_branch_id)
  ),
  sales_stats as (
    select coalesce(sum(total_amount), 0) as gross, count(*)::int as cnt
    from sales_in_range
  ),
  pay_paid as (
    select p.sale_id, coalesce(sum(p.payment_amount), 0) as paid
    from public.payments p
    inner join sales_in_range s on s.id = p.sale_id
    where lower(coalesce(p.payment_status, '')) not in ('failed', 'cancelled', 'refunded')
    group by p.sale_id
  ),
  pay_lines as (
    select
      public.normalize_payment_channel_key(p.payment_method) as channel_key,
      p.payment_amount::numeric as amount
    from public.payments p
    inner join sales_in_range s on s.id = p.sale_id
    where lower(coalesce(p.payment_status, '')) not in ('failed', 'cancelled', 'refunded')
      and coalesce(p.payment_amount, 0) > 0
  ),
  fallback_lines as (
    select
      public.normalize_payment_channel_key(m.method) as channel_key,
      (s.total_amount / greatest(coalesce(cardinality(s.payment_methods), 1), 1))::numeric as amount
    from sales_in_range s
    left join pay_paid pp on pp.sale_id = s.id
    cross join lateral unnest(
      case
        when s.payment_methods is not null and cardinality(s.payment_methods) > 0 then s.payment_methods
        else array['other']::text[]
      end
    ) as m(method)
    where coalesce(pp.paid, 0) <= 0
      and coalesce(s.total_amount, 0) > 0
  ),
  combined as (
    select channel_key, amount from pay_lines
    union all
    select channel_key, amount from fallback_lines
  ),
  agg as (
    select
      channel_key,
      round(coalesce(sum(amount), 0), 2) as amount,
      count(*)::int as cnt
    from combined
    group by channel_key
  )
  select
  coalesce((select gross from sales_stats), 0),
  coalesce((select cnt from sales_stats), 0),
  coalesce((select sum(amount) from agg), 0),
  coalesce((select sum(cnt) from agg), 0),
  coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'key', channel_key,
          'amount', amount,
          'count', cnt
        )
        order by amount desc
      )
      from agg
    ),
    '[]'::jsonb
  )
  into v_sales_gross, v_sales_count, v_total, v_txn, v_channels;

  return jsonb_build_object(
    'ok', true,
    'channels', coalesce(v_channels, '[]'::jsonb),
    'total', v_total,
    'txn_count', v_txn,
    'sales_gross', v_sales_gross,
    'sales_count', v_sales_count,
    'from', p_from,
    'to', p_to,
    'branch_id', p_branch_id
  );
end;
$$;

comment on function public.payment_channels_report(uuid, date, date) is
  'Gross tender collected by channel for sales in Manila date range; payments rows first, else sales.payment_methods + total_amount.';

grant execute on function public.payment_channels_report(uuid, date, date) to authenticated;