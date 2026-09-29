-- Team module: Recruitment & LMS (+ user access alignment notes)
-- Staff / Branches / roles already exist; this adds hiring + learning tables

-- ---------------------------------------------------------------------------
-- Recruitment pipeline (feeds Staff when hired)
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_applicants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  applied_role text not null,
  branch_id uuid references public.branches (id),
  status text not null default 'screening'
    check (status in ('screening', 'interview', 'offer', 'hired', 'rejected', 'withdrawn')),
  resume_url text,
  notes text,
  applied_at date not null default current_date,
  hired_staff_id uuid references public.staff (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recruitment_applicants_status_idx
  on public.recruitment_applicants (status, applied_at desc);

create index if not exists recruitment_applicants_branch_idx
  on public.recruitment_applicants (branch_id);

alter table public.recruitment_applicants enable row level security;

drop policy if exists recruitment_applicants_read on public.recruitment_applicants;
create policy recruitment_applicants_read on public.recruitment_applicants
  for select using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

drop policy if exists recruitment_applicants_write on public.recruitment_applicants;
create policy recruitment_applicants_write on public.recruitment_applicants
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

comment on table public.recruitment_applicants is
  'Team → Recruitment pipeline; hired applicants can link to staff';

-- ---------------------------------------------------------------------------
-- LMS courses & enrollments (staff training)
-- ---------------------------------------------------------------------------
create table if not exists public.lms_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'General',
  description text,
  duration_hours numeric(6,1) not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lms_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete cascade,
  progress_pct numeric(5,2) not null default 0,
  status text not null default 'enrolled'
    check (status in ('enrolled', 'in_progress', 'completed', 'dropped')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (course_id, staff_id)
);

create index if not exists lms_enrollments_staff_idx on public.lms_enrollments (staff_id);
create index if not exists lms_enrollments_course_idx on public.lms_enrollments (course_id);

alter table public.lms_courses enable row level security;
alter table public.lms_enrollments enable row level security;

drop policy if exists lms_courses_read on public.lms_courses;
create policy lms_courses_read on public.lms_courses
  for select using (
    public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN','DOCTOR','NURSE','AESTHETICIAN','RECEPTIONIST','STAFF'])
  );

drop policy if exists lms_courses_write on public.lms_courses;
create policy lms_courses_write on public.lms_courses
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

drop policy if exists lms_enrollments_read on public.lms_enrollments;
create policy lms_enrollments_read on public.lms_enrollments
  for select using (
    public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN','DOCTOR','NURSE','AESTHETICIAN','RECEPTIONIST','STAFF'])
  );

drop policy if exists lms_enrollments_write on public.lms_enrollments;
create policy lms_enrollments_write on public.lms_enrollments
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

comment on table public.lms_courses is 'Team → LMS course catalog';
comment on table public.lms_enrollments is 'Team → LMS progress per staff member';

-- ---------------------------------------------------------------------------
-- User Access: convenience view over profiles + user_roles + staff
-- (tables already exist: profiles, roles, user_roles, staff, branches)
-- ---------------------------------------------------------------------------
create or replace view public.v_team_user_access as
select
  p.id as profile_id,
  p.full_name,
  p.email,
  ur.role_id,
  ur.branch_id,
  b.name as branch_name,
  s.id as staff_id,
  s.status as staff_status,
  p.created_at
from public.profiles p
left join public.user_roles ur on ur.user_id = p.id
left join public.branches b on b.id = ur.branch_id
left join public.staff s on s.profile_id = p.id;

comment on view public.v_team_user_access is
  'Team → User Access roster (profiles + roles + optional staff link)';

grant select on public.v_team_user_access to authenticated;
