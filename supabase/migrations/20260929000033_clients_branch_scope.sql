-- Clients: HQ sees all; branch staff only see preferred_branch_id in their branches.
-- Aligns with BRANCH_ADMIN on franchise OR company-owned clinics (branch owner accounts).

-- ---------------------------------------------------------------------------
-- Helpers: any clinic BRANCH_ADMIN (not HQ sentinel, not warehouse)
-- ---------------------------------------------------------------------------

create or replace function public.user_clinic_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select ur.branch_id
  from public.user_roles ur
  join public.branches b on b.id = ur.branch_id
  where ur.user_id = auth.uid()
    and ur.branch_id is not null
    and ur.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
    and coalesce(b.branch_type, 'company_owned') <> 'warehouse'
    and ur.role_id in (
      'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
    );
$$;

create or replace function public.is_branch_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.branches b on b.id = ur.branch_id
    where ur.user_id = auth.uid()
      and ur.role_id = 'BRANCH_ADMIN'
      and ur.branch_id is not null
      and ur.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
      and coalesce(b.branch_type, 'company_owned') <> 'warehouse'
  );
$$;

-- Keep old name as alias for existing policies / docs
create or replace function public.is_franchise_branch_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_branch_owner();
$$;

create or replace function public.user_franchise_branch_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select public.user_clinic_branch_ids();
$$;

-- ---------------------------------------------------------------------------
-- Clients SELECT / WRITE
-- ---------------------------------------------------------------------------

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select
  to authenticated
  using (
    -- Own client portal record
    profile_id = auth.uid()
    -- HQ sees every customer
    or public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    -- Branch staff / branch owners: only clients tagged to their branch(es)
    or (
      public.has_role(array[
        'BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF', 'AESTHETICIAN'
      ])
      and preferred_branch_id is not null
      and preferred_branch_id in (select public.user_clinic_branch_ids())
    )
  );

drop policy if exists clients_write_staff on public.clients;
create policy clients_write_staff on public.clients
  for all
  to authenticated
  using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF'])
      and preferred_branch_id is not null
      and preferred_branch_id in (select public.user_clinic_branch_ids())
    )
  )
  with check (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
    or (
      public.has_role(array['BRANCH_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE', 'STAFF'])
      and preferred_branch_id is not null
      and preferred_branch_id in (select public.user_clinic_branch_ids())
    )
  );

comment on function public.is_branch_owner() is
  'True when auth user is BRANCH_ADMIN on a clinic branch (franchise or company-owned)';

comment on policy clients_select on public.clients is
  'HQ: all clients. Branch roles: only preferred_branch_id in user clinic branches.';
