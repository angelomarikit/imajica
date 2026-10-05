-- HR Training materials library (upload + assign to all or selected employees)

create table if not exists public.training_materials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'General',
  file_name text,
  file_url text,
  file_mime text,
  file_size bigint,
  audience text not null default 'all'
    check (audience in ('all', 'selected')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_materials_status_idx
  on public.training_materials (status, updated_at desc);

create index if not exists training_materials_audience_idx
  on public.training_materials (audience);

comment on table public.training_materials is
  'HR Training — uploaded materials that can be shown to all or selected employees';

create table if not exists public.training_material_assignees (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.training_materials (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (material_id, profile_id)
);

create index if not exists training_material_assignees_profile_idx
  on public.training_material_assignees (profile_id);

create index if not exists training_material_assignees_material_idx
  on public.training_material_assignees (material_id);

alter table public.training_materials enable row level security;
alter table public.training_material_assignees enable row level security;

grant select, insert, update, delete on public.training_materials to authenticated;
grant select, insert, update, delete on public.training_material_assignees to authenticated;

-- HR / HQ manage catalog; staff can read published materials assigned to them or audience=all
drop policy if exists training_materials_read on public.training_materials;
create policy training_materials_read on public.training_materials
  for select to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    or (
      status = 'published'
      and (
        audience = 'all'
        or exists (
          select 1 from public.training_material_assignees a
          where a.material_id = training_materials.id
            and a.profile_id = auth.uid()
        )
      )
    )
  );

drop policy if exists training_materials_write on public.training_materials;
create policy training_materials_write on public.training_materials
  for all to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']))
  with check (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

drop policy if exists training_material_assignees_read on public.training_material_assignees;
create policy training_material_assignees_read on public.training_material_assignees
  for select to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    or profile_id = auth.uid()
  );

drop policy if exists training_material_assignees_write on public.training_material_assignees;
create policy training_material_assignees_write on public.training_material_assignees
  for all to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']))
  with check (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

-- Also allow people-ops on legacy LMS tables
drop policy if exists lms_courses_write on public.lms_courses;
create policy lms_courses_write on public.lms_courses
  for all to authenticated
  using (
    public.is_people_ops()
    or public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  )
  with check (
    public.is_people_ops()
    or public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

drop policy if exists lms_enrollments_write on public.lms_enrollments;
create policy lms_enrollments_write on public.lms_enrollments
  for all to authenticated
  using (
    public.is_people_ops()
    or public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  )
  with check (
    public.is_people_ops()
    or public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-materials',
  'training-materials',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists training_materials_storage_select on storage.objects;
create policy training_materials_storage_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'training-materials'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
      or public.has_role(array['DOCTOR','NURSE','AESTHETICIAN','RECEPTIONIST','STAFF'])
    )
  );

drop policy if exists training_materials_storage_insert on storage.objects;
create policy training_materials_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'training-materials'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists training_materials_storage_update on storage.objects;
create policy training_materials_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'training-materials'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  )
  with check (
    bucket_id = 'training-materials'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists training_materials_storage_delete on storage.objects;
create policy training_materials_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'training-materials'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );
