-- Replace org catalog with IMAJICA PRODUCT & SERVICES LIST 2026 (all 6 clinics).
-- Soft-deactivate prior active rows, then upsert 2026 products/services/packages/consumables.

alter table public.consumables add column if not exists category_name text;
comment on column public.consumables.category_name is 'Spreadsheet group: Skin Care / Facial / Medical / Clinic Consumables';

update public.treatments set status = 'inactive', updated_at = now() where coalesce(status, 'active') = 'active';
update public.packages set status = 'inactive', updated_at = now() where coalesce(status, 'active') = 'active';
update public.inventory_items set status = 'inactive' where coalesce(is_retail_product, true) = true and coalesce(status, 'active') = 'active';

-- Treatments (services) — available_globally for all clinics
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000001'::uuid, 'CHARCOAL LASER FACIAL', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000002'::uuid, 'PICO LASER FACIAL', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000003'::uuid, 'HYDRAFACIAL', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000004'::uuid, 'OXYBRIGHT DACIAL', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000005'::uuid, 'ACNE CURE FACIAL', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000006'::uuid, 'IMAJICA AQUA FACIAL', '2026 catalog', 30, 999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000007'::uuid, 'IMAJICA CELEBRITY', '2026 catalog', 30, 4499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000008'::uuid, 'IMAJICA CLEAR FACIAL', '2026 catalog', 30, 4499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000009'::uuid, 'CHEST (SYRINGOMA, WARTS, MILLIA, OR SKINTAG)', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000010'::uuid, 'BACK (SYRINGOMA, WARTS, MILLIA, OR SKINTAG)', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000011'::uuid, 'SYRINGOMA REMOVAL', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000012'::uuid, 'SKINTAG REMOVAL', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000013'::uuid, 'WARTS REMOVAL', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000014'::uuid, 'MILLIA REMOVAL', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000015'::uuid, 'UPPER LIP DIODE', '2026 catalog', 30, 499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000016'::uuid, 'FULL FACE DIODE', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000017'::uuid, 'UNDERARM DIODE', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000018'::uuid, 'FULL ARMS DIODE', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000019'::uuid, 'BRAZILLIAN DIODE', '2026 catalog', 30, 1999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000020'::uuid, 'HALF LEGS DIODE', '2026 catalog', 30, 1999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000021'::uuid, 'FULL LEGS DIODE', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000022'::uuid, 'CHARCOAL LASER UNDERARMS', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000023'::uuid, 'CHARCOAL LASER NAPE', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000024'::uuid, 'CHARCOAL LASER ELBOW', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000025'::uuid, 'CHARCOAL LASER KNEE', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000026'::uuid, 'CHARCOAL LASER BUTT', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000027'::uuid, 'CHARCOAL LASER BIKINI', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000028'::uuid, 'CHEMICAL PEELING UNDERARM', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000029'::uuid, 'CHEMICAL PEELING NAPE', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000030'::uuid, 'CHEMICAL PEELING KNEE & ELBOW', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000031'::uuid, 'CHEMICAL PEELING GROIN', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000032'::uuid, 'CHEMICAL PEELING BUTT', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000033'::uuid, 'BACKCIAL', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000034'::uuid, 'VAJACIAL', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000035'::uuid, 'RADIANT GLOW PUSH', '2026 catalog', 30, 499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000036'::uuid, 'IMMUNITY DRIO', '2026 catalog', 30, 1999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000037'::uuid, 'SLENDER DRIP', '2026 catalog', 30, 1999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000038'::uuid, 'AGE REVERSING DRIP', '2026 catalog', 30, 1999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000039'::uuid, 'MULTIVITAMIN DRIP', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000040'::uuid, 'FACE & NECK (EXIPRO)', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000041'::uuid, 'ARMS (EXIPRO)', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000042'::uuid, 'TUMMY (EXIPRO)', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000043'::uuid, 'THIGHS (EXIPRO)', '2026 catalog', 30, 3499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000044'::uuid, 'FACE & NECK (MESO & EXIPRO)', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000045'::uuid, 'ARMS (MESO & EXIPRO)', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000046'::uuid, 'TUMMY (MESO & EXIPRO)', '2026 catalog', 30, 3499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000047'::uuid, 'THIGHS (MESO & EXIPRO)', '2026 catalog', 30, 4499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000048'::uuid, 'LIPOLAB (10ML)', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000049'::uuid, 'KABELLINE (10ML)', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000050'::uuid, 'PINE BOTTLE (10ML)', '2026 catalog', 30, 3999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000051'::uuid, 'LEMON BOTTLE (10ML)', '2026 catalog', 30, 6499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000052'::uuid, 'EMSLIM (30MINS)', '2026 catalog', 30, 1499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000053'::uuid, 'MESOSLIM FACE CONTOUR', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000054'::uuid, 'MESOSLIM ARMS CONTOUR', '2026 catalog', 30, 3499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000055'::uuid, 'MESOSLIM BRALINE CONTOUR', '2026 catalog', 30, 3499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000056'::uuid, 'MESOSLIM LOVE HANDLE CONTOUR', '2026 catalog', 30, 3499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000057'::uuid, 'MESOSLIM TUMMY CONTOUR', '2026 catalog', 30, 3999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000058'::uuid, 'MESOSLIM BUTT CONTOUR', '2026 catalog', 30, 4999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000059'::uuid, 'MESOSLIM BODY CONTOUR', '2026 catalog', 30, 9999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000060'::uuid, 'ULTRAFORMER HIFU', '2026 catalog', 30, 4999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000061'::uuid, 'FULL FACE FRACTIONAL', '2026 catalog', 30, 3999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000062'::uuid, 'HALF ARMS FRACTIONAL', '2026 catalog', 30, 3999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000063'::uuid, 'FULL ARMS FRACTIONAL', '2026 catalog', 30, 6999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000064'::uuid, 'TUMMY FRACTIONAL', '2026 catalog', 30, 6999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000065'::uuid, 'BACK FRACTIONAL', '2026 catalog', 30, 6999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000066'::uuid, 'HALF LEGS FRACTIONAL', '2026 catalog', 30, 7499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000067'::uuid, 'FULL LEGS FRACTIONAL', '2026 catalog', 30, 9999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000068'::uuid, 'MICRONEEDLING', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000069'::uuid, 'SPANISH PEEL', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000070'::uuid, 'TCA PEEL', '2026 catalog', 30, 4999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000071'::uuid, 'PRP VAMPIRE', '2026 catalog', 30, 4999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000072'::uuid, 'SUBCISION', '2026 catalog', 30, 4999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000073'::uuid, 'MESO SCAR DNA', '2026 catalog', 30, 7999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000074'::uuid, 'ACNE FILLER 1ML', '2026 catalog', 30, 9999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000075'::uuid, '2in1 FRACTIONAL & PRP', '2026 catalog', 30, 8999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000076'::uuid, '2in1 SUBCISION AND FILLER', '2026 catalog', 30, 12499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000077'::uuid, '3in1 TCA, FRACTIONAL & PRP', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000078'::uuid, '4in1 SUBCISION, TCA, FRACTIONAL, & PRP', '2026 catalog', 30, 19999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000079'::uuid, '5in1 SUBCISION, TCA, FRACTIONAL, PRP & MESODNA', '2026 catalog', 30, 24999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000080'::uuid, '5in1 SUBCISION, TCA, FRACTIONAL, PRP & REJURAN S', '2026 catalog', 30, 29999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000081'::uuid, 'MESOMELA', '2026 catalog', 30, 7999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000082'::uuid, 'REJURAN HEALER', '2026 catalog', 30, 24999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000083'::uuid, 'REJURAN HB (HYDRATION)', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000084'::uuid, 'REJURAN I (UNDEREYE)', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000085'::uuid, 'REJURAN S (SCARS)', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000086'::uuid, 'CROWNING GLORY', '2026 catalog', 30, 6999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000087'::uuid, 'EYEBROW LIFT BOTOX (10 UNITS)', '2026 catalog', 30, 2500, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000088'::uuid, 'CROWS FEET BOTOX (20 UNITS)', '2026 catalog', 30, 5000, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000089'::uuid, 'FROWN LINES BOTOX (20 UNITS)', '2026 catalog', 30, 5000, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000090'::uuid, 'ALARTOX (20 UNITS)', '2026 catalog', 30, 5000, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000091'::uuid, 'FOREHEAD LINES BOTOX (30 UNITS)', '2026 catalog', 30, 7500, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000092'::uuid, 'JAWTOX (50 UNITS)', '2026 catalog', 30, 12500, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000093'::uuid, 'SWEATOX (50 UNITS)', '2026 catalog', 30, 12500, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000094'::uuid, 'NEURAMIS (HA FILLERS)', '2026 catalog', 30, 9999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000095'::uuid, 'YUVENIS (HA FILLERS)', '2026 catalog', 30, 9999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000096'::uuid, 'JUVEDERM (HA FILLERS)', '2026 catalog', 30, 19999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000097'::uuid, 'PLLA SCULPTRA', '2026 catalog', 30, 29999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000098'::uuid, 'PLLA HIPLA', '2026 catalog', 30, 25000, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000099'::uuid, 'HIKO NOSE THREAD', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000100'::uuid, 'NOSE THREAD', '2026 catalog', 30, 2499, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000101'::uuid, 'FOX EYE THREADS', '2026 catalog', 30, 2999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000102'::uuid, 'COG THREADS', '2026 catalog', 30, 3999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000103'::uuid, 'MONO THREADS', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000104'::uuid, 'PINK GLOW', '2026 catalog', 30, 4999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000105'::uuid, 'NCTF', '2026 catalog', 30, 19999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000106'::uuid, 'LUHILO', '2026 catalog', 30, 24999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000107'::uuid, 'PROFHILO', '2026 catalog', 30, 29999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000108'::uuid, 'ASCE + FOR FACE', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000109'::uuid, 'ASCE + FOR HAIR', '2026 catalog', 30, 14999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000110'::uuid, 'ASCE + FOR INTIMATE', '2026 catalog', 30, 17999, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000111'::uuid, 'IMAJICA CLEAR CHEST', '2026 catalog', 150, 14999, 'active', 5,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000112'::uuid, 'IMAJICA CLEAR BACK', '2026 catalog', 150, 14999, 'active', 5,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000113'::uuid, 'IMAJICA CLEAR CHEST & BACK', '2026 catalog', 150, 24999, 'active', 5,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000114'::uuid, 'IMAJICA BRIGHT UNDERARM', '2026 catalog', 240, 14999, 'active', 8,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000115'::uuid, 'FLAWLESS UNDERARM', '2026 catalog', 300, 14999, 'active', 10,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000116'::uuid, 'IMAJICA REVIVE', '2026 catalog', 150, 24999, 'active', 5,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000117'::uuid, 'IMAJICA MESO DNA', '2026 catalog', 150, 24999, 'active', 5,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000118'::uuid, 'IMAJICA MESOMELA', '2026 catalog', 150, 24999, 'active', 5,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000119'::uuid, 'IMAJICA INTIMATE 1', '2026 catalog', 240, 19999, 'active', 8,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000120'::uuid, 'IMAJICA INTIMATE 2', '2026 catalog', 300, 19999, 'active', 10,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000121'::uuid, 'IMAJICA BUTT WHITENING', '2026 catalog', 300, 21999, 'active', 10,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();
insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  'a2026000-0001-4000-8000-000000000122'::uuid, 'HAPPY HOUR PROMO', '2026 catalog', 30, 2500, 'active', 1,
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();

-- branch_treatments for all 6 clinics
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000002'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000002'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000002'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000002'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000002'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000002'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000004'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000004'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000004'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000004'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000004'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000004'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000005'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000005'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000005'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000005'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000005'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000005'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000007'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000007'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000007'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000007'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000007'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000007'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000008'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000008'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000008'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000008'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000008'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000008'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000009'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000009'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000009'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000009'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000009'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000009'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000010'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000010'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000010'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000010'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000010'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000010'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000011'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000011'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000011'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000011'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000011'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000011'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000012'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000012'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000012'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000012'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000012'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000012'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000013'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000013'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000013'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000013'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000013'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000013'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000014'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000014'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000014'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000014'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000014'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000014'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000015'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000015'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000015'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000015'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000015'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000015'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000016'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000016'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000016'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000016'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000016'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000016'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000017'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000017'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000017'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000017'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000017'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000017'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000018'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000018'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000018'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000018'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000018'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000018'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000019'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000019'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000019'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000019'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000019'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000019'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000020'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000020'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000020'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000020'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000020'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000020'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000021'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000021'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000021'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000021'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000021'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000021'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000022'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000022'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000022'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000022'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000022'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000022'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000023'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000023'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000023'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000023'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000023'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000023'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000024'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000024'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000024'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000024'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000024'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000024'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000025'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000025'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000025'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000025'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000025'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000025'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000026'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000026'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000026'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000026'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000026'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000026'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000027'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000027'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000027'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000027'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000027'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000027'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000028'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000028'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000028'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000028'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000028'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000028'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000029'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000029'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000029'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000029'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000029'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000029'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000030'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000030'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000030'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000030'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000030'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000030'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000031'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000031'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000031'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000031'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000031'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000031'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000032'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000032'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000032'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000032'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000032'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000032'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000033'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000033'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000033'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000033'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000033'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000033'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000034'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000034'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000034'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000034'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000034'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000034'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000035'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000035'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000035'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000035'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000035'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000035'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000036'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000036'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000036'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000036'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000036'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000036'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000038'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000038'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000038'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000038'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000038'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000038'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000041'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000041'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000041'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000041'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000041'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000041'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000042'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000042'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000042'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000042'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000042'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000042'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000043'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000043'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000043'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000043'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000043'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000043'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000044'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000044'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000044'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000044'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000044'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000044'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000045'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000045'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000045'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000045'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000045'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000045'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000046'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000046'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000046'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000046'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000046'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000046'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000047'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000047'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000047'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000047'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000047'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000047'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000048'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000048'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000048'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000048'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000048'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000048'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000049'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000049'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000049'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000049'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000049'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000049'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000050'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000050'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000050'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000050'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000050'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000050'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000053'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000053'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000053'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000053'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000053'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000053'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000054'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000054'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000054'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000054'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000054'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000054'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000055'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000055'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000055'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000055'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000055'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000055'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000057'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000057'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000057'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000057'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000057'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000057'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000058'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000058'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000058'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000058'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000058'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000058'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000059'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000059'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000059'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000059'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000059'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000059'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000060'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000060'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000060'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000060'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000060'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000060'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000061'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000061'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000061'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000061'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000061'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000061'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000062'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000062'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000062'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000062'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000062'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000062'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000063'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000063'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000063'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000063'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000063'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000063'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000064'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000064'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000064'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000064'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000064'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000064'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000065'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000065'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000065'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000065'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000065'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000065'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000066'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000066'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000066'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000066'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000066'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000066'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000067'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000067'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000067'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000067'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000067'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000067'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000068'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000068'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000068'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000068'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000068'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000068'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000069'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000069'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000069'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000069'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000069'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000069'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000070'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000070'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000070'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000070'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000070'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000070'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000071'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000071'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000071'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000071'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000071'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000071'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000072'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000072'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000072'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000072'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000072'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000072'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000073'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000073'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000073'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000073'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000073'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000073'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000074'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000074'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000074'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000074'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000074'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000074'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000075'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000075'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000075'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000075'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000075'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000075'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000076'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000076'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000076'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000076'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000076'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000076'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000077'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000077'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000077'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000077'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000077'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000077'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000078'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000078'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000078'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000078'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000078'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000078'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000079'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000079'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000079'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000079'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000079'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000079'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000080'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000080'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000080'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000080'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000080'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000080'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000081'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000081'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000081'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000081'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000081'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000081'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000082'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000082'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000082'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000082'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000082'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000082'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000083'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000083'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000083'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000083'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000083'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000083'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000084'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000084'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000084'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000084'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000084'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000084'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000085'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000085'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000085'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000085'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000085'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000085'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000086'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000086'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000086'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000086'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000086'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000086'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000087'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000087'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000087'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000087'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000087'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000087'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000088'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000088'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000088'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000088'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000088'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000088'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000089'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000089'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000089'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000089'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000089'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000089'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000090'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000090'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000090'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000090'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000090'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000090'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000091'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000091'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000091'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000091'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000091'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000091'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000092'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000092'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000092'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000092'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000092'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000092'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000093'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000093'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000093'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000093'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000093'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000093'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000094'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000094'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000094'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000094'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000094'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000094'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000095'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000095'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000095'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000095'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000095'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000095'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000096'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000096'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000096'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000096'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000096'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000096'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000097'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000097'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000097'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000097'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000097'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000097'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000098'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000098'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000098'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000098'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000098'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000098'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000099'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000099'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000099'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000099'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000099'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000099'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000100'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000100'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000100'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000100'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000100'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000100'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000101'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000101'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000101'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000101'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000101'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000101'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000102'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000102'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000102'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000102'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000102'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000102'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000103'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000103'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000103'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000103'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000103'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000103'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000104'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000104'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000104'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000104'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000104'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000104'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000105'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000105'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000105'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000105'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000105'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000105'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000106'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000106'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000106'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000106'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000106'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000106'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000107'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000107'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000107'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000107'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000107'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000107'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000108'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000108'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000108'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000108'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000108'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000108'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000109'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000109'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000109'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000109'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000109'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000109'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000110'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000110'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000110'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000110'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000110'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000110'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000111'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000111'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000111'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000111'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000111'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000111'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000112'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000112'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000112'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000112'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000112'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000112'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000113'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000113'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000113'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000113'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000113'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000113'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000114'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000114'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000114'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000114'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000114'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000114'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000115'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000115'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000115'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000115'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000115'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000115'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000116'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000116'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000116'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000116'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000116'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000116'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000117'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000117'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000117'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000117'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000117'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000117'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000118'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000118'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000118'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000118'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000118'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000118'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000119'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000119'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000119'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000119'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000119'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000119'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000120'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000120'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000120'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000120'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000120'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000120'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000121'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000121'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000121'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000121'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000121'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000121'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222201'::uuid, 'a2026000-0001-4000-8000-000000000122'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222202'::uuid, 'a2026000-0001-4000-8000-000000000122'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222203'::uuid, 'a2026000-0001-4000-8000-000000000122'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222204'::uuid, 'a2026000-0001-4000-8000-000000000122'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222205'::uuid, 'a2026000-0001-4000-8000-000000000122'::uuid)
on conflict do nothing;
insert into public.branch_treatments (branch_id, treatment_id)
values ('22222222-2222-2222-2222-222222222206'::uuid, 'a2026000-0001-4000-8000-000000000122'::uuid)
on conflict do nothing;

