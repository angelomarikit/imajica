-- Client Scheduling → Add Client Schedule modal fields
alter table public.appointments
  add column if not exists booking_date date,
  add column if not exists treatment_name text,
  add column if not exists treatment_name_2 text,
  add column if not exists campaign_promo text,
  add column if not exists promo_code text,
  add column if not exists client_status text,
  add column if not exists clinic text,
  add column if not exists down_payment numeric(12, 2) not null default 0,
  add column if not exists staff_name text,
  add column if not exists lead_source text,
  add column if not exists client_phone text,
  add column if not exists client_email text;

comment on column public.appointments.booking_date is 'Date the booking was taken (VA intake)';
comment on column public.appointments.client_status is 'Schedule card label: New / Pending / Paid / …';
comment on column public.appointments.treatment_name is 'Primary service free-text (when no treatments.id)';
comment on column public.appointments.lead_source is 'Lead channel (Facebook, Walk-In, …)';
