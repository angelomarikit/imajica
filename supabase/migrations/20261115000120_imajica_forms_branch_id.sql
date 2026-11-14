-- Imajica Forms: branch UUID + created_by for reliable clinic scoping (Supabase is source of truth).

alter table public.imajica_forms
  add column if not exists branch_id uuid references public.branches (id),
  add column if not exists created_by uuid references public.profiles (id);

create index if not exists imajica_forms_branch_submitted_idx
  on public.imajica_forms (branch_id, submitted_at desc)
  where status = 'active';

create index if not exists imajica_forms_status_submitted_idx
  on public.imajica_forms (status, submitted_at desc);

comment on column public.imajica_forms.branch_id is
  'Clinic branch for generated consent forms; prefer over branch_code text filter.';
comment on column public.imajica_forms.created_by is
  'Staff auth user who generated the form packet.';