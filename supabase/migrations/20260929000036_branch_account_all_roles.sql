-- Allow HQ to set any system role on Branches Accounts edit.
-- Clinic staff roles still require a real clinic/franchise branch.
-- SUPER_ADMIN / HQ_ADMIN / CLIENT are stored on the HQ sentinel branch.

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
security definer
set search_path = public
as $$
declare
  v_branch_type text;
  v_branch_status text;
  v_is_service boolean;
  v_is_hq boolean;
  v_hq constant uuid := '00000000-0000-0000-0000-000000000001';
  v_branch uuid;
  v_is_org_role boolean;
begin
  v_is_service := (auth.role() = 'service_role');
  v_is_hq := public.is_hq() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN']);

  if not (v_is_service or v_is_hq) then
    raise exception 'not authorized: HQ only';
  end if;

  if p_user_id is null then
    raise exception 'user_id is required';
  end if;

  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_email), '') = '' then
    raise exception 'full_name and email are required';
  end if;

  if p_role_id not in (
    'SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
    'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
  ) then
    raise exception 'invalid role: %', p_role_id;
  end if;

  if p_status not in ('active', 'inactive') then
    raise exception 'invalid status';
  end if;

  v_is_org_role := p_role_id in ('SUPER_ADMIN', 'HQ_ADMIN', 'CLIENT');
  v_branch := case when v_is_org_role then v_hq else p_branch_id end;

  if v_branch is null then
    raise exception 'branch is required for role %', p_role_id;
  end if;

  select branch_type, status into v_branch_type, v_branch_status
  from public.branches
  where id = v_branch;

  if v_branch_status is null then
    raise exception 'branch not found';
  end if;

  if v_branch_status <> 'active' then
    raise exception 'branch is not active';
  end if;

  if not v_is_org_role then
    if v_branch = v_hq then
      raise exception 'cannot tag clinic staff roles to HQ sentinel';
    end if;
    if v_branch_type = 'warehouse' then
      raise exception 'cannot tag branch accounts to warehouse';
    end if;
    if v_branch_type not in ('franchise', 'company_owned') then
      raise exception 'branch accounts must tag franchise or company-owned clinics';
    end if;
  end if;

  insert into public.profiles (id, full_name, email, status)
  values (p_user_id, trim(p_full_name), lower(trim(p_email)), p_status)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        status = excluded.status,
        updated_at = now();

  -- Replace prior staff / HQ assignment so the account has one primary role
  delete from public.user_roles
  where user_id = p_user_id
    and role_id in (
      'SUPER_ADMIN', 'HQ_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
      'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
    );

  insert into public.user_roles (user_id, role_id, branch_id)
  values (p_user_id, p_role_id, v_branch)
  on conflict do nothing;
end;
$$;

comment on function public.upsert_branch_account_assignment is
  'HQ: set profile + single role (clinic staff on clinic branch; SUPER/HQ/CLIENT on HQ sentinel)';

revoke all on function public.upsert_branch_account_assignment(uuid, text, text, text, uuid, text) from public;
grant execute on function public.upsert_branch_account_assignment(uuid, text, text, text, uuid, text)
  to authenticated, service_role;
