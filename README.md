# Imajica Medical Aesthetics

Multi-branch clinic management platform for **Imajica Medical Aesthetics**.

## Stack

- React + TypeScript + Vite + Tailwind CSS
- Supabase (Auth, PostgreSQL, Storage, RLS, Edge Functions)
- TanStack Query, React Hook Form, Zod, Recharts, Sonner
- Deploy: Vercel

## Quick start

```bash
npm install
cp .env.example .env
npm run dev
```

### Demo mode (no Supabase)

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are unset or placeholders, the app runs with local demo data.

| Account | Password | Role |
|---------|----------|------|
| `admin@imajica.ph` | `password123` | HQ Admin |
| `staff@imajica.ph` | `password123` | Receptionist |
| `client@imajica.ph` | `password123` | Client |

Or use the **Admin / Staff / Client** quick buttons on the login screen.

## Supabase

1. Create a **new** Supabase project for Imajica (dedicated DB — not shared with other apps).
2. Set env vars from `.env.example`.
3. Apply migrations in `supabase/migrations/` (in order) via SQL Editor or `supabase db push`.
4. Run `supabase/seed.sql`.
5. Configure Storage buckets (private + signed URLs).
6. Set Edge Function secrets for PayMongo / SMS / email.

While UI features may use demo/localStorage until env vars are set, **every data feature should ship with a matching migration** so the new project is ready when you connect.


## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run preview` — preview build

## Brand

Always use **Imajica** / **IMAJICA Medical Aesthetics** (not “Majica”).
