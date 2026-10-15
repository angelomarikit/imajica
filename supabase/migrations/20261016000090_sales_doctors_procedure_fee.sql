-- Doctor's Procedure: outsourced doctor earns 20%; clinic net sale is 80%.
-- Customer still pays full total_amount; fee fields track the split.

alter table public.sales
  add column if not exists is_doctors_procedure boolean not null default false;

alter table public.sales
  add column if not exists doctor_fee_amount numeric(12, 2) not null default 0;

alter table public.sales
  add column if not exists clinic_net_amount numeric(12, 2);

comment on column public.sales.is_doctors_procedure is
  'When true, outsourced doctor fee is 20% of order; clinic_net_amount is 80%. Customer still pays total_amount.';

comment on column public.sales.doctor_fee_amount is
  'Amount payable to outsourced doctor (typically 20% of order total).';

comment on column public.sales.clinic_net_amount is
  'Clinic net sale after doctor fee; null/legacy rows use total_amount.';

create index if not exists sales_doctors_procedure_idx
  on public.sales (branch_id, created_at desc)
  where is_doctors_procedure = true;
