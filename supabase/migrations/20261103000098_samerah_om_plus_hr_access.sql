-- Samerah Sandigan (OPERATIONS_MANAGER) also receives org-wide HR people-ops.
-- Dual role rows on HQ sentinel: OM keeps clinic/HQ ops; HR unlocks full people-ops RLS + UI.

insert into public.user_roles (user_id, role_id, branch_id)
select p.id, 'HR', '00000000-0000-0000-0000-000000000001'
from public.profiles p
where lower(p.email) = lower('samerah.sandigan@imajica.com')
on conflict (user_id, role_id, branch_id) do nothing;

comment on table public.user_roles is
  'User ↔ role ↔ branch. A profile may hold multiple roles (e.g. OPERATIONS_MANAGER + HR).';
