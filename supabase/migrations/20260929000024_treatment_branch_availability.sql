-- Multi-branch availability for catalog services (treatments)
-- Per-branch rows: public.branch_treatments
-- Global flag: available across all current and future branches

alter table public.treatments
  add column if not exists available_globally boolean not null default false;

comment on column public.treatments.available_globally is
  'When true, service is available at all branches; otherwise use branch_treatments';
