-- San Mateo + Lipa: same Cash on Hand carry start as Pasig/Cainta (from 2026-11-13).

insert into public.branch_cash_on_hand_epochs (branch_id, epoch_date)
select id, '2026-11-13'::date
from public.branches
where id = '22222222-2222-2222-2222-222222222201'::uuid
   or code = 'BR01'
on conflict (branch_id) do update
  set epoch_date = excluded.epoch_date,
      updated_at = now();

insert into public.branch_cash_on_hand_epochs (branch_id, epoch_date)
select id, '2026-11-13'::date
from public.branches
where id = '22222222-2222-2222-2222-222222222204'::uuid
   or code = 'BR04'
on conflict (branch_id) do update
  set epoch_date = excluded.epoch_date,
      updated_at = now();