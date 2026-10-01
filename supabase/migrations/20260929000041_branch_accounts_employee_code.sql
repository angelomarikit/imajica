-- Branches Accounts: employee_code in directory views + HQ setter RPC
-- Align known kiosk numbers onto matching branch account profiles by name

alter table public.profiles
  add column if not exists employee_code text;

create unique index if not exists profiles_employee_code_uidx
  on public.profiles (employee_code)
  where employee_code is not null and employee_code <> '';

-- ---------------------------------------------------------------------------
-- Directory views include employee_code
-- NOTE: CREATE OR REPLACE cannot change mid-list column names/order.
-- Append employee_code at the end (or drop + recreate). Prefer append.
-- ---------------------------------------------------------------------------

drop view if exists public.v_branch_accounts_directory;
create view public.v_branch_accounts_directory as
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
  b.branch_type,
  p.employee_code
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

drop view if exists public.v_user_access_directory;
create view public.v_user_access_directory as
select
  p.id,
  p.full_name,
  p.email,
  p.phone,
  p.status,
  p.avatar_url,
  p.created_at,
  ur.role_id,
  ur.branch_id,
  b.name as branch_name,
  p.employee_code
from public.profiles p
left join lateral (
  select ur2.role_id, ur2.branch_id
  from public.user_roles ur2
  where ur2.user_id = p.id
  order by
    case when ur2.role_id = 'SUPER_ADMIN' then 0 else 1 end,
    ur2.role_id
  limit 1
) ur on true
left join public.branches b on b.id = ur.branch_id
where coalesce(ur.role_id, '') <> 'CLIENT'
   or ur.role_id is null;

comment on view public.v_user_access_directory is
  'Team → User Access → Users List (staff/admin accounts)';

grant select on public.v_user_access_directory to authenticated;

-- ---------------------------------------------------------------------------
-- HQ: set / clear employee number (unique)
-- ---------------------------------------------------------------------------

create or replace function public.set_profile_employee_code(
  p_user_id uuid,
  p_employee_code text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_code text;
  v_other uuid;
begin
  if not (public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])) then
    raise exception 'not authorized: HQ only';
  end if;

  if p_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'User is required');
  end if;

  if p_employee_code is null or trim(p_employee_code) = '' then
    update public.profiles
      set employee_code = null, updated_at = now()
    where id = p_user_id;
    return jsonb_build_object('ok', true, 'employeeCode', null);
  end if;

  v_code := lpad(regexp_replace(trim(p_employee_code), '\D', '', 'g'), 3, '0');
  if v_code = '' or v_code = '000' then
    return jsonb_build_object('ok', false, 'error', 'Enter a valid employee number');
  end if;

  select id into v_other
  from public.profiles
  where employee_code = v_code
    and id <> p_user_id
  limit 1;

  if v_other is not null then
    return jsonb_build_object(
      'ok', false,
      'error', format('Employee number %s is already assigned to another account', v_code)
    );
  end if;

  update public.profiles
    set employee_code = v_code, updated_at = now()
  where id = p_user_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Account not found');
  end if;

  return jsonb_build_object('ok', true, 'employeeCode', v_code);
end;
$$;

revoke all on function public.set_profile_employee_code(uuid, text) from public;
grant execute on function public.set_profile_employee_code(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Align codes onto existing branch accounts by name when code is free
-- (does not overwrite an existing employee_code)
-- ---------------------------------------------------------------------------

create or replace function public._align_employee_code_by_name(
  p_name_pattern text,
  p_code text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := lpad(regexp_replace(p_code, '\D', '', 'g'), 3, '0');
begin
  if exists (select 1 from public.profiles where employee_code = v_code) then
    return;
  end if;

  update public.profiles p
  set employee_code = v_code, updated_at = now()
  where p.employee_code is null
    and p.full_name ~* p_name_pattern
    and exists (
      select 1
      from public.user_roles ur
      where ur.user_id = p.id
        and ur.branch_id is not null
        and ur.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
    )
    and p.id = (
      select p2.id
      from public.profiles p2
      where p2.employee_code is null
        and p2.full_name ~* p_name_pattern
        and exists (
          select 1 from public.user_roles ur2
          where ur2.user_id = p2.id
            and ur2.branch_id is not null
            and ur2.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
        )
      order by p2.created_at
      limit 1
    );
end;
$$;

revoke all on function public._align_employee_code_by_name(text, text) from public;

-- Prefer @imajica.com kiosk emails already seeded in migration 40.
-- Also align legacy branch logins that match the same people (only if code still free).
select public._align_employee_code_by_name('Veronica\s+Mayo', '002');
select public._align_employee_code_by_name('Samerah\s+Sandigan', '007');
select public._align_employee_code_by_name('Sonayah\s+Arsila', '008');
select public._align_employee_code_by_name('Noraisa\s+Unayan', '010');
select public._align_employee_code_by_name('Sitti\s+Nur\s+Aisa\s+Tan|Sittie\s+.*Tan', '012');
select public._align_employee_code_by_name('Melissa\s+Gervacio|Mellisa\s+Gervacio', '014');
select public._align_employee_code_by_name('Hendra\s+Sandigan', '017');
select public._align_employee_code_by_name('Heidi\s+.*Reyes', '022');
select public._align_employee_code_by_name('Janice\s+.*Aguirre', '023');
select public._align_employee_code_by_name('Annie\s+Barba', '024');
select public._align_employee_code_by_name('Chloe\s+.*Francisco', '025');
select public._align_employee_code_by_name('Sapiya\s+Lomodah', '026');
select public._align_employee_code_by_name('Ynyr\s+.*Bandoquillo', '027');
