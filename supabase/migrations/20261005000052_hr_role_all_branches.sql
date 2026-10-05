-- HR role: organization-wide people ops across all clinics.
-- Not full HQ — use is_people_ops() for staff / attendance / payroll / LMS access.
-- Account assignment uses HQ sentinel (same pattern as HQ_ADMIN).

insert into public.roles (id, description) values
  ('HR', 'Human Resources — oversee people ops across all clinics')
on conflict (id) do update
  set description = excluded.description;

create or replace function public.is_hr()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(array['HR']);
$$;

comment on function public.is_hr() is
  'True when the signed-in user has the HR role (org-wide people ops).';

create or replace function public.is_people_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_hq() or public.is_hr();
$$;

comment on function public.is_people_ops() is
  'HQ or HR — can view people-ops data across all clinics.';

revoke all on function public.is_hr() from public;
revoke all on function public.is_people_ops() from public;
grant execute on function public.is_hr() to authenticated, service_role;
grant execute on function public.is_people_ops() to authenticated, service_role;

-- Allow creating / assigning HR as an org role on the HQ sentinel
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
    'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
    'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
  ) then
    raise exception 'invalid role: %', p_role_id;
  end if;

  if p_status not in ('active', 'inactive') then
    raise exception 'invalid status';
  end if;

  v_is_org_role := p_role_id in ('SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'CLIENT');
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
      'SUPER_ADMIN', 'HQ_ADMIN', 'HR', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE',
      'AESTHETICIAN', 'RECEPTIONIST', 'STAFF', 'CLIENT'
    );

  insert into public.user_roles (user_id, role_id, branch_id)
  values (p_user_id, p_role_id, v_branch)
  on conflict do nothing;
end;
$$;

comment on function public.upsert_branch_account_assignment is
  'HQ: set profile + single role (clinic staff on clinic branch; SUPER/HQ/HR/CLIENT on HQ sentinel)';

-- ---------------------------------------------------------------------------
-- Branches directory — HR can list all clinics (filter / All Branches)
-- ---------------------------------------------------------------------------
drop policy if exists branches_select_staff on public.branches;
create policy branches_select_staff on public.branches
  for select
  to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','DOCTOR','NURSE','STAFF','AESTHETICIAN','HQ_ADMIN','SUPER_ADMIN','HR'])
    or id in (select public.user_branch_ids())
  );

-- ---------------------------------------------------------------------------
-- Staff directory
-- ---------------------------------------------------------------------------
drop policy if exists staff_select_staff on public.staff;
create policy staff_select_staff on public.staff
  for select to authenticated
  using (
    public.is_people_ops()
    or profile_id = auth.uid()
    or (
      public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','HQ_ADMIN','SUPER_ADMIN','STAFF','HR'])
      and (
        not public.is_franchise_branch_owner()
        or exists (
          select 1 from public.staff_branches sb
          where sb.staff_id = staff.id
            and sb.branch_id in (select public.user_franchise_branch_ids())
        )
      )
    )
  );

drop policy if exists staff_write_hq on public.staff;
create policy staff_write_hq on public.staff
  for all using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','HR'])
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and (
        not public.is_franchise_branch_owner()
        or exists (
          select 1 from public.staff_branches sb
          where sb.staff_id = staff.id
            and sb.branch_id in (select public.user_franchise_branch_ids())
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Staff positions
-- ---------------------------------------------------------------------------
drop policy if exists staff_positions_read on public.staff_positions;
create policy staff_positions_read on public.staff_positions
  for select using (
    public.has_role(array[
      'SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN','RECEPTIONIST','STAFF','DOCTOR','NURSE','AESTHETICIAN'
    ])
  );

drop policy if exists staff_positions_write on public.staff_positions;
create policy staff_positions_write on public.staff_positions
  for all using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN'])
  );

-- ---------------------------------------------------------------------------
-- Attendance logs + selfies
-- ---------------------------------------------------------------------------
drop policy if exists staff_attendance_logs_select_own on public.staff_attendance_logs;
create policy staff_attendance_logs_select_own
  on public.staff_attendance_logs for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
          and ur.branch_id <> '00000000-0000-0000-0000-000000000001'::uuid
      )
    )
  );

