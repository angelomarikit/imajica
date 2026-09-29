-- Clients: middle name for booking patient registration modal
alter table public.clients
  add column if not exists middle_name text;

comment on column public.clients.middle_name is 'Optional middle name from Booking Select Patient / New Patient form';
