-- Denormalize checkout tenders on sales so every device reads the same payment labels
-- even when payments child rows fail to embed under RLS batch loads.

alter table public.sales
  add column if not exists payment_methods text[];

comment on column public.sales.payment_methods is
  'Tender at checkout: cash | credit_card | debit_card | qr_ph | owners_account | …; split = multiple values.';

update public.sales s
set payment_methods = sub.methods
from (
  select
    p.sale_id,
    array_agg(distinct trim(p.payment_method) order by trim(p.payment_method)) as methods
  from public.payments p
  where coalesce(trim(p.payment_method), '') <> ''
  group by p.sale_id
) sub
where s.id = sub.sale_id
  and (s.payment_methods is null or cardinality(s.payment_methods) = 0);