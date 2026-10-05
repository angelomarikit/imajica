-- HR Resignation / Exits: exit interview + turnover clearance checklist

create table if not exists public.employee_exits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete set null,
  staff_id uuid references public.staff (id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  job_title text,
  branch_id uuid references public.branches (id),
  resignation_date date not null default current_date,
  last_working_day date,
  reason text,
  reason_notes text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'cleared', 'cancelled')),
  -- Exit interview answers
  exit_interview jsonb not null default '{}'::jsonb,
  -- Turnover / clearance checklist (same shape as new_hires.checklist)
  checklist jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists employee_exits_status_idx
  on public.employee_exits (status, resignation_date desc);

create index if not exists employee_exits_branch_idx
  on public.employee_exits (branch_id);

create index if not exists employee_exits_profile_idx
  on public.employee_exits (profile_id);

comment on table public.employee_exits is
  'HR Resignation / Exits — exit interview + turnover clearance checklist in one record';

alter table public.employee_exits enable row level security;

grant select, insert, update, delete on public.employee_exits to authenticated;

drop policy if exists employee_exits_read on public.employee_exits;
create policy employee_exits_read on public.employee_exits
  for select to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

drop policy if exists employee_exits_write on public.employee_exits;
create policy employee_exits_write on public.employee_exits
  for all to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']))
  with check (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

-- Private storage for exit / clearance documents
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exit-docs',
  'exit-docs',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'image/heic',
    'image/heif'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists exit_docs_select on storage.objects;
create policy exit_docs_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'exit-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists exit_docs_insert on storage.objects;
create policy exit_docs_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'exit-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists exit_docs_update on storage.objects;
create policy exit_docs_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'exit-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  )
  with check (
    bucket_id = 'exit-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );

drop policy if exists exit_docs_delete on storage.objects;
create policy exit_docs_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'exit-docs'
    and (
      public.is_people_ops()
      or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
    )
  );
