-- Staff Time In / Time Out attendance logs + selfie storage

create table if not exists public.staff_attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  branch_id uuid not null references public.branches (id),
  punch_type text not null check (punch_type in ('time_in', 'time_out')),
  punched_at timestamptz not null default now(),
  photo_url text,
  latitude numeric,
  longitude numeric,
  accuracy_m numeric,
  created_at timestamptz not null default now()
);

create index if not exists staff_attendance_logs_user_punched_idx
  on public.staff_attendance_logs (user_id, punched_at desc);

create index if not exists staff_attendance_logs_branch_punched_idx
  on public.staff_attendance_logs (branch_id, punched_at desc);

comment on table public.staff_attendance_logs is
  'Staff Time In / Time Out punches with selfie URL and geolocation';

alter table public.staff_attendance_logs enable row level security;

-- Own rows: insert + select
drop policy if exists staff_attendance_logs_select_own on public.staff_attendance_logs;
create policy staff_attendance_logs_select_own
  on public.staff_attendance_logs for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
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

drop policy if exists staff_attendance_logs_insert_own on public.staff_attendance_logs;
create policy staff_attendance_logs_insert_own
  on public.staff_attendance_logs for insert to authenticated
  with check (user_id = auth.uid());

-- No updates/deletes from clients (immutable punches)
revoke update, delete on public.staff_attendance_logs from authenticated;

grant select, insert on public.staff_attendance_logs to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: attendance-selfies (private)
-- Path: {user_id}/{yyyy-mm-dd}/{uuid}.jpg
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-selfies',
  'attendance-selfies',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists attendance_selfies_select_own on storage.objects;
create policy attendance_selfies_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'attendance-selfies'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_role(array['SUPER_ADMIN', 'HQ_ADMIN'])
      or public.has_role(array['BRANCH_ADMIN'])
    )
  );

drop policy if exists attendance_selfies_insert_own on storage.objects;
create policy attendance_selfies_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'attendance-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
