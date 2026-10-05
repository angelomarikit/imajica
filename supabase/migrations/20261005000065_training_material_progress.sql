-- Employee training completion progress (HR assigns materials; staff mark finished)

create table if not exists public.training_material_progress (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.training_materials (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'assigned'
    check (status in ('assigned', 'in_progress', 'completed')),
  started_at timestamptz,
  completed_at timestamptz,
  note text,
  updated_at timestamptz not null default now(),
  unique (material_id, profile_id)
);

create index if not exists training_material_progress_profile_idx
  on public.training_material_progress (profile_id, status);

create index if not exists training_material_progress_material_idx
  on public.training_material_progress (material_id, status);

comment on table public.training_material_progress is
  'Per-employee status for assigned / org-wide training materials';

alter table public.training_material_progress enable row level security;

grant select, insert, update, delete on public.training_material_progress to authenticated;

drop policy if exists training_material_progress_read on public.training_material_progress;
create policy training_material_progress_read on public.training_material_progress
  for select to authenticated
  using (
    profile_id = auth.uid()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

drop policy if exists training_material_progress_insert_own on public.training_material_progress;
create policy training_material_progress_insert_own on public.training_material_progress
  for insert to authenticated
  with check (
    profile_id = auth.uid()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

drop policy if exists training_material_progress_update_own on public.training_material_progress;
create policy training_material_progress_update_own on public.training_material_progress
  for update to authenticated
  using (
    profile_id = auth.uid()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  )
  with check (
    profile_id = auth.uid()
    or public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );

drop policy if exists training_material_progress_delete_ops on public.training_material_progress;
create policy training_material_progress_delete_ops on public.training_material_progress
  for delete to authenticated
  using (
    public.is_people_ops()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN'])
  );
