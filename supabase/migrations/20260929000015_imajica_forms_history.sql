-- Generated consent / clinic forms history (Administration → Forms → Imajica Forms)

alter table public.imajica_forms
  add column if not exists client_name text,
  add column if not exists form_type text,
  add column if not exists template_file text,
  add column if not exists branch_code text,
  add column if not exists field_values jsonb not null default '{}'::jsonb,
  add column if not exists client_signature_path text,
  add column if not exists other_signature_path text,
  add column if not exists submitted_at timestamptz default now();

create index if not exists imajica_forms_client_idx
  on public.imajica_forms (client_name);

create index if not exists imajica_forms_submitted_idx
  on public.imajica_forms (submitted_at desc);

comment on table public.imajica_forms is
  'Generated consent/clinic forms with field payloads and signature storage paths';
