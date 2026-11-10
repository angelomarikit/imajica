-- Cash on Hand: sum physical cash tenders (payments.payment_amount where method is cash).
-- Includes Medical Procedure / doctor's procedure at full cash collected (not clinic net).

create or replace function public.branch_cash_collected(
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

  select coalesce(sum(p.payment_amount), 0)
  into v_total
  from public.payments p
  inner join public.sales s on s.id = p.sale_id
  where s.branch_id = p_branch_id
    and coalesce(s.lead_source, '') <> 'Migration'
    and s.created_at >= p_from
    and s.created_at < p_to
    and lower(replace(replace(trim(coalesce(p.payment_method, '')), ' ', '_'), '-', '_')) = 'cash'
    and lower(coalesce(p.payment_status, '')) not in ('failed', 'cancelled', 'refunded');

  return coalesce(v_total, 0);
end;
$$;

comment on function public.branch_cash_collected(uuid, timestamptz, timestamptz) is
  'Cash on Hand till total: sum of cash payment_amount for sales in [p_from, p_to). Includes doctor''s procedure at full cash collected.';

grant execute on function public.branch_cash_collected(uuid, timestamptz, timestamptz)
  to authenticated;