-- Packages
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000001'::uuid, 'CROWNING GLORY', 'package', 'DHT BLOCKER TREATMENT (2 SESSIONS) + HAIR GROWTH (6 SESSION)', 35000, 8, 6, 'active', 'DHT BLOCKER TREATMENT (2 SESSIONS) + HAIR GROWTH (6 SESSION)', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000002'::uuid, 'SELF LOVE GLOW UP', 'package', '1 AQUA FACIAL + 1 MULTIVITAMIN DRIP + 1 EMSLIM + 1 EXIPRO + 1 DIODE HAIR REMOVAL + 1 LEMON BOTTLE', 12500, 1, 6, 'active', '1 AQUA FACIAL + 1 MULTIVITAMIN DRIP + 1 EMSLIM + 1 EXIPRO + 1 DIODE HAIR REMOVAL + 1 LEMON BOTTLE', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000003'::uuid, 'ULTRA FORMER 12D HIFU', 'package', '1 MESOLIPO FACE + 1 HYDRAFACIAL + 1 MPT W/ COLLAGEN BOOSTER', 9999, 1, 6, 'active', '1 MESOLIPO FACE + 1 HYDRAFACIAL + 1 MPT W/ COLLAGEN BOOSTER', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000004'::uuid, 'MESOSLIM FACE CONTOUR', 'package', '5 MESOLIPO FACE (5ML) + 5 EXIPRO + 5 EMSLIM', 14999, 5, 6, 'active', '5 MESOLIPO FACE (5ML) + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000005'::uuid, 'MESOSLIM ARMS CONTOUR', 'package', '5 MESOLIPO ARMS (5ML) + 5 EXIPRO + 5 EMSLIM', 14999, 5, 6, 'active', '5 MESOLIPO ARMS (5ML) + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000006'::uuid, 'MESOSLIM SEXY BACK CONTOUR', 'package', '5 MESOLIPO BACK (5ML) + 5 EXIPRO + 5 EMSLIM', 15999, 5, 6, 'active', '5 MESOLIPO BACK (5ML) + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000007'::uuid, 'MESOSLIM LOVE HANDLE CONTOUR', 'package', '5 MESOLIPO LOVE HANDLE (5ML) + 5 EXIPRO + 5 EMSLIM', 15999, 5, 6, 'active', '5 MESOLIPO LOVE HANDLE (5ML) + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000008'::uuid, 'MESOSLIM TUMMY CONTOUR', 'package', '5 MESOLIPO TUMMY (5ML) + 5 EXIPRO + 5 EMSLIM', 15999, 5, 6, 'active', '5 MESOLIPO TUMMY (5ML) + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000009'::uuid, 'MESOSLIM LEGS CONTOUR', 'package', '5 MESOLIPO LEGS (5ML) + 5 EXIPRO + 5 EMSLIM', 15999, 5, 6, 'active', '5 MESOLIPO LEGS (5ML) + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000010'::uuid, 'LEMON BOTTLE', 'package', '3 LEMON BOTTLE + 5 EXIPRO + 5 EMSLIM', 15000, 3, 6, 'active', '3 LEMON BOTTLE + 5 EXIPRO + 5 EMSLIM', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000011'::uuid, 'IMAJICA SLIM GLP1', 'package', '4 GLP1 + 4 EMSLIM + 4 EXIPRO', 30000, 4, 6, 'active', '4 GLP1 + 4 EMSLIM + 4 EXIPRO', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000012'::uuid, 'IMMUNITY DRIP 5+1', 'package', '6 DRIP + 1 FREE FACIAL', 10000, 6, 6, 'active', '6 DRIP + 1 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000013'::uuid, 'IMMUNITY DRIP 10+4', 'package', '14 DRIP + 2 FREE FACIAL', 20000, 14, 6, 'active', '14 DRIP + 2 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000014'::uuid, 'IMMUNITY DRIP 15+6', 'package', '21 DRIP + 3 FREE FACIAL', 30000, 21, 6, 'active', '21 DRIP + 3 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000015'::uuid, 'IMMUNITY DRIP 25+10', 'package', '35 DRIP + 4 FREE FACIAL', 50000, 35, 6, 'active', '35 DRIP + 4 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000016'::uuid, 'SLENDER DRIP 5+1', 'package', '6 DRIP + 1 FREE FACIAL', 10000, 6, 6, 'active', '6 DRIP + 1 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000017'::uuid, 'SLENDER DRIP 10+4', 'package', '14 DRIP + 2 FREE FACIAL', 20000, 14, 6, 'active', '14 DRIP + 2 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000018'::uuid, 'SLENDER DRIP 15+6', 'package', '21 DRIP + 3 FREE FACIAL', 30000, 21, 6, 'active', '21 DRIP + 3 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000019'::uuid, 'SLENDER DRIP 25+10', 'package', '35 DRIP + 4 FREE FACIAL', 50000, 35, 6, 'active', '35 DRIP + 4 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000020'::uuid, 'AGE REVERSING DRIP 5+1', 'package', '6 DRIP + 1 FREE FACIAL', 10000, 6, 6, 'active', '6 DRIP + 1 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000021'::uuid, 'AGE REVERSING DRIP 10+4', 'package', '14 DRIP + 2 FREE FACIAL', 20000, 14, 6, 'active', '14 DRIP + 2 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000022'::uuid, 'AGE REVERSING DRIP 15+6', 'package', '21 DRIP + 3 FREE FACIAL', 30000, 21, 6, 'active', '21 DRIP + 3 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000023'::uuid, 'AGE REVERSING DRIP 25+10', 'package', '35 DRIP + 4 FREE FACIAL', 50000, 35, 6, 'active', '35 DRIP + 4 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000024'::uuid, 'MULTIVITAMIN DRIP 5+1', 'package', '6 DRIP + 1 FREE FACIAL', 12500, 6, 6, 'active', '6 DRIP + 1 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000025'::uuid, 'MULTIVITAMIN DRIP 10+5', 'package', '15 DRIP + 2 FREE FACIAL', 25000, 15, 6, 'active', '15 DRIP + 2 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000026'::uuid, 'MULTIVITAMIN DRIP 15+9', 'package', '24 DRIP + 3 FREE FACIAL', 37500, 24, 6, 'active', '24 DRIP + 3 FREE FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();
insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  'a2026000-0002-4000-8000-000000000027'::uuid, 'MULTIVITAMIN DRIP 20+15', 'package', '35 DRIP + 4 FACIAL', 50000, 35, 6, 'active', '35 DRIP + 4 FACIAL', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();

