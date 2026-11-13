-- Audit fix: Medical Procedure from server; keep clinic net / gross formulas stable.
-- doctor_fees = sum of doctor fee on doctor's-procedure sales in the selected range.

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
  v_range_gross numeric := 0;
  v_today_gross numeric := 0;
  v_month_gross numeric := 0;
  v_doctor_fees numeric := 0;
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
    or public.is_operations_manager()
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
    coalesce(sum(s.total_amount) filter (
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
    coalesce(sum(s.total_amount) filter (
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
    coalesce(sum(s.total_amount) filter (
      where (timezone('Asia/Manila', s.created_at))::date >= v_month_start
        and (timezone('Asia/Manila', s.created_at))::date <= p_to
    ), 0),
    coalesce(sum(
      case
        when coalesce(s.is_doctors_procedure, false) then
          coalesce(
            s.doctor_fee_amount,
            case
              when s.clinic_net_amount is not null
                then greatest(s.total_amount - s.clinic_net_amount, 0)
              else round(s.total_amount * 0.2, 2)
            end
          )
        else 0
      end
    ) filter (
      where (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
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
    v_range_gross,
    v_range_count,
    v_today_sales,
    v_today_gross,
    v_today_count,
    v_month_sales,
    v_month_gross,
    v_doctor_fees,
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
    'range_gross', v_range_gross,
    'range_count', v_range_count,
    'today_sales', v_today_sales,
    'today_gross', v_today_gross,
    'today_count', v_today_count,
    'month_sales', v_month_sales,
    'month_gross', v_month_gross,
    'doctor_fees', v_doctor_fees,
    'month_label', to_char(v_month_start, 'FMMonth YYYY'),
    'patients', coalesce(v_patients, 0),
    'bookings', coalesce(v_bookings, 0),
    'latest_sale_date', v_latest
  );
end;
$$;

create or replace function public.org_dashboard_sales_by_branch(
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
  v_cash_from timestamptz;
  v_cash_to timestamptz;
  v_rows jsonb := '[]'::jsonb;
begin
  if p_from is null or p_to is null then
    return jsonb_build_object('ok', false, 'error', 'from and to are required');
  end if;

  v_ok := public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']);

  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'not allowed');
  end if;

  v_cash_from := ((p_today::text || ' 08:00:00')::timestamp at time zone 'Asia/Manila');
  v_cash_to := v_cash_from + interval '1 day';

  select coalesce(jsonb_agg(row_json order by clinic_net desc, branch_name), '[]'::jsonb)
  into v_rows
  from (
    select
      b.id as branch_id,
      b.name as branch_name,
      coalesce(sum(
        case
          when coalesce(s.is_doctors_procedure, false)
            then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
          else s.total_amount
        end
      ) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
      ), 0) as clinic_net,
      coalesce(sum(s.total_amount) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
      ), 0) as gross,
      coalesce(sum(
        case
          when coalesce(s.is_doctors_procedure, false)
            then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
          else s.total_amount
        end
      ) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date = p_today
      ), 0) as today_clinic_net,
      coalesce(sum(s.total_amount) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date = p_today
      ), 0) as today_gross,
      coalesce(sum(
        case
          when coalesce(s.is_doctors_procedure, false)
            then coalesce(s.clinic_net_amount, round(s.total_amount * 0.8, 2))
          else s.total_amount
        end
      ) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date >= date_trunc('month', p_to)::date
          and (timezone('Asia/Manila', s.created_at))::date <= p_to
      ), 0) as month_clinic_net,
      coalesce(sum(s.total_amount) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date >= date_trunc('month', p_to)::date
          and (timezone('Asia/Manila', s.created_at))::date <= p_to
      ), 0) as month_gross,
      coalesce(sum(
        case
          when coalesce(s.is_doctors_procedure, false) then
            coalesce(
              s.doctor_fee_amount,
              case
                when s.clinic_net_amount is not null
                  then greatest(s.total_amount - s.clinic_net_amount, 0)
                else round(s.total_amount * 0.2, 2)
              end
            )
          else 0
        end
      ) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
      ), 0) as doctor_fees,
      coalesce((
        select sum(p.payment_amount)
        from public.payments p
        inner join public.sales s2 on s2.id = p.sale_id
        where s2.branch_id = b.id
          and coalesce(s2.lead_source, '') <> 'Migration'
          and s2.created_at >= v_cash_from
          and s2.created_at < v_cash_to
          and lower(replace(replace(trim(coalesce(p.payment_method, '')), ' ', '_'), '-', '_')) = 'cash'
          and lower(coalesce(p.payment_status, '')) not in ('failed', 'cancelled', 'refunded')
      ), 0) as cash_today,
      coalesce(count(s.id) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
      ), 0) as sale_count,
      count(distinct coalesce(nullif(s.booking_ref, ''), nullif(s.invoice_number, ''), s.id::text))
        filter (
          where s.id is not null
            and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
        ) as booking_count,
      count(distinct s.client_id) filter (
        where s.id is not null
          and (timezone('Asia/Manila', s.created_at))::date between p_from and p_to
          and s.client_id is not null
      ) as patient_count
    from public.branches b
    left join public.sales s
      on s.branch_id = b.id
      and coalesce(s.lead_source, '') <> 'Migration'
    where b.status = 'active'
      and coalesce(b.branch_type, 'clinic') <> 'warehouse'
      and b.code is distinct from 'HQ'
    group by b.id, b.name
  ) t
  cross join lateral (
    select jsonb_build_object(
      'branch_id', t.branch_id,
      'branch_name', t.branch_name,
      'clinic_net', t.clinic_net,
      'gross', t.gross,
      'today_clinic_net', t.today_clinic_net,
      'today_gross', t.today_gross,
      'month_clinic_net', t.month_clinic_net,
      'month_gross', t.month_gross,
      'doctor_fees', t.doctor_fees,
      'cash_today', t.cash_today,
      'sale_count', t.sale_count,
      'booking_count', t.booking_count,
      'patient_count', t.patient_count
    ) as row_json
  ) j;

  return jsonb_build_object(
    'ok', true,
    'from', p_from,
    'to', p_to,
    'today', p_today,
    'branches', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;
