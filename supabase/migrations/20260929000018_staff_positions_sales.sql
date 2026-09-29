-- Team → Staff: positions catalog + staff_sales analytics view
-- Aligns Staff List / New Staff / Staff Sales / Positions with sales.staff_id

create table if not exists public.staff_positions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  default_commission_rate numeric(5,4) not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff
  add column if not exists position_id uuid references public.staff_positions (id);

create index if not exists staff_position_id_idx on public.staff (position_id);

alter table public.staff_positions enable row level security;

drop policy if exists staff_positions_read on public.staff_positions;
create policy staff_positions_read on public.staff_positions
  for select using (
    public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN','RECEPTIONIST','STAFF','DOCTOR','NURSE','AESTHETICIAN'])
  );

drop policy if exists staff_positions_write on public.staff_positions;
create policy staff_positions_write on public.staff_positions
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

insert into public.staff_positions (id, name, code, description, default_commission_rate, status)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 'Aesthetic Physician', 'DOCTOR', 'Licensed doctor performing medical aesthetic procedures', 0.1500, 'active'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'Clinic Nurse', 'NURSE', 'Nursing support for treatments and patient care', 0.0800, 'active'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'Aesthetician', 'AESTHETICIAN', 'Facial and non-invasive treatment specialist', 0.1000, 'active'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'Receptionist', 'RECEPTIONIST', 'Front desk, booking, and client intake', 0.0300, 'active'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 'Branch Admin', 'BRANCH_ADMIN', 'Branch operations and team oversight', 0.0500, 'active')
on conflict (code) do nothing;

comment on table public.staff_positions is
  'Team → Staff → Positions — job titles & default commission rates';

-- Staff Sales report: aggregate sales by staff in a date range
create or replace function public.analytics_staff_sales(
  p_from date default null,
  p_to date default null,
  p_branch_id uuid default null
)
returns table (
  staff_id uuid,
  staff_name text,
  branch_name text,
  position_name text,
  transactions bigint,
  service_sales numeric,
  product_sales numeric,
  gross_sales numeric
)
language sql
stable
security invoker
as $$
  select
    st.id as staff_id,
    st.full_name as staff_name,
    coalesce(b.name, '—') as branch_name,
    coalesce(sp.name, st.title, st.role_id) as position_name,
    count(distinct s.id)::bigint as transactions,
    coalesce(sum(si.line_total) filter (
      where lower(si.item_type) in ('service', 'package', 'treatment')
    ), 0) as service_sales,
    coalesce(sum(si.line_total) filter (
      where lower(si.item_type) = 'product'
    ), 0) as product_sales,
    coalesce(sum(s.total_amount), 0) as gross_sales
  from public.sales s
  join public.staff st on st.id = s.staff_id
  left join public.staff_branches sb on sb.staff_id = st.id and sb.is_primary
  left join public.branches b on b.id = coalesce(s.branch_id, sb.branch_id)
  left join public.staff_positions sp on sp.id = st.position_id
  left join public.sale_items si on si.sale_id = s.id
  where (p_from is null or s.created_at::date >= p_from)
    and (p_to is null or s.created_at::date <= p_to)
    and (p_branch_id is null or s.branch_id = p_branch_id)
  group by st.id, st.full_name, b.name, sp.name, st.title, st.role_id
  order by gross_sales desc;
$$;

grant execute on function public.analytics_staff_sales(date, date, uuid) to authenticated;
