# Imajica → Supabase setup (fresh project)

Consent **form templates** stay in the React app (`src/constants/imajicaFormTemplates.ts`). They are **not** SQL seed data.

## 1. Create the project

1. Open [Supabase](https://supabase.com) → **New project** (dedicated to Imajica).
2. Wait until the database is ready.

## 2. Environment variables (frontend)

In the project root, create `.env` (copy from `.env.example`):

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Find both values under **Project Settings → API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

Restart the Vite dev server after saving `.env`.

**Never** put the `service_role` key or Semaphore/PayMongo keys in `VITE_*`.

## 3. Run SQL migrations (one by one)

Prefer the CLI if the project is linked:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or in **Dashboard → SQL Editor**, paste and run **each file in order**. Confirm success before the next:

| Step | File |
|------|------|
| 1 | `supabase/migrations/20260925000001_init_schema.sql` |
| 2 | `supabase/migrations/20260925000002_rls_policies.sql` |
| 3 | `supabase/migrations/20260929000003_clients_promos_scheduling.sql` |
| 4 | `supabase/migrations/20260929000004_catalog_services_packages.sql` |
| 5 | `supabase/migrations/20260929000005_catalog_products_consumables.sql` |
| 6 | `supabase/migrations/20260929000006_promo_coupons.sql` |
| 7 | `supabase/migrations/20260929000007_clients_middle_name.sql` |
| 8 | `supabase/migrations/20260929000008_operations_expenses.sql` |
| 9 | `supabase/migrations/20260929000009_branch_orders_invoices.sql` |
| 10 | `supabase/migrations/20260929000010_branch_order_form_fields.sql` |
| 11 | `supabase/migrations/20260929000011_franchise_orders.sql` |
| 12 | `supabase/migrations/20260929000012_waste_inventory.sql` |
| 13 | `supabase/migrations/20260929000013_central_warehouse.sql` |
| 14 | `supabase/migrations/20260929000014_stock_transfers.sql` |
| 15 | `supabase/migrations/20260929000015_imajica_forms_history.sql` |
| 16 | `supabase/migrations/20260929000016_analytics_sales_reports.sql` |
| 17 | `supabase/migrations/20260929000017_team_recruitment_lms.sql` |
| 18 | `supabase/migrations/20260929000018_staff_positions_sales.sql` |
| 19 | `supabase/migrations/20260929000019_staff_directory_form_fields.sql` |
| 20 | `supabase/migrations/20260929000020_user_access_directory.sql` |
| 21 | `supabase/migrations/20260929000021_branches_directory.sql` |
| 22 | `supabase/migrations/20260929000022_sms_marketing.sql` |
| 23 | `supabase/migrations/20260929000023_rls_core_gaps_and_clean_demo.sql` |
| 24 | `supabase/migrations/20260929000024_treatment_branch_availability.sql` |
| 25 | `supabase/migrations/20260929000025_product_detail_stock_history.sql` |
| 26 | `supabase/migrations/20260929000026_sales_payment_type_labels.sql` |
| 27 | `supabase/migrations/20260929000027_client_sales_entitlements.sql` |
| 28 | `supabase/migrations/20260929000028_appointment_schedule_fields.sql` |
| 29 | `supabase/migrations/20260929000029_franchise_branch_owner_rls.sql` |
| 30 | `supabase/migrations/20260929000030_branch_accounts.sql` |
| 31 | `supabase/migrations/20260929000031_branch_accounts_any_clinic.sql` |
| 32 | `supabase/migrations/20260929000032_branch_account_rpc_service_role.sql` |
| 33 | `supabase/migrations/20260929000033_clients_branch_scope.sql` |
| 34 | `supabase/migrations/20260929000034_booking_checkout_fields.sql` |
| 35 | `supabase/migrations/20260929000035_seed_team_user_accounts.sql` |
| 36 | `supabase/migrations/20260929000036_branch_account_all_roles.sql` |
| 37 | `supabase/migrations/20260929000037_staff_attendance.sql` |

Step 23 adds missing RLS policies, creates the **Headquarters** sentinel branch (`00000000-0000-0000-0000-000000000001` / code `HQ`), and deletes any leftover demo transactional rows.

Step 29 tightens RLS for **franchise branch owners** (`BRANCH_ADMIN` on a `branch_type = 'franchise'` branch): appointments, clients, sales, stock, expenses, waste, orders, staff, and promo coupons are limited to their branch; HQ central warehouse and global catalog CRUD stay HQ-only.

Step 30 adds **Branches Accounts** (`v_branch_accounts_directory` + `upsert_branch_account_assignment`).

Step 34 adds booking checkout fields on sales (`payment_type`, booking refs).

Step 35 seeds **43 team login accounts** from the legacy User List into Auth + `profiles` + `user_roles` (password `Imajica123`). See `docs/TEAM_ACCOUNT_CREDENTIALS.md`. No Branch → `HQ_ADMIN`; named branch → `BRANCH_ADMIN` for that clinic.

Step 36 lets HQ change any account role from Branches Accounts (all system roles; org roles land on the HQ sentinel).

Step 37 adds **staff attendance** (`staff_attendance_logs` + private storage bucket `attendance-selfies`) for Time In / Time Out with selfie and geolocation.

**Create accounts inside the web app** (recommended): the UI calls Edge Function `create-branch-account`, which creates Auth + profile + branch role. You do **not** add users in the Authentication dashboard for this flow.

One-time setup:

1. `.env` with **anon** key only (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) — never the service role in Vite.
2. Apply migration 30.
3. Deploy once (service role is injected automatically by Supabase — you do not paste it into the app):

```bash
supabase functions deploy create-branch-account --no-verify-jwt
```

4. Sign in as HQ (`SUPER_ADMIN` / `HQ_ADMIN`), then use **Branches Accounts → Create Account**.

## 4. Seed (taxonomy only)

Run `supabase/seed.sql` in the SQL Editor (or `supabase db seed` if configured).

It only inserts **treatment categories**. No demo clients, branches, orders, or promos.

## 5. First admin user

1. **Authentication → Users → Add user** (email + password). Copy the user’s UUID.
2. Run this in SQL Editor (replace the UUID and email/name):

```sql
-- Profile (id must match auth.users.id)
insert into public.profiles (id, full_name, email, status)
values (
  'PASTE_AUTH_USER_UUID_HERE'::uuid,
  'Your Name',
  'you@imajica.ph',
  'active'
)
on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      updated_at = now();

-- SUPER_ADMIN on HQ sentinel branch
-- (user_roles.branch_id is part of the primary key and cannot be null)
insert into public.user_roles (user_id, role_id, branch_id)
values (
  'PASTE_AUTH_USER_UUID_HERE'::uuid,
  'SUPER_ADMIN',
  '00000000-0000-0000-0000-000000000001'::uuid
)
on conflict do nothing;
```

Sign in to the app with that email/password.

## 5b. Franchise branch owner

1. Create the franchise branch in **Team → Branches** (or SQL) with `branch_type = 'franchise'`. Copy its UUID.
2. **Authentication → Users → Add user** for the owner. Copy the auth user UUID.
3. Run:

```sql
-- Profile
insert into public.profiles (id, full_name, email, status)
values (
  'PASTE_FRANCHISE_OWNER_AUTH_UUID'::uuid,
  'Franchise Owner Name',
  'owner@franchise.example',
  'active'
)
on conflict (id) do update
  set full_name = excluded.full_name,
      email = excluded.email,
      updated_at = now();

-- BRANCH_ADMIN on the franchise branch only (must be branch_type = franchise)
insert into public.user_roles (user_id, role_id, branch_id)
select
  'PASTE_FRANCHISE_OWNER_AUTH_UUID'::uuid,
  'BRANCH_ADMIN',
  b.id
from public.branches b
where b.id = 'PASTE_FRANCHISE_BRANCH_UUID'::uuid
  and b.branch_type = 'franchise'
on conflict do nothing;
```

If the `insert into user_roles … select` inserts **0 rows**, the branch UUID is wrong or not a franchise — fix `branch_type` first.

Offline demo login (works even when `.env` points at Supabase, if that Auth user does not exist yet):

- Email: `franchise@imajica.ph`
- Password: `password123`
- Or click **Franchise** on the login screen

This uses a local demo session locked to Dasmariñas, Cavite (`FR01`). It does **not** replace creating a real Auth user for production.

## 5c. Branches Accounts (in-app create)

After migration 30 + Edge Function deploy, HQ creates accounts from the app form (email, password, role, branch). No Authentication → Users step.

Fallback SQL (only if you already have an Auth user UUID):

```sql
select public.upsert_branch_account_assignment(
  'PASTE_AUTH_USER_UUID'::uuid,
  'Owner Name',
  'owner@branch.example',
  'BRANCH_ADMIN',
  'PASTE_BRANCH_UUID'::uuid,
  'active'
);
```

## 6. Clear old browser demo data

In DevTools → Application → Local Storage, remove keys starting with `imajica_` (including `imajica_auth_user`), then hard-refresh. Otherwise old offline demo rows can still appear.

## 7. SMS (Semaphore) — when you go live

```bash
supabase secrets set SEMAPHORE_API_KEY=your_key SEMAPHORE_SENDER_NAME=YourApprovedSender
supabase functions deploy semaphore-account
supabase functions deploy semaphore-send
```

## 8. Payments (PayMongo) — later

```bash
supabase secrets set PAYMONGO_SECRET_KEY=your_key
supabase functions deploy paymongo-create-payment
```

(The PayMongo function is still a stub until payments are fully wired.)

## What you should see after setup

- Empty clients, appointments, sales, orders, etc. (until you add real data or wire more services).
- Treatment category taxonomy present.
- HQ branch present; add real clinic branches from Team → Branches.
- Consent form **templates** still available in Administration → Imajica Forms.
- No RLS “permission denied” when a SUPER_ADMIN selects `branches` / `staff` / `clients`.

## Optional CLI checklist

```bash
cp .env.example .env
# fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

supabase link --project-ref YOUR_PROJECT_REF
supabase db push
# then paste seed.sql in SQL Editor (or configure seed in config.toml)

npm run dev
```