drop policy if exists attendance_selfies_select_own on storage.objects;
create policy attendance_selfies_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_people_ops()
      or public.has_role(array['BRANCH_ADMIN'])
    )
  );

-- ---------------------------------------------------------------------------
-- Plan B incentives — HR can view / manage all clinics
-- ---------------------------------------------------------------------------
drop policy if exists plan_b_incentives_select on public.plan_b_incentives;
create policy plan_b_incentives_select
  on public.plan_b_incentives for select to authenticated
  using (
    staff_user_id = auth.uid()::text
    or public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

drop policy if exists plan_b_incentives_insert on public.plan_b_incentives;
create policy plan_b_incentives_insert
  on public.plan_b_incentives for insert to authenticated
  with check (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

drop policy if exists plan_b_incentives_update on public.plan_b_incentives;
create policy plan_b_incentives_update
  on public.plan_b_incentives for update to authenticated
  using (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  )
  with check (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

drop policy if exists plan_b_incentives_delete on public.plan_b_incentives;
create policy plan_b_incentives_delete
  on public.plan_b_incentives for delete to authenticated
  using (
    public.is_people_ops()
    or (
      public.has_role(array['BRANCH_ADMIN'])
      and branch_id in (
        select ur.branch_id
        from public.user_roles ur
        where ur.user_id = auth.uid()
          and ur.role_id = 'BRANCH_ADMIN'
          and ur.branch_id is not null
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Recruitment & LMS
-- ---------------------------------------------------------------------------
drop policy if exists recruitment_applicants_read on public.recruitment_applicants;
create policy recruitment_applicants_read on public.recruitment_applicants
  for select using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN'])
  );

drop policy if exists recruitment_applicants_write on public.recruitment_applicants;
create policy recruitment_applicants_write on public.recruitment_applicants
  for all using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN'])
  );

drop policy if exists lms_courses_read on public.lms_courses;
create policy lms_courses_read on public.lms_courses
  for select using (
    public.has_role(array[
      'SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN','DOCTOR','NURSE','AESTHETICIAN','RECEPTIONIST','STAFF'
    ])
  );

drop policy if exists lms_courses_write on public.lms_courses;
create policy lms_courses_write on public.lms_courses
  for all using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN'])
  );

drop policy if exists lms_enrollments_read on public.lms_enrollments;
create policy lms_enrollments_read on public.lms_enrollments
  for select using (
    public.has_role(array[
      'SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN','DOCTOR','NURSE','AESTHETICIAN','RECEPTIONIST','STAFF'
    ])
  );

drop policy if exists lms_enrollments_write on public.lms_enrollments;
create policy lms_enrollments_write on public.lms_enrollments
  for all using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','HR','BRANCH_ADMIN'])
  );

-- ---------------------------------------------------------------------------
-- Payroll employee profiles
-- ---------------------------------------------------------------------------
drop policy if exists payroll_employee_profiles_hq_select on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_select
  on public.payroll_employee_profiles
  for select
  to authenticated
  using (public.is_people_ops());

drop policy if exists payroll_employee_profiles_hq_write on public.payroll_employee_profiles;
create policy payroll_employee_profiles_hq_write
  on public.payroll_employee_profiles
  for all
  to authenticated
  using (public.is_people_ops())
  with check (public.is_people_ops());

-- ---------------------------------------------------------------------------
-- Commissions (read)
-- ---------------------------------------------------------------------------
drop policy if exists commissions_restricted on public.commissions;
create policy commissions_restricted on public.commissions
  for select using (
    public.is_people_ops()
    or staff_id in (select id from public.staff where profile_id = auth.uid())
  );
