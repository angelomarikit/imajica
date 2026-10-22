-- Clinic shortcut logins (lipa@ / cainta@ / sanmateo@ / …) must have BRANCH_ADMIN
-- on their real clinic UUID. Dashboard RPC branch_dashboard_sales_summary checks
-- user_branch_ids() / user_clinic_branch_ids() — a client-only email fallback is
-- not enough and returns "not allowed for this branch" (and can spam → 429).

-- Ensure Lipa clinic row exists (idempotent)
insert into public.branches (
  id, name, code, address, branch_type, status, is_main
)
values (
  '22222222-2222-2222-2222-222222222204'::uuid,
  'Lipa, Batangas',
  'BR04',
  'Lipa, Batangas',
  'company_owned',
  'active',
  false
)
on conflict (id) do update
  set name = excluded.name,
      code = excluded.code,
      branch_type = excluded.branch_type,
      status = 'active';

with clinic_shortcuts (email, branch_id) as (
  values
    ('sanmateo@imajica.com', '22222222-2222-2222-2222-222222222201'::uuid),
    ('cainta@imajica.com',   '22222222-2222-2222-2222-222222222202'::uuid),
    ('pasig@imajica.com',    '22222222-2222-2222-2222-222222222203'::uuid),
    ('pasi@imajica.com',     '22222222-2222-2222-2222-222222222203'::uuid),
    ('lipa@imajica.com',     '22222222-2222-2222-2222-222222222204'::uuid),
    ('dasma@imajica.com',    '22222222-2222-2222-2222-222222222205'::uuid),
    ('bacoor@imajica.com',   '22222222-2222-2222-2222-222222222206'::uuid),
    ('imajicalipa@gmail.com','22222222-2222-2222-2222-222222222204'::uuid),
    ('tablebr04@gmail.com',  '22222222-2222-2222-2222-222222222204'::uuid)
),
matched as (
  select p.id as user_id, m.branch_id
  from public.profiles p
  join clinic_shortcuts m on lower(trim(p.email)) = m.email
  where exists (select 1 from public.branches b where b.id = m.branch_id)
)
-- Ensure BRANCH_ADMIN on the correct clinic
insert into public.user_roles (user_id, role_id, branch_id)
select user_id, 'BRANCH_ADMIN', branch_id
from matched
on conflict do nothing;

-- Drop wrong BRANCH_ADMIN rows for those accounts (HQ sentinel / other clinics)
with clinic_shortcuts (email, branch_id) as (
  values
    ('sanmateo@imajica.com', '22222222-2222-2222-2222-222222222201'::uuid),
    ('cainta@imajica.com',   '22222222-2222-2222-2222-222222222202'::uuid),
    ('pasig@imajica.com',    '22222222-2222-2222-2222-222222222203'::uuid),
    ('pasi@imajica.com',     '22222222-2222-2222-2222-222222222203'::uuid),
    ('lipa@imajica.com',     '22222222-2222-2222-2222-222222222204'::uuid),
    ('dasma@imajica.com',    '22222222-2222-2222-2222-222222222205'::uuid),
    ('bacoor@imajica.com',   '22222222-2222-2222-2222-222222222206'::uuid),
    ('imajicalipa@gmail.com','22222222-2222-2222-2222-222222222204'::uuid),
    ('tablebr04@gmail.com',  '22222222-2222-2222-2222-222222222204'::uuid)
)
delete from public.user_roles ur
using public.profiles p, clinic_shortcuts m
where ur.user_id = p.id
  and lower(trim(p.email)) = m.email
  and ur.role_id = 'BRANCH_ADMIN'
  and ur.branch_id is distinct from m.branch_id;

-- Keep preferred_branch_id aligned (helps other clinic-scoped queries)
with clinic_shortcuts (email, branch_id) as (
  values
    ('sanmateo@imajica.com', '22222222-2222-2222-2222-222222222201'::uuid),
    ('cainta@imajica.com',   '22222222-2222-2222-2222-222222222202'::uuid),
    ('pasig@imajica.com',    '22222222-2222-2222-2222-222222222203'::uuid),
    ('pasi@imajica.com',     '22222222-2222-2222-2222-222222222203'::uuid),
    ('lipa@imajica.com',     '22222222-2222-2222-2222-222222222204'::uuid),
    ('dasma@imajica.com',    '22222222-2222-2222-2222-222222222205'::uuid),
    ('bacoor@imajica.com',   '22222222-2222-2222-2222-222222222206'::uuid),
    ('imajicalipa@gmail.com','22222222-2222-2222-2222-222222222204'::uuid),
    ('tablebr04@gmail.com',  '22222222-2222-2222-2222-222222222204'::uuid)
)
update public.profiles p
set preferred_branch_id = m.branch_id
from clinic_shortcuts m
where lower(trim(p.email)) = m.email
  and p.preferred_branch_id is distinct from m.branch_id;
