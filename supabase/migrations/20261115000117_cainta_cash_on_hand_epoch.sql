-- Cainta: same Cash on Hand carry start as Pasig (ignore cash before 2026-11-13).

insert into public.branch_cash_on_hand_epochs (branch_id, epoch_date)
select id, '2026-11-13'::date
from public.branches
where id = '22222222-2222-2222-2222-222222222202'::uuid
   or code = 'BR02'
on conflict (branch_id) do update
  set epoch_date = excluded.epoch_date,
      updated_at = now();

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
  v_epoch date;
  v_carry numeric := 0;
  v_d date;
  v_from timestamptz;
  v_to timestamptz;
  v_day_cash numeric;
  v_day_expense numeric;
  v_day_doctor numeric;
  v_day_manual numeric;
  v_prior_day_cash numeric := 0;
  v_prior_day_doctor numeric := 0;
  v_prior_day_expense numeric := 0;
  v_beginning numeric := 0;
  v_today_cash numeric := 0;
  v_today_expense numeric := 0;
  v_today_doctor numeric := 0;
  v_today_manual numeric := 0;
  v_ending numeric := 0;
  v_unclosed int := 0;
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
  v_epoch := public.cash_on_hand_epoch_date(p_branch_id);

  if v_epoch is not null and v_prior_day < v_epoch then
    v_d := null;
  elsif v_epoch is not null then
    v_d := v_epoch;
  else
    v_d := v_lookback_start;
  end if;

  if v_d is not null then
    while v_d <= v_prior_day loop
      select coalesce(c.manual_deducted, 0)
      into v_day_manual
      from public.cash_drawer_days c
      where c.scope = v_scope
        and c.date_key = v_d;

      if not found then
        v_day_manual := 0;
      end if;

      select b.from_ts, b.to_ts into v_from, v_to
      from public.cash_business_day_bounds(v_d) b;

      v_day_cash := public.branch_cash_collected(p_branch_id, v_from, v_to);
      v_day_expense := public.branch_expense_cash_day(p_branch_id, v_d);
      v_day_doctor := public.branch_doctor_fees_cash_day(p_branch_id, v_from, v_to);

      if (v_epoch is null or v_d >= v_epoch)
        and coalesce(v_day_cash, 0) > 0
        and coalesce(v_day_manual, 0) = 0
      then
        v_unclosed := v_unclosed + 1;
      end if;

      v_carry := v_carry
        + coalesce(v_day_cash, 0)
        - coalesce(v_day_expense, 0)
        - coalesce(v_day_doctor, 0)
        - coalesce(v_day_manual, 0);

      if v_d = v_prior_day then
        v_prior_day_cash := coalesce(v_day_cash, 0);
        v_prior_day_doctor := coalesce(v_day_doctor, 0);
        v_prior_day_expense := coalesce(v_day_expense, 0);
      end if;

      v_d := v_d + 1;
    end loop;
  end if;

  v_beginning := greatest(round(coalesce(v_carry, 0), 2), 0);

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

  v_ending := greatest(round(v_ending, 2), 0);

  return jsonb_build_object(
    'ok', true,
    'branch_id', p_branch_id,
    'cash_day', p_cash_day,
    'prior_cash_day', v_prior_day,
    'cash_on_hand_epoch', v_epoch,
    'beginning', v_beginning,
    'beginning_source', 'computed_carry',
    'last_confirmed_date', null,
    'unclosed_days', v_unclosed,
    'carried_balance', v_beginning,
    'cash_in', round(coalesce(v_today_cash, 0), 2),
    'expense_cash_out', round(coalesce(v_today_expense, 0), 2),
    'doctor_fees_cash_day', round(coalesce(v_today_doctor, 0), 2),
    'manual_deducted', round(coalesce(v_today_manual, 0), 2),
    'ending', v_ending,
    'prior_day_computed_cash', round(coalesce(v_prior_day_cash, 0), 2),
    'prior_day_doctor_fees', round(coalesce(v_prior_day_doctor, 0), 2),
    'prior_day_expense_cash_out', round(coalesce(v_prior_day_expense, 0), 2)
  );
end;
$$;

grant execute on function public.branch_cash_on_hand_state(uuid, date) to authenticated;