-- Cash on Hand with auto-carryforward across unconfirmed business days.

create or replace function public.cash_business_day_bounds(p_day date)
returns table (from_ts timestamptz, to_ts timestamptz)
language sql
immutable
as $$
  select
    (p_day::text || 'T08:00:00+08:00')::timestamptz,
    ((p_day + 1)::text || 'T08:00:00+08:00')::timestamptz;
$$;

comment on function public.cash_business_day_bounds(date) is
  'Inclusive start / exclusive end for cash business day D (08:00 Asia/Manila).';

create or replace function public.branch_expense_cash_day(
  p_branch_id uuid,
  p_day date
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(e.amount), 0)
  from public.operational_expenses e
  where e.branch_id = p_branch_id
    and e.expense_date = p_day
    and e.status = 'active'
    and e.deduct_cash = true;
$$;

grant execute on function public.branch_expense_cash_day(uuid, date) to authenticated;

create or replace function public.branch_cash_on_hand_state(
  p_branch_id uuid,
  p_cash_day date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_scope text;
  v_prior_day date;
  v_lookback_start date;
  v_last_confirm date;
  v_carry numeric := 0;
  v_d date;
  v_from timestamptz;
  v_to timestamptz;
  v_day_cash numeric;
  v_day_expense numeric;
  v_day_doctor numeric;
  v_day_manual numeric;
  v_confirm numeric;
  v_unclosed int := 0;
  v_prior_day_cash numeric := 0;
  v_beginning numeric := 0;
  v_beginning_source text := 'computed_carry';
  v_today_cash numeric := 0;
  v_today_expense numeric := 0;
  v_today_doctor numeric := 0;
  v_today_manual numeric := 0;
  v_ending numeric := 0;
  v_row public.cash_drawer_days%rowtype;
begin
  if p_branch_id is null or p_cash_day is null then
    return jsonb_build_object('ok', false, 'error', 'missing branch or date');
  end if;

  v_ok := public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or p_branch_id in (select public.user_branch_ids())
    or p_branch_id in (select public.user_clinic_branch_ids());

  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'not allowed');
  end if;

  v_scope := p_branch_id::text;
  v_prior_day := p_cash_day - 1;
  v_lookback_start := p_cash_day - 90;

  select max(c.date_key)
  into v_last_confirm
  from public.cash_drawer_days c
  where c.scope = v_scope
    and c.date_key < p_cash_day
    and c.date_key >= v_lookback_start;

  if v_last_confirm is not null then
    select confirmed_ending
    into v_carry
    from public.cash_drawer_days c
    where c.scope = v_scope
      and c.date_key = v_last_confirm;

    v_carry := coalesce(v_carry, 0);
    v_d := v_last_confirm + 1;
  else
    v_carry := 0;
    v_d := v_lookback_start;
  end if;

  while v_d <= v_prior_day loop
    select *
    into v_row
    from public.cash_drawer_days c
    where c.scope = v_scope
      and c.date_key = v_d;

    if found then
      v_carry := coalesce(v_row.confirmed_ending, 0);
    else
      v_unclosed := v_unclosed + 1;
      select b.from_ts, b.to_ts into v_from, v_to
      from public.cash_business_day_bounds(v_d) b;

      v_day_cash := public.branch_cash_collected(p_branch_id, v_from, v_to);
      v_day_expense := public.branch_expense_cash_day(p_branch_id, v_d);
      v_day_doctor := public.branch_doctor_fees_cash_day(p_branch_id, v_from, v_to);
      v_day_manual := 0;

      v_carry := v_carry + coalesce(v_day_cash, 0)
        - coalesce(v_day_expense, 0)
        - coalesce(v_day_doctor, 0)
        - coalesce(v_day_manual, 0);
    end if;

    if v_d = v_prior_day then
      select b.from_ts, b.to_ts into v_from, v_to
      from public.cash_business_day_bounds(v_d) b;
      v_prior_day_cash := public.branch_cash_collected(p_branch_id, v_from, v_to);
    end if;

    v_d := v_d + 1;
  end loop;

  v_beginning := coalesce(v_carry, 0);

  if v_last_confirm is not null and v_last_confirm = v_prior_day then
    v_beginning_source := 'confirmed_anchor';
  elsif v_unclosed = 0 and v_last_confirm is not null then
    v_beginning_source := 'confirmed_anchor';
  else
    v_beginning_source := 'computed_carry';
  end if;

  select b.from_ts, b.to_ts into v_from, v_to
  from public.cash_business_day_bounds(p_cash_day) b;

  v_today_cash := public.branch_cash_collected(p_branch_id, v_from, v_to);
  v_today_expense := public.branch_expense_cash_day(p_branch_id, p_cash_day);
  v_today_doctor := public.branch_doctor_fees_cash_day(p_branch_id, v_from, v_to);

  select coalesce(c.manual_deducted, 0)
  into v_today_manual
  from public.cash_drawer_days c
  where c.scope = v_scope
    and c.date_key = p_cash_day;

  if not found then
    v_today_manual := 0;
  end if;

  v_ending := v_beginning + coalesce(v_today_cash, 0)
    - coalesce(v_today_expense, 0)
    - coalesce(v_today_doctor, 0)
    - coalesce(v_today_manual, 0);

  return jsonb_build_object(
    'ok', true,
    'branch_id', p_branch_id,
    'cash_day', p_cash_day,
    'prior_cash_day', v_prior_day,
    'beginning', round(v_beginning, 2),
    'beginning_source', v_beginning_source,
    'last_confirmed_date', v_last_confirm,
    'unclosed_days', v_unclosed,
    'carried_balance', round(v_beginning, 2),
    'cash_in', round(coalesce(v_today_cash, 0), 2),
    'expense_cash_out', round(coalesce(v_today_expense, 0), 2),
    'doctor_fees_cash_day', round(coalesce(v_today_doctor, 0), 2),
    'manual_deducted', round(coalesce(v_today_manual, 0), 2),
    'ending', round(v_ending, 2),
    'prior_day_computed_cash', round(coalesce(v_prior_day_cash, 0), 2)
  );
