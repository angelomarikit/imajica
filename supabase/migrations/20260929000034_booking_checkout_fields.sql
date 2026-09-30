-- Booking checkout: referral, doctor, reward points, payment method labels

alter table public.sales
  add column if not exists referred_by_client_id uuid references public.clients (id),
  add column if not exists referred_by_name text,
  add column if not exists doctor_id uuid references public.staff (id),
  add column if not exists doctor_name text,
  add column if not exists staff_name text,
  add column if not exists lead_source text;

comment on column public.sales.referred_by_client_id is
  'Optional referring customer (earns reward points on first-time patient referral)';
comment on column public.sales.doctor_id is
  'Optional attending doctor (staff.role DOCTOR) on booking checkout';
comment on column public.sales.payment_type is
  'Full Payment | Installment | Installment (Downpayment) | Installment Payment | Split Payment | Partial';
comment on column public.sales.lead_source is
  'Lead channel captured at booking checkout (Walk-in, Facebook, …)';

alter table public.clients
  add column if not exists reward_points int not null default 0;

comment on column public.clients.reward_points is
  'Loyalty / referral reward points balance';

comment on column public.payments.payment_method is
  'cash | credit_card | debit_card | qr_ph | owners_account | paymongo | bank_transfer | gcash | paymaya | other';

-- Expand fee helper for debit_card / qr_ph / owners_account
create or replace function public.imajica_transaction_fee(
  p_method text,
  p_amount numeric
) returns numeric
language sql
immutable
as $$
  select case
    when lower(coalesce(p_method, '')) in ('credit_card', 'debit_card', 'card') then
      round(coalesce(p_amount, 0) * 0.03, 2)
    when lower(coalesce(p_method, '')) in ('gcash', 'paymaya', 'paymongo', 'qrph', 'qr_ph') then
      15.00
    else 0.00
  end;
$$;

comment on function public.imajica_transaction_fee(text, numeric) is
  'Transaction fee: CC/Debit 3%, GCash/PayMaya/PayMongo/QR PH ₱15 flat; cash/owners_account 0';
