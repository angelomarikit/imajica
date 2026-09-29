-- Catalog Promotions: promo coupons

create table if not exists public.promo_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('fixed', 'percentage')),
  discount_value numeric(12,2) not null default 0,
  service_id uuid references public.treatments (id),
  package_id uuid references public.packages (id),
  branch_id uuid references public.branches (id),
  branch_label text not null default 'All Branches',
  valid_from date not null,
  valid_until date not null,
  new_customers_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until >= valid_from),
  unique (code)
);

create index if not exists promo_coupons_validity_idx
  on public.promo_coupons (valid_from, valid_until);

create index if not exists promo_coupons_branch_idx
  on public.promo_coupons (branch_id);

alter table public.promo_coupons enable row level security;

drop policy if exists promo_coupons_read on public.promo_coupons;
create policy promo_coupons_read on public.promo_coupons
  for select to authenticated using (true);

-- Public landing / booking may validate active codes (read-only for anon active window)
drop policy if exists promo_coupons_anon_active on public.promo_coupons;
create policy promo_coupons_anon_active on public.promo_coupons
  for select to anon
  using (valid_from <= current_date and valid_until >= current_date);

drop policy if exists promo_coupons_write on public.promo_coupons;
create policy promo_coupons_write on public.promo_coupons
  for all using (
    public.is_hq()
    or public.has_role(array['SUPER_ADMIN','HQ_ADMIN','BRANCH_ADMIN','RECEPTIONIST'])
  );

comment on table public.promo_coupons is
  'Catalog Promotions — coupon codes managed from New Coupon / Coupon List';
