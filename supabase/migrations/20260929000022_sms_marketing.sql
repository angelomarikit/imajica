-- SMS marketing campaigns + per-recipient send log (Semaphore)

alter table public.marketing_campaigns
  add column if not exists message_body text,
  add column if not exists sender_name text,
  add column if not exists recipient_count int default 0,
  add column if not exists credits_estimated int default 0,
  add column if not exists credits_used int default 0,
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text;

comment on column public.marketing_campaigns.channel is 'sms | email';
comment on column public.marketing_campaigns.status is 'draft | scheduled | sending | sent | partial | failed | active | completed';

create table if not exists public.sms_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.marketing_campaigns (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  phone text not null,
  semaphore_message_id text,
  status text not null default 'pending',
  network text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sms_campaign_recipients_campaign_idx
  on public.sms_campaign_recipients (campaign_id);

create index if not exists sms_campaign_recipients_phone_idx
  on public.sms_campaign_recipients (campaign_id, phone);

alter table public.sms_campaign_recipients enable row level security;

-- Staff / HQ can manage campaigns
drop policy if exists marketing_campaigns_staff on public.marketing_campaigns;
create policy marketing_campaigns_staff on public.marketing_campaigns
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','HQ_ADMIN','SUPER_ADMIN','STAFF'])
  );

drop policy if exists sms_campaign_recipients_staff on public.sms_campaign_recipients;
create policy sms_campaign_recipients_staff on public.sms_campaign_recipients
  for all using (
    public.is_hq()
    or public.has_role(array['BRANCH_ADMIN','RECEPTIONIST','HQ_ADMIN','SUPER_ADMIN','STAFF'])
  );
