# Imajica kiosk staff credentials

Shared **Timeclock kiosk** accounts. Staff punch at `/timeclock` with their **employee number** (no login).

Portal login (optional) uses the emails below.

**Password for every account:** `Imajica123`

**Kiosk URL:** `/timeclock`

## Employee numbers

| Employee # | Full name | Email | Branch | Password |
|---|---|---|---|---|
| 002 | Veronica Mayo | veronica.mayo@imajica.com | Cainta, Rizal | Imajica123 |
| 007 | Samerah Sandigan | samerah.sandigan@imajica.com | San Mateo, Rizal | Imajica123 |
| 008 | Sonayah Arsila | sonayah.arsila@imajica.com | San Mateo, Rizal | Imajica123 |
| 010 | Noraisa Unayan | noraisa.unayan@imajica.com | San Mateo, Rizal | Imajica123 |
| 012 | Sitti Nur Aisa Tan | sitti.nur.aisa.tan@imajica.com | San Mateo, Rizal | Imajica123 |
| 014 | Melissa Gervacio | melissa.gervacio@imajica.com | Cainta, Rizal | Imajica123 |
| 017 | Hendra Sandigan | hendra.sandigan@imajica.com | Pasig City | Imajica123 |
| 022 | Heidi Reyes | heidi.reyes@imajica.com | Cainta, Rizal | Imajica123 |
| 023 | Janice Aguirre | janice.aguirre@imajica.com | San Mateo, Rizal | Imajica123 |
| 024 | Annie Barba | annie.barba@imajica.com | Pasig City | Imajica123 |
| 025 | Chloe Renee Francisco | chloe.renee.francisco@imajica.com | Cainta, Rizal | Imajica123 |
| 026 | Sapiya Lomodah | sapiya.lomodah@imajica.com | San Mateo, Rizal | Imajica123 |
| 027 | Ynyr Collene Bandoquillo | ynyr.collene.bandoquillo@imajica.com | San Mateo, Rizal | Imajica123 |

## How punching works

1. Open `/timeclock` on a shared clinic device (no login).
2. Enter the 3-digit employee number.
3. Wait until location shows (GPS).
4. Tap **Time In** or **Time Out**.

Branch admins review punches under **Reports → Branch Attendance**.

## Supabase

Run migration `20260929000040_kiosk_employee_codes.sql` so Auth users, `profiles.employee_code`, and public RPCs (`kiosk_lookup_employee`, `kiosk_attendance_punch`) exist.

Offline / demo mode already includes these accounts in local seed data.

> Change passwords in production after first use. Do not treat this file as a production secret store.
