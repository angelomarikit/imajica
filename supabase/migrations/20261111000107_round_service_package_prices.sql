-- Round service + package catalog prices to nearest ₱10 (e.g. 2499 → 2500, 2999 → 3000).
-- Products / inventory_items are intentionally unchanged.

update public.treatments
set
  price = round(price / 10) * 10,
  updated_at = now()
where price is not null
  and price <> round(price / 10) * 10;

update public.packages
set
  regular_price = round(regular_price / 10) * 10,
  updated_at = now()
where regular_price is not null
  and regular_price <> round(regular_price / 10) * 10;

update public.packages
set
  promo_price = round(promo_price / 10) * 10,
  updated_at = now()
where promo_price is not null
  and promo_price <> round(promo_price / 10) * 10;

-- Drop stale service/package UI overrides so rounded DB prices win after refresh.
delete from public.catalog_price_overrides
where item_kind in ('service', 'package');
