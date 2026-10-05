-- Employee Database (HR): richer staff profile fields + upsert by profile_id
-- public.staff already holds address / emergency contacts from 000019;
-- this migration adds middle_name and a unique profile link for HR edits.

alter table public.staff
  add column if not exists middle_name text;

comment on column public.staff.middle_name is 'Employee Database — middle name';
comment on column public.staff.address is 'Home / residential address for HR records';
comment on column public.staff.emergency_contact_name is 'Emergency contact full name';
comment on column public.staff.emergency_contact_relation is 'Emergency contact relationship';
comment on column public.staff.emergency_contact_phone is 'Emergency contact mobile number';

-- One HR staff row per login profile (when linked)
create unique index if not exists staff_profile_id_uidx
  on public.staff (profile_id)
  where profile_id is not null;

-- People-ops (HQ + HR) already covered by staff_write_hq / staff_select_staff in 000052.
-- Reaffirm write access so HR can maintain employee records.
drop policy if exists staff_write_hq on public.staff;
create policy staff_write_hq on public.staff
  for all to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
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
  )
  with check (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN'])
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

comment on policy staff_write_hq on public.staff is
  'HQ / HR (people-ops) and clinic managers may maintain employee HR records';
