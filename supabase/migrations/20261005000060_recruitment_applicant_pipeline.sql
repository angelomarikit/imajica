-- Recruitment pipeline: richer applicant statuses + stage history timeline
-- Stages: applied → initial interview → technical → final → offer → hired (or rejected/withdrawn)

-- Remap legacy statuses before tightening the check constraint
update public.recruitment_applicants
set status = case status
  when 'interview' then 'initial_interview'
  when 'screening' then 'screening'
  else status
end
where status in ('interview', 'screening');

alter table public.recruitment_applicants
  drop constraint if exists recruitment_applicants_status_check;

alter table public.recruitment_applicants
  add constraint recruitment_applicants_status_check
  check (status in (
    'applied',
    'screening',
    'initial_interview',
    'technical_interview',
    'final_interview',
    'offer',
    'hired',
    'rejected',
    'withdrawn'
  ));

alter table public.recruitment_applicants
  add column if not exists source text,
  add column if not exists current_stage text,
  add column if not exists stage_notes text;

-- Keep current_stage aligned with status for display
update public.recruitment_applicants
set current_stage = status
where current_stage is null;

alter table public.recruitment_applicants
  alter column current_stage set default 'applied';

create table if not exists public.recruitment_stage_events (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references public.recruitment_applicants (id) on delete cascade,
  stage text not null,
  status text not null,
  note text,
  scheduled_at date,
  completed_at timestamptz,
  created_by uuid references public.profiles (id),
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists recruitment_stage_events_applicant_idx
  on public.recruitment_stage_events (applicant_id, created_at desc);

comment on table public.recruitment_stage_events is
  'Timeline of recruitment process steps for each applicant';

alter table public.recruitment_stage_events enable row level security;

grant select, insert, update, delete on public.recruitment_applicants to authenticated;
grant select, insert, update, delete on public.recruitment_stage_events to authenticated;

drop policy if exists recruitment_stage_events_read on public.recruitment_stage_events;
create policy recruitment_stage_events_read on public.recruitment_stage_events
  for select to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

drop policy if exists recruitment_stage_events_write on public.recruitment_stage_events;
create policy recruitment_stage_events_write on public.recruitment_stage_events
  for all to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']))
  with check (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

-- People-ops already covered for applicants in 000052; reaffirm stage table access.
drop policy if exists recruitment_applicants_read on public.recruitment_applicants;
create policy recruitment_applicants_read on public.recruitment_applicants
  for select to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));

drop policy if exists recruitment_applicants_write on public.recruitment_applicants;
create policy recruitment_applicants_write on public.recruitment_applicants
  for all to authenticated
  using (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']))
  with check (public.is_people_ops() or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN']));