end;
$$;

comment on function public.branch_cash_on_hand_state(uuid, date) is
  'Till state for one clinic: auto-carry unconfirmed days; explicit cash_drawer_days row anchors that day.';

grant execute on function public.branch_cash_on_hand_state(uuid, date) to authenticated;

create or replace function public.org_cash_on_hand_state(p_cash_day date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_branch record;
  v_state jsonb;
  v_branches jsonb := '[]'::jsonb;
  v_tot_beginning numeric := 0;
  v_tot_ending numeric := 0;
  v_tot_cash_in numeric := 0;
  v_tot_expense numeric := 0;
  v_tot_doctor numeric := 0;
  v_tot_manual numeric := 0;
  v_tot_unclosed int := 0;
begin
  if p_cash_day is null then
    return jsonb_build_object('ok', false, 'error', 'missing date');
  end if;

  v_ok := public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN']);

  if not v_ok then
    return jsonb_build_object('ok', false, 'error', 'not allowed');
  end if;

  for v_branch in
    select b.id, b.name, b.code
    from public.branches b
    where b.branch_type = 'company_owned'
      and b.status = 'active'
      and coalesce(b.code, '') not in ('WH', 'WAREHOUSE')
    order by b.name
  loop
    v_state := public.branch_cash_on_hand_state(v_branch.id, p_cash_day);
    if coalesce((v_state ->> 'ok')::boolean, false) then
      v_branches := v_branches || jsonb_build_array(
        v_state || jsonb_build_object(
          'branch_name', v_branch.name,
          'branch_code', v_branch.code
        )
      );
      v_tot_beginning := v_tot_beginning + coalesce((v_state ->> 'beginning')::numeric, 0);
      v_tot_ending := v_tot_ending + coalesce((v_state ->> 'ending')::numeric, 0);
      v_tot_cash_in := v_tot_cash_in + coalesce((v_state ->> 'cash_in')::numeric, 0);
      v_tot_expense := v_tot_expense + coalesce((v_state ->> 'expense_cash_out')::numeric, 0);
      v_tot_doctor := v_tot_doctor + coalesce((v_state ->> 'doctor_fees_cash_day')::numeric, 0);
      v_tot_manual := v_tot_manual + coalesce((v_state ->> 'manual_deducted')::numeric, 0);
      v_tot_unclosed := v_tot_unclosed + coalesce((v_state ->> 'unclosed_days')::int, 0);
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'cash_day', p_cash_day,
    'branches', v_branches,
    'beginning', round(v_tot_beginning, 2),
    'ending', round(v_tot_ending, 2),
    'carried_balance', round(v_tot_beginning, 2),
    'cash_in', round(v_tot_cash_in, 2),
    'expense_cash_out', round(v_tot_expense, 2),
    'doctor_fees_cash_day', round(v_tot_doctor, 2),
    'manual_deducted', round(v_tot_manual, 2),
    'unclosed_days', v_tot_unclosed,
    'branch_count', jsonb_array_length(v_branches)
  );
end;
$$;

comment on function public.org_cash_on_hand_state(date) is
  'Combined Cash on Hand for active company-owned clinics (excludes warehouse).';

grant execute on function public.org_cash_on_hand_state(date) to authenticated;