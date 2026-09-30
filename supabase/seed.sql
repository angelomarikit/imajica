-- Seed for local / fresh Supabase projects
-- Consent form templates live in the React app (src/constants/imajicaFormTemplates.ts), not SQL.
-- Team login accounts (Auth + profiles + user_roles): migration 20260929000035_seed_team_user_accounts.sql
-- Credentials: docs/TEAM_ACCOUNT_CREDENTIALS.md (password Imajica123).

-- Required treatment taxonomy (catalog FK / filters)
insert into public.treatment_categories (id, name) values
  ('facial', 'Facial'),
  ('skin', 'Skin'),
  ('body', 'Body'),
  ('injectables', 'Injectables'),
  ('wellness', 'Wellness'),
  ('laser', 'Laser'),
  ('others', 'Others')
on conflict (id) do nothing;

-- Imajica branch directory (company-owned, franchise, warehouse)
-- HQ sentinel (00000000-0000-0000-0000-000000000001) is created in migration 000023
insert into public.branches (
  id, name, code, address, phone, email, status, is_main, branch_type,
  treatment_rooms, consultation_rooms, waiting_areas, parking_available
)
values
  (
    '22222222-2222-2222-2222-222222222201'::uuid,
    'San Mateo, Rizal', 'BR01',
    '2F RSJ Building, 67 Gen. Luna St., Ampid 1, San Mateo, Rizal',
    null, null, 'active', true, 'company_owned', 0, 0, 0, false
  ),
  (
    '22222222-2222-2222-2222-222222222202'::uuid,
    'Cainta, Rizal', 'BR02',
    'Unit 2-4 Clean Fuel Felix Station, Felix Ave, San Isidro, Cainta, Rizal',
    null, null, 'active', false, 'company_owned', 0, 0, 0, false
  ),
  (
    '22222222-2222-2222-2222-222222222203'::uuid,
    'Pasig City', 'BR03',
    'F Origin Bldg 9544 C Raymundo Ave., Brgy. Caniogan, Pasig City',
    null, null, 'active', false, 'company_owned', 0, 0, 0, false
  ),
  (
    '22222222-2222-2222-2222-222222222204'::uuid,
    'Lipa, Batangas', 'BR04',
    'Lipa, Batangas',
    null, null, 'active', false, 'company_owned', 0, 0, 0, false
  ),
  (
    '22222222-2222-2222-2222-222222222205'::uuid,
    'Dasmariñas, Cavite', 'FR01',
    'Dasmariñas, Cavite',
    null, null, 'active', false, 'franchise', 0, 0, 0, false
  ),
  (
    '22222222-2222-2222-2222-222222222206'::uuid,
    'Bacoor, Cavite', 'FR02',
    'Bacoor, Cavite',
    null, null, 'active', false, 'franchise', 0, 0, 0, false
  ),
  (
    '22222222-2222-2222-2222-222222222207'::uuid,
    'Warehouse', 'WAREHOUSE',
    'Main Warehouse',
    null, null, 'active', false, 'warehouse', 0, 0, 0, false
  )
on conflict (id) do update set
  name = excluded.name,
  code = excluded.code,
  address = excluded.address,
  status = excluded.status,
  is_main = excluded.is_main,
  branch_type = excluded.branch_type,
  updated_at = now();

-- Sales transaction bulk data: generated via `npm run import:sales` → public/data/sales-transactions.json (local app).
-- Optional Supabase demo rows: see migrations referencing client_entitlements.
