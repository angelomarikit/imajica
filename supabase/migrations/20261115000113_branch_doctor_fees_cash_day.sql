-- Cash on Hand: doctor procedure payouts (cash out from drawer) for one till business day.

create or replace function public.branch_doctor_fees_cash_day(
  p_branch_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_ok boolean;
  v_total numeric := 0;
begin
  if p_branch_id is null or p_from is null or p_to is null then
    return 0;
  end if;

  v_ok := public.is_hq()
    or public.is_people_ops()
    or public.is_operations_manager()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or p_branch_id in (select public.user_branch_ids())
    or p_branch_id in (select public.user_clinic_branch_ids());

  if not v_ok then
    return 0;
  end if;

  select coalesce(sum(
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
  ), 0)
  into v_total
  from public.sales s
  where s.branch_id = p_branch_id
    and coalesce(s.lead_source, '') <> 'Migration'
    and s.created_at >= p_from
    and s.created_at < p_to;

  return coalesce(v_total, 0);
end;
$$;

comment on function public.branch_doctor_fees_cash_day(uuid, timestamptz, timestamptz) is
  'Cash on Hand till deduction: sum doctor_fee_amount on doctor''s-procedure sales in [p_from, p_to).';

grant execute on function public.branch_doctor_fees_cash_day(uuid, timestamptz, timestamptz)
  to authenticated;