-- Marketing funnel: ADS → Message → Book → Show up → Buy → Sales (KPI tracking)

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  email text,
  branch_id uuid references public.branches (id),
  source text not null default 'facebook_ads',
  funnel_stage text not null default 'message',
  notes text,
  sale_amount numeric(12,2),
  appointment_id uuid references public.appointments (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_leads_funnel_stage_check check (
    funnel_stage in ('message', 'book', 'show_up', 'buy', 'lost')
  ),
  constraint marketing_leads_source_check check (
    source in (
      'facebook_ads',
      'facebook_groups',
      'instagram',
      'tiktok',
      'website',
      'walk_in',
      'referral',
      'other'
    )
  )
);

create index if not exists marketing_leads_branch_idx on public.marketing_leads (branch_id);
create index if not exists marketing_leads_stage_idx on public.marketing_leads (funnel_stage);
create index if not exists marketing_leads_created_idx on public.marketing_leads (created_at desc);

comment on table public.marketing_leads is
  'Social / ad leads — funnel: message → book → show_up → buy (Marketing KPIs).';

create table if not exists public.marketing_ad_spend (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.branches (id),
  source text not null default 'facebook_ads',
  spend_date date not null default current_date,
  amount numeric(12,2) not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint marketing_ad_spend_source_check check (
    source in (
      'facebook_ads',
      'facebook_groups',
      'instagram',
      'tiktok',
      'other'
    )
  ),
  constraint marketing_ad_spend_amount_nonneg check (amount >= 0)
);

create index if not exists marketing_ad_spend_date_idx on public.marketing_ad_spend (spend_date desc);

comment on table public.marketing_ad_spend is
  'Paid social ad spend — used with message count for Cost per Message (CPM).';

alter table public.marketing_leads enable row level security;
alter table public.marketing_ad_spend enable row level security;

drop policy if exists marketing_leads_access on public.marketing_leads;
create policy marketing_leads_access on public.marketing_leads
  for all to authenticated
  using (public.can_access_marketing())
  with check (public.can_access_marketing());

drop policy if exists marketing_ad_spend_access on public.marketing_ad_spend;
create policy marketing_ad_spend_access on public.marketing_ad_spend
  for all to authenticated
  using (public.can_access_marketing())
  with check (public.can_access_marketing());
