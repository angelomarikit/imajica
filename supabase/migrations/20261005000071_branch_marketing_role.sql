-- Branch Marketing: clinic-scoped marketing (same tools as MARKETING, one branch only).
-- Org Marketing (MARKETING) stays on HQ sentinel for the marketing leader.

insert into public.roles (id, description) values
  ('BRANCH_MARKETING', 'Branch Marketing — clinic-scoped campaigns, leads, and handoffs')
on conflict (id) do update
  set description = excluded.description;

create or replace function public.is_branch_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['BRANCH_MARKETING']);
$$;

comment on function public.is_branch_marketing() is
  'True when the signed-in user has BRANCH_MARKETING (clinic-scoped marketing).';

create or replace function public.is_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['MARKETING']);
$$;

comment on function public.is_marketing() is
  'True when the signed-in user has MARKETING (org-wide marketing leader).';

create or replace function public.can_access_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_hq() or public.is_marketing() or public.is_branch_marketing();
$$;

comment on function public.can_access_marketing() is
  'HQ, org Marketing, or Branch Marketing — marketing tools (RLS may still scope by branch).';

revoke all on function public.is_branch_marketing() from public;
revoke all on function public.is_marketing() from public;
revoke all on function public.can_access_marketing() from public;
grant execute on function public.is_branch_marketing() to authenticated, service_role;
grant execute on function public.is_marketing() to authenticated, service_role;
grant execute on function public.can_access_marketing() to authenticated, service_role;

-- Assignment: BRANCH_MARKETING is a clinic role (not org / HQ sentinel)
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
    'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'BRANCH_MARKETING',
    'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
    'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
  ) then
    raise exception 'invalid role: %', p_role_id;
  end if;

  if p_status not in ('active', 'inactive') then
    raise exception 'invalid status';
  end if;

  v_is_org_role := p_role_id in ('SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'CLIENT');
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

  delete from public.user_roles
  where user_id = p_user_id
    and role_id in (
      'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'BRANCH_MARKETING',
      'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
      'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
    );

  insert into public.user_roles (user_id, role_id, branch_id)
  values (p_user_id, p_role_id, v_branch)
  on conflict do nothing;
end;
$$;

comment on function public.upsert_branch_account_assignment is
  'HQ: clinic roles (incl. BRANCH_MARKETING) on clinic branch; SUPER/HQ/HR/MARKETING/CLIENT on HQ sentinel';

-- Branch Marketing: leads/spend only for their assigned clinic(s)
drop policy if exists marketing_leads_access on public.marketing_leads;
create policy marketing_leads_access on public.marketing_leads
  for all to authenticated
  using (
    public.is_hq()
    or public.is_marketing()
    or (
      public.is_branch_marketing()
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  )
  with check (
    public.is_hq()
    or public.is_marketing()
    or (
      public.is_branch_marketing()
      and branch_id is not null
      and branch_id in (select public.user_branch_ids())
    )
  );

drop policy if exists marketing_ad_spend_access on public.marketing_ad_spend;
create policy marketing_ad_spend_access on public.marketing_ad_spend
  for all to authenticated
  using (
    public.is_hq()
    or public.is_marketing()
    or (
      public.is_branch_marketing()
      and (
        branch_id is null
        or branch_id in (select public.user_branch_ids())
      )
    )
  )
  with check (
    public.is_hq()
    or public.is_marketing()
    or (
      public.is_branch_marketing()
      and (
        branch_id is null
        or branch_id in (select public.user_branch_ids())
      )
    )
  );

-- Directory view: include BRANCH_MARKETING with clinic staff
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
  case
    when ur.role_id in ('HR', 'MARKETING')
      then 'All Branches (organization)'
    else b.name
  end as branch_name,
  b.code as branch_code,
  b.branch_type,
  p.employee_code
from public.profiles p
inner join lateral (
  select ur2.role_id, ur2.branch_id
  from public.user_roles ur2
  where ur2.user_id = p.id
    and ur2.branch_id is not null
    and ur2.role_id not in ('CLIENT', 'SUPER_ADMIN', 'HQ_ADMIN')
    and (
      (
        ur2.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
        and ur2.role_id not in ('HR', 'MARKETING')
      )
      or ur2.role_id in ('HR', 'MARKETING')
    )
  order by
    case
      when ur2.role_id in ('HR', 'MARKETING') then 0
      when ur2.role_id = 'BRANCH_MARKETING' then 1
      when ur2.role_id = 'BRANCH_ADMIN' then 2
      else 3
    end,
    ur2.role_id
  limit 1
) ur on true
inner join public.branches b on b.id = ur.branch_id
where
  ur.role_id in ('HR', 'MARKETING', 'BRANCH_MARKETING')
  or coalesce(b.branch_type, 'company_owned') <> 'warehouse';

comment on view public.v_branch_accounts_directory is
  'Team → Branches Accounts — clinic staff + Branch Marketing + org HR / Marketing';

grant select on public.v_branch_accounts_directory to authenticated;

-- Allow Branch Marketing to read their clinic branch row
drop policy if exists branches_select_staff on public.branches;
create policy branches_select_staff on public.branches
  for select
  to authenticated
  using (
    public.is_people_ops()
    or public.can_access_marketing()
    or public.has_role(array[
      'BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN',
      'HQ_ADMIN','SUPER_ADMIN','HR','MARKETING','BRANCH_MARKETING'
    ])
    or id in (select public.user_branch_ids())
  );