delete from public.package_items where package_id::text like 'a2026000-0002-%';
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000002'::uuid, 'a2026000-0001-4000-8000-000000000006'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000002'::uuid, 'a2026000-0001-4000-8000-000000000039'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000002'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000002'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000002'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000003'::uuid, 'a2026000-0001-4000-8000-000000000003'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000004'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000004'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000005'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000005'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000006'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000006'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000007'::uuid, 'a2026000-0001-4000-8000-000000000056'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000007'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000007'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000008'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000008'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000009'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000009'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000010'::uuid, 'a2026000-0001-4000-8000-000000000051'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000010'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000010'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000011'::uuid, 'a2026000-0001-4000-8000-000000000052'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000011'::uuid, 'a2026000-0001-4000-8000-000000000040'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000012'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000012'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000013'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000013'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000014'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000014'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000015'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000015'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000016'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000016'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000017'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000017'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000018'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000018'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000019'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000019'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000020'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000020'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000021'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000021'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000022'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000022'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000023'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000023'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000024'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000024'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000025'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000025'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000026'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000026'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000027'::uuid, 'a2026000-0001-4000-8000-000000000037'::uuid, 1)
on conflict do nothing;
insert into public.package_items (package_id, treatment_id, quantity)
values ('a2026000-0002-4000-8000-000000000027'::uuid, 'a2026000-0001-4000-8000-000000000001'::uuid, 1)
on conflict do nothing;

