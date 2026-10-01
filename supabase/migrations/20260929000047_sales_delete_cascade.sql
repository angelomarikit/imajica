-- Allow deleting booking sales without orphan FK failures on payments / commissions

alter table public.payments
  drop constraint if exists payments_sale_id_fkey;

alter table public.payments
  add constraint payments_sale_id_fkey
  foreign key (sale_id) references public.sales (id) on delete cascade;

alter table public.commissions
  drop constraint if exists commissions_source_sale_id_fkey;

alter table public.commissions
  add constraint commissions_source_sale_id_fkey
  foreign key (source_sale_id) references public.sales (id) on delete cascade;
