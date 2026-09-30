-- Allow branch accounts on any clinic branch (franchise or company_owned).
-- Warehouse / HQ sentinel still rejected.

create or replace function public.upsert_branch_account_assignment(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_role_id text,
  p_branch_id uuid,
  p_status text default 'active'
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_branch_type text;
  v_branch_status text;
begin
  if not (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])) then
    raise exception 'not authorized: HQ only';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'full_name and email are required';
  end if;

  if p_role_id not in (
    'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'AESTHETICIAN', 'RECEPTIONIST', 'STAFF'
  ) then
    raise exception 'invalid branch account role: %', p_role_id;
  end if;

  if p_status not in ('active', 'inactive') then
    raise exception 'invalid status';
  end if;

  select branch_type, status into v_branch_type, v_branch_status
  from public.branches
  where id = p_branch_id;

  if v_branch_status is null then
    raise exception 'branch not found';
  end if;

  if v_branch_status <> 'active' then
    raise exception 'branch is not active';
  end if;

  if p_branch_id = '00000000-0000-0000-0000-000000000001'::uuid then
    raise exception 'cannot tag branch accounts to HQ sentinel';
  end if;

  if v_branch_type = 'warehouse' then
    raise exception 'cannot tag branch accounts to warehouse';
  end if;

  insert into public.profiles (id, full_name, email, status)
  values (p_user_id, trim(p_full_name), lower(trim(p_email)), p_status)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        status = excluded.status,
        updated_at = now();

  delete from public.user_roles
  where user_id = p_user_id
    and role_id in (
      'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'AESTHETICIAN', 'RECEPTIONIST', 'STAFF'
    );

  insert into public.user_roles (user_id, role_id, branch_id)
  values (p_user_id, p_role_id, p_branch_id)
  on conflict do nothing;
end;
$$;

create or replace view public.v_branch_accounts_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.status,
  p.avatar_url,
  p.created_at,
  p.updated_at,
  ur.role_id,
  ur.branch_id,
  b.name as branch_name,
  b.code as branch_code,
  b.branch_type
from public.profiles p
inner join lateral (
  select ur2.role_id, ur2.branch_id
  from public.user_roles ur2
  where ur2.user_id = p.id
    and ur2.branch_id is not null
    and ur2.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
    and ur2.role_id not in ('CLIENT', 'SUPER_ADMIN', 'HQ_ADMIN')
  order by
    case when ur2.role_id = 'BRANCH_ADMIN' then 0 else 1 end,
    ur2.role_id
  limit 1
) ur on true
inner join public.branches b on b.id = ur.branch_id
where coalesce(b.branch_type, 'company_owned') <> 'warehouse';

comment on view public.v_branch_accounts_directory is
  'Team → Branches → Branches Accounts — HQ directory of branch-tagged logins (franchise or company-owned)';

grant select on public.v_branch_accounts_directory to authenticated;