-- Retail products (inventory_items)
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000001'::uuid, 'ACNE SET', 'ACN-1001', 'N/A', 1500, 1500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000002'::uuid, 'WHITENING SERUM 15ML', 'WHI-1002', 'N/A', 300, 300, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000003'::uuid, 'ACNE CREAM 10G', 'ACN-1003', 'N/A', 350, 350, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000004'::uuid, 'TEA TREE LIQUID SOAP 60ML', 'TEA-1004', 'N/A', 350, 350, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000005'::uuid, 'QUICK DRY TONER 60ML', 'QUI-1005', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000006'::uuid, 'UNDERARM SET', 'UND-1006', 'N/A', 1500, 1500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000007'::uuid, 'DEO SPRAY 60ML', 'DEO-1007', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000008'::uuid, 'UNDERARM TONER', 'UND-1008', 'N/A', 450, 450, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000009'::uuid, 'GLUTA LIQUID SOAP 30ML', 'GLU-1009', 'N/A', 300, 300, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000010'::uuid, 'UNDERARM CREAM 10G', 'UND-1010', 'N/A', 250, 250, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000011'::uuid, 'WHITENING SET', 'WHI-1011', 'N/A', 1500, 1500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000012'::uuid, 'CLARIFYING TONER', 'CLA-1012', 'N/A', 350, 350, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000013'::uuid, 'WHITENING TONER', 'WHI-1013', 'N/A', 350, 350, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000014'::uuid, 'SUNBLOCK', 'SUN-1014', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000015'::uuid, 'NIGHT CREAM (3)', 'NIG-1015', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000016'::uuid, 'NIGHT CREAM (4)', 'NIG-1016', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000017'::uuid, 'MOISTURIZING SOAP', 'MOI-1017', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000018'::uuid, 'MELASMA SET', 'MEL-1018', 'N/A', 1500, 1500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000019'::uuid, 'MELA TONER 60ML', 'MEL-1019', 'N/A', 400, 400, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000020'::uuid, 'OATMEAL SOAP', 'OAT-1020', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000021'::uuid, 'MELA SERUM 20ML', 'MEL-1021', 'N/A', 300, 300, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000022'::uuid, 'MELA CREAM 10G', 'MEL-1022', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000023'::uuid, 'TINTED SUNBLOCK 10G', 'TIN-1023', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000024'::uuid, 'MELA DERM 10G', 'MEL-1024', 'N/A', 200, 200, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000025'::uuid, 'GUAVA SERUM', 'GUA-1025', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000026'::uuid, 'NIACINAMIDE SERUM', 'NIA-1026', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000027'::uuid, 'VITAMIN C', 'VIT-1027', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000028'::uuid, 'UNDERARM SERUM', 'UND-1028', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000029'::uuid, 'ANTI MELASMA SERUM', 'ANT-1029', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000030'::uuid, 'SUNSCREEN MIST', 'SUN-1030', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000031'::uuid, 'SUNSCREEN GEL', 'SUN-1031', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000032'::uuid, 'TINTED SUNCREEN', 'TIN-1032', 'N/A', 600, 600, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000033'::uuid, 'NIACINAMIDE CLEANSER 75ML', 'NIA-1033', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000034'::uuid, 'CRYSTAL SOAP 75ML', 'CRY-1034', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000035'::uuid, 'TEA TREE LIQUID SOAP 75ML', 'TEA-1035', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000036'::uuid, 'NIACINAMIDE TONER', 'NIA-1036', 'N/A', 350, 350, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;
insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  'a2026000-0003-4000-8000-000000000037'::uuid, 'ANTI INFLAMMATORY (HYDROCORTISONE)', 'ANT-1037', 'N/A', 500, 500, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;

