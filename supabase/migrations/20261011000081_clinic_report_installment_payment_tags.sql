-- Clinic report Excel exports often flatten Payment to "Full Payment" while
-- Status=Pending rows are installment lines in the ops UI. Tag those for tracking.
update public.sales
set payment_type = 'Installment Payment'
where lead_source = 'Clinic Report'
  and status = 'pending'
  and coalesce(payment_type, '') not ilike '%installment%';
