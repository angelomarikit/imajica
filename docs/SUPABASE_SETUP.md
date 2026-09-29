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

Step 23 adds missing RLS policies, creates the **Headquarters** sentinel branch (`00000000-0000-0000-0000-000000000001` / code `HQ`), and deletes any leftover demo transactional rows.

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
