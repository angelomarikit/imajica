-- Marketing role: org-wide marketing & sales tools (not full HQ).
-- Account assignment uses HQ sentinel (same pattern as HR / HQ_ADMIN).

insert into public.roles (id, description) values
  ('MARKETING', 'Marketing — campaigns, leads, promotions, and sales performance')
on conflict (id) do update
  set description = excluded.description;

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
  'True when the signed-in user has the MARKETING role (org-wide marketing).';

create or replace function public.can_access_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_hq() or public.is_marketing();
$$;

comment on function public.can_access_marketing() is
  'HQ or Marketing — can manage marketing campaigns, promos, and related tools.';

revoke all on function public.is_marketing() from public;
revoke all on function public.can_access_marketing() from public;
grant execute on function public.is_marketing() to authenticated, service_role;
grant execute on function public.can_access_marketing() to authenticated, service_role;

-- Allow creating / assigning MARKETING as an org role on the HQ sentinel
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
    'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
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
      'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'MARKETING', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
      'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
    );

  insert into public.user_roles (user_id, role_id, branch_id)
  values (p_user_id, p_role_id, v_branch)
  on conflict do nothing;
end;
$$;

comment on function public.upsert_branch_account_assignment is
  'HQ: set profile + single role (clinic staff on clinic branch; SUPER/HQ/HR/MARKETING/CLIENT on HQ sentinel)';

-- Marketing can list branches (All Branches / filter)
drop policy if exists branches_select_staff on public.branches;
create policy branches_select_staff on public.branches
  for select
  to authenticated
  using (
    public.is_people_ops()
    or public.can_access_marketing()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN','HQ_ADMIN','SUPER_ADMIN','HR','MARKETING'])
    or id in (select public.user_branch_ids())
  );

-- Landing promos — marketing can manage
drop policy if exists landing_promos_write on public.landing_promos;
create policy landing_promos_write on public.landing_promos
  for all to authenticated
  using (public.can_access_marketing())
  with check (public.can_access_marketing());

drop policy if exists landing_promos_read_staff on public.landing_promos;
create policy landing_promos_read_staff on public.landing_promos
  for select to authenticated
  using (
    public.can_access_marketing()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN','RECEPTIONIST','MARKETING'])
  );

-- Marketing campaigns table (if present)
do $$
begin
  if to_regclass('public.marketing_campaigns') is not null then
    execute $p$
      drop policy if exists marketing_campaigns_write on public.marketing_campaigns;
      create policy marketing_campaigns_write on public.marketing_campaigns
        for all to authenticated
        using (public.can_access_marketing())
        with check (public.can_access_marketing());
    $p$;
  end if;
end $$;
