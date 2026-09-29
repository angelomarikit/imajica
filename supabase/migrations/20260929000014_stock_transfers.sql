-- Stock Transfers (Branch Transfers) — expand stub + item line fields

alter table public.stock_transfers
  add column if not exists item_type text,
  add column if not exists item_id uuid,
  add column if not exists item_name text,
  add column if not exists quantity numeric(12,2) not null default 0,
  add column if not exists performed_by text,
  add column if not exists transfer_date date default current_date,
  add column if not exists remarks text;

-- Align status with completed transfers (logs are post-perform)
alter table public.stock_transfers drop constraint if exists stock_transfers_status_check;
alter table public.stock_transfers
  add constraint stock_transfers_status_check
  check (status in ('draft', 'completed', 'cancelled'));

create index if not exists stock_transfers_date_idx
  on public.stock_transfers (transfer_date desc);

create index if not exists stock_transfers_branches_idx
  on public.stock_transfers (from_branch_id, to_branch_id);

comment on table public.stock_transfers is
  'Branch-to-branch stock transfer history log (Operations → Stock Transfers)';