-- Consumables
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000001'::uuid, 'ANTI MELASMA SERUM 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000002'::uuid, 'ACNE CREAM 500G', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000003'::uuid, '10CC SYRINGE 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000004'::uuid, 'ALCOHOL 1GALON', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000005'::uuid, 'GUAVA SERUM 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000006'::uuid, 'ALOEVERA GEL', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000007'::uuid, '1CC SYRINGE 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000008'::uuid, 'BED SHEET (WHITE)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000009'::uuid, 'NIACINAMIDE CLEANSER 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000010'::uuid, 'ANESTHETIC CREAM', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000011'::uuid, '32G NEEDLE 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000012'::uuid, 'CENTRIFUGE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000013'::uuid, 'NIACINAMIDE SERUM 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000014'::uuid, 'BB BLUSH', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000015'::uuid, '34G NEEDLE 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000016'::uuid, 'COTTON', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000017'::uuid, 'NIACINAMIDE TONER 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000018'::uuid, 'BB FOUNDATION ( MESO WHITE )', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000019'::uuid, '42 PIN MICRONEEDLING 10PCS/SET', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000020'::uuid, 'EXILIS PATCH', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000021'::uuid, 'SUNSCREEN GEL 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000022'::uuid, 'BIOAQUA FACIAL MASK SHEET', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000023'::uuid, '5CC NEEDLE 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000024'::uuid, 'FACE MASK (PER BOX)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000025'::uuid, 'SUNSCREEN MIST 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000026'::uuid, 'BLEACHING CREAM 500G', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000027'::uuid, 'ASCE', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000028'::uuid, 'GLOVES (M)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000029'::uuid, 'TEA TREE CLEANSER 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000030'::uuid, 'CARBON GEL', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000031'::uuid, 'BIOSKIN (COLLAGEN DRIP)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000032'::uuid, 'GLOVES (S)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000033'::uuid, 'TINTED SUNCREEN', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000034'::uuid, 'CARBON GEL BRUSH', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000035'::uuid, 'BLOOD COLLECTION (PLASMA)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000036'::uuid, 'INDEXCARD', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000037'::uuid, 'UNDERARM SERUM 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000038'::uuid, 'CAUTERY PIN 10PCS', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000039'::uuid, 'BUTTERFLY NEEDLE', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000040'::uuid, 'LINEN', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000041'::uuid, 'VITAMIN C SERUM 1L', 0, 4, 0, null, 'Global', 'SKIN CARE', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000042'::uuid, 'CENTELLA MUD CREAM (8PCS/BOX)', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000043'::uuid, 'CANNULA 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000044'::uuid, 'MICRODERMABRASION FILTER ROUND (FOR DIAMOND PEEL)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000045'::uuid, 'ELECTRIC SHAVER', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000046'::uuid, 'CARTINEX (L-CARNATINE)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000047'::uuid, 'MICROPORE (PER BOX)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000048'::uuid, 'ERY+HYDROCORTISONE', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000049'::uuid, 'SHIRAYUKI', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000050'::uuid, 'PAPER BAG (MOST GREEN) 10PCS/SET', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000051'::uuid, 'EYE MASK', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000052'::uuid, 'GAUZE SWABS', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000053'::uuid, 'PAPER CUP', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000054'::uuid, 'FACIAL SCRUB 1L', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000055'::uuid, 'HYRONT (MESO DNA)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000056'::uuid, 'SEAT COVER (GREEN)', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000057'::uuid, 'FACIAL SOAP 1L', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000058'::uuid, 'KABELLINE', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000059'::uuid, 'SOFT BLANKET ( GREEN )', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000060'::uuid, 'GOLD POWDER MASK', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000061'::uuid, 'KANOLONE', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000062'::uuid, 'SPONGE PINK / VIOLET', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000063'::uuid, 'MAGIC PEEL 500G', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000064'::uuid, 'LEMON BOTTLE', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000065'::uuid, 'SPRAY BOTTLE FOR ALCOHOL', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000066'::uuid, 'NEE BRIGHT ( OXYGENEO )', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000067'::uuid, 'LIPO LAB BODY BROWN', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000068'::uuid, 'STEAMER', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000069'::uuid, 'PLASTIC MASK', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000070'::uuid, 'LIPO LAB WHITE (FACE)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000071'::uuid, 'STOOL CHAIR', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000072'::uuid, 'PRE-PEEL 500G', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000073'::uuid, 'LIPORASE 10PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000074'::uuid, 'TAPE MEASURE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000075'::uuid, 'PRICKER', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000076'::uuid, 'LUCIA', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000077'::uuid, 'THROW PILLOW', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000078'::uuid, 'SEAWEED PEEL-OFF MASK 500G', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000079'::uuid, 'MACROSET', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000080'::uuid, 'TIMER', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000081'::uuid, 'SPANISH PEEL 100ML', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000082'::uuid, 'ETHERIUM (JAPAN)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000083'::uuid, 'TISSUE PER PACK', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000084'::uuid, 'SPATULA', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000085'::uuid, 'PINK GLOW', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000086'::uuid, 'TRASHBAG LARGE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000087'::uuid, 'SPONGE', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000088'::uuid, 'PNSS 100PCS/BOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000089'::uuid, 'TRASHBAG SMALL', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000090'::uuid, 'TISSUE', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000091'::uuid, 'RED CELL', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000092'::uuid, 'TRASHBAG XL', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000093'::uuid, 'TRU-GEL 10PCS', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000094'::uuid, 'REJURAN', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000095'::uuid, 'UV STERILIZER DISINFECTION CABINET', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000096'::uuid, 'UA SWEATING SOLUTION TO 500ML', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000097'::uuid, 'RENTOX', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000098'::uuid, '1G SOLAIRE HUMIDIFIER', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000099'::uuid, 'VACUUM GLASS', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000100'::uuid, 'ROUND NANO 10PCS/SET', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000101'::uuid, '1G SHANGRI-LA HUMIDIFER', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000102'::uuid, 'VAMPIRE POWDER MASK', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000103'::uuid, 'SUREGUARD NEEDLE G30 (HYPODERMIC)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000104'::uuid, '1L GREEN TEA', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000105'::uuid, 'WHITE THIN BRUSH', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000106'::uuid, 'TCA CHEMICAL PEELING', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000107'::uuid, 'HEADBAND', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000108'::uuid, 'WHITENING SCRUB', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000109'::uuid, 'TOURNIQUET RUBBER', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000110'::uuid, 'GARTERIZED BODY TOWEL', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000111'::uuid, 'WIPES', 0, 4, 0, null, 'Global', 'FACIAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000112'::uuid, 'VITAMIN C (DRIP)', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000113'::uuid, 'HEAD TOWEL', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000114'::uuid, 'TIRZEPATIDE GLP1', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000115'::uuid, 'CLEAR SERUM BOTTLE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000116'::uuid, 'LIP BOOSTER', 0, 4, 0, null, 'Global', 'MEDICAL CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000117'::uuid, 'AMBER GLASS BOTTLE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000118'::uuid, 'GEL PUMP BOTTLE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000119'::uuid, 'BONTON SPRAY BOTTLE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000120'::uuid, 'CLEANSER BOTTLE', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  'a2026000-0004-4000-8000-000000000121'::uuid, 'RECEIPT', 0, 4, 0, null, 'Global', 'CLINIC CONSUMABLES', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();
