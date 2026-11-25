-- Booking pipeline for org Marketing, Branch Marketing, and CSR Marketing.
-- Security definer so those roles do not need appointments-table SELECT
-- (CSR still only sees their own rows via RLS; Marketing has no appointments policy).

create or replace function public.marketing_booking_pipeline(
  p_from date,
  p_to date,
  p_branch_id uuid default null
)
returns table (
  appointment_id uuid,
  branch_id uuid,
  branch_name text,
  start_at timestamptz,
  status text,
  bucket text,
  client_id uuid,
  client_name text,
  phone text,
  is_new boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_scope text;
  v_hq uuid := '00000000-0000-0000-0000-000000000001';
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'invalid date range';
  end if;

  if (p_to - p_from) > 366 then
    raise exception 'date range cannot exceed 366 days';
  end if;

  if public.is_hq() or public.is_marketing() then
    v_scope := 'org';
  elsif public.is_branch_marketing() then
    v_scope := 'branch';
  elsif public.is_csr_marketing() then
    v_scope := 'csr';
  else
    raise exception 'not authorized';
  end if;

  if p_branch_id is not null then
    if v_scope = 'branch' and p_branch_id not in (select public.user_branch_ids()) then
      raise exception 'branch not assigned';
    end if;
    if v_scope = 'csr' and p_branch_id not in (select public.user_csr_branch_ids()) then
      raise exception 'branch not assigned to CSR';
    end if;
  end if;

  return query
  select
    a.id,
    a.branch_id,
    b.name,
    a.start_at,
    a.status,
    case
      when a.status in ('confirmed', 'checked_in', 'in_progress', 'completed') then 'show'
      when a.status in ('cancelled', 'no_show') then 'cancelled'
      when a.status = 'rescheduled' then 'rescheduled'
      else 'pending'
    end,
    a.client_id,
    coalesce(c.full_name, 'Client'),
    coalesce(nullif(trim(c.phone), ''), ''),
    not exists (
      select 1
      from public.appointments prev
      where prev.client_id = a.client_id
        and prev.id is distinct from a.id
        and prev.start_at < a.start_at
        and prev.status <> 'cancelled'
    )
  from public.appointments a
  join public.branches b on b.id = a.branch_id
  left join public.clients c on c.id = a.client_id
  where (a.start_at at time zone 'Asia/Manila')::date between p_from and p_to
    and b.id <> v_hq
    and b.branch_type in ('company_owned', 'franchise')
    and (
      (
        p_branch_id is null
        and (
          v_scope = 'org'
          or (v_scope = 'branch' and a.branch_id in (select public.user_branch_ids()))
          or (v_scope = 'csr' and a.branch_id in (select public.user_csr_branch_ids()))
        )
      )
      or (p_branch_id is not null and a.branch_id = p_branch_id)
    )
  order by a.start_at, b.name;
end;
$$;

comment on function public.marketing_booking_pipeline(date, date, uuid) is
  'Bookings in a Manila date range for Marketing (all clinics), Branch Marketing (own clinic), or CSR Marketing (assigned clinics).';

revoke all on function public.marketing_booking_pipeline(date, date, uuid) from public;
grant execute on function public.marketing_booking_pipeline(date, date, uuid) to authenticated, service_role;
