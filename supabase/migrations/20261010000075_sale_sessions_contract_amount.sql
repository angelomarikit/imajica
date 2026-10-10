-- Migration profile fidelity: session progress on sale lines + installment contract total on sales.
-- Used when importing franchise customer history (availed services / installment balances).

alter table public.sales
  add column if not exists contract_amount numeric(12, 2);

comment on column public.sales.contract_amount is
  'Installment contract / package total when payment_type is installment; remaining = contract_amount - sum(payments).';

alter table public.sale_items
  add column if not exists sessions_total integer,
  add column if not exists sessions_completed integer;

comment on column public.sale_items.sessions_total is
  'Entitlement sessions for imported / package lines (profile Availed Services).';
comment on column public.sale_items.sessions_completed is
  'Completed sessions toward sessions_total.';
