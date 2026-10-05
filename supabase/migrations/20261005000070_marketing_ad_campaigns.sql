-- Facebook-style ad campaigns: named creatives + manual performance metrics
alter table public.marketing_ad_spend
  add column if not exists name text,
  add column if not exists status text not null default 'active',
  add column if not exists end_date date,
  add column if not exists impressions integer not null default 0,
  add column if not exists reach integer not null default 0,
  add column if not exists clicks integer not null default 0,
  add column if not exists messages integer not null default 0,
  add column if not exists clients integer not null default 0;

update public.marketing_ad_spend
set name = coalesce(nullif(trim(notes), ''), initcap(replace(source, '_', ' ')) || ' campaign')
where name is null or trim(name) = '';

alter table public.marketing_ad_spend
  alter column name set not null;

alter table public.marketing_ad_spend
  drop constraint if exists marketing_ad_spend_status_check;

alter table public.marketing_ad_spend
  add constraint marketing_ad_spend_status_check check (
    status in ('active', 'paused', 'completed')
  );

alter table public.marketing_ad_spend
  drop constraint if exists marketing_ad_spend_metrics_nonneg;

alter table public.marketing_ad_spend
  add constraint marketing_ad_spend_metrics_nonneg check (
    impressions >= 0
    and reach >= 0
    and clicks >= 0
    and messages >= 0
    and clients >= 0
  );

create index if not exists marketing_ad_spend_clients_idx
  on public.marketing_ad_spend (clients desc, amount desc);

comment on table public.marketing_ad_spend is
  'Named social ad campaigns — manual spend + FB-style metrics (impressions, reach, clicks, messages, clients) for ranking best ads.';

comment on column public.marketing_ad_spend.name is
  'Campaign name so owners can tell which creative drives the most clients.';
