-- Clinic report Excel exports often flatten Payment to "Full Payment".
-- Ops UI distinguishes Installment Payment vs Installment (Downpayment).
-- Apply exact tags from the Bacoor/Dasma Oct 1–11 clinic report.

with fixes(name_key, item_key, payment_type) as (
  values
    ('jermainedellosa', 'imajicapremium', 'Installment Payment'),
    ('jocelynnarvasa', 'imajicapremium', 'Installment (Downpayment)'),
    ('abigailalejado', 'vampirefacialprp', 'Installment (Downpayment)'),
    ('mariaisabelmedino', 'multivitaminsdrip51', 'Installment Payment'),
    ('jhoannejasmin', 'vampirefacialprp', 'Installment Payment'),
    ('jeannelcaramba', 'vampirefacialprp', 'Installment (Downpayment)'),
    ('judithgabriellatorres', 'flawlessunderarm', 'Installment (Downpayment)'),
    ('velbenipayo', 'imajicaclearpackage', 'Installment (Downpayment)'),
    ('evangelicalgruta', 'vampirefacialprp', 'Installment (Downpayment)')
)
update public.sales s
set payment_type = f.payment_type
from public.clients c, public.sale_items si, fixes f
where s.client_id = c.id
  and si.sale_id = s.id
  and s.lead_source = 'Clinic Report'
  and regexp_replace(lower(c.full_name), '[^a-z0-9]', '', 'g') = f.name_key
  and regexp_replace(lower(si.name), '[^a-z0-9]', '', 'g') = f.item_key;

-- Any remaining pending Clinic Report rows without an installment tag
update public.sales
set payment_type = 'Installment Payment'
where lead_source = 'Clinic Report'
  and status = 'pending'
  and coalesce(payment_type, '') not ilike '%installment%';
