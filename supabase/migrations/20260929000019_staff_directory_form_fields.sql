-- Staff form fields + departments (Add New Staff / Positions UI)
-- Extends 20260929000018_staff_positions_sales.sql

alter table public.staff_positions
  add column if not exists department text not null default 'Operation Departments';

alter table public.staff
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birth_date date,
  add column if not exists department text,
  add column if not exists address text,
  add column if not exists avatar_url text,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_relation text,
  add column if not exists emergency_contact_phone text;

comment on column public.staff.first_name is 'Add New Staff form — first name';
comment on column public.staff.last_name is 'Add New Staff form — last name';
comment on column public.staff.department is 'Department scope (Operation / Clinical / Admin / Marketing)';
comment on column public.staff_positions.department is 'Department grouping for Position Directory';

-- Keep ranking RPC ordered by booking count (matches Staff Sales Ranking UI)
-- Must DROP first: return columns differ from 000018 (cannot CREATE OR REPLACE)
drop function if exists public.analytics_staff_sales(date, date, uuid);

create or replace function public.analytics_staff_sales(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (
  rank bigint,
  staff_id uuid,
  staff_name text,
  branch_name text,
  position_name text,
  booking_count bigint,
  total_sales numeric
)
language sql
stable
security invoker
as $$
  with agg as (
    select
      st.id as staff_id,
      st.full_name as staff_name,
      coalesce(b.name, '—') as branch_name,
      coalesce(sp.name, st.title, st.role_id) as position_name,
      count(distinct s.id)::bigint as booking_count,
      coalesce(sum(s.total_amount), 0) as total_sales
    from public.sales s
    join public.staff st on st.id = s.staff_id
    left join public.staff_branches sb on sb.staff_id = st.id and sb.is_primary
    left join public.branches b on b.id = coalesce(s.branch_id, sb.branch_id)
    left join public.staff_positions sp on sp.id = st.position_id
    where (p_from is null or s.created_at::date >= p_from)
      and (p_to is null or s.created_at::date <= p_to)
      and (p_branch_id is null or s.branch_id = p_branch_id)
    group by st.id, st.full_name, b.name, sp.name, st.title, st.role_id
  )
  select
    row_number() over (order by a.booking_count desc, a.total_sales desc) as rank,
    a.staff_id,
    a.staff_name,
    a.branch_name,
    a.position_name,
    a.booking_count,
    a.total_sales
  from agg a
  order by a.booking_count desc, a.total_sales desc;
$$;

grant execute on function public.analytics_staff_sales(date, date, uuid) to authenticated;
