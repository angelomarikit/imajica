# Imajica team account credentials

Seeded from the legacy User List (43 accounts).

**Default password for every account:** `Imajica123`

## Login rules

- **No Branch** → `HQ_ADMIN` (admin HQ dashboard; all clinics)
- **Named branch** → `BRANCH_ADMIN` scoped to that clinic

Offline / demo: these emails work in the app even before Supabase Auth users exist (fallback in AuthContext).

Supabase: run migration `20260929000035_seed_team_user_accounts.sql` (after branches exist) so Auth + profiles + roles are created.

## HQ / No Branch (HQ_ADMIN)

| Full name | Email | Password | Access |
|---|---|---|---|
| admin | imajica-admin@gmail.com | Imajica123 | Admin HQ |
| admintesting | admin@intra-code.com | Imajica123 | Admin HQ |
| Bridgette | bridgetteandreasantos@gmail.com | Imajica123 | Admin HQ |
| Charise | charisesampaga@gmail.com | Imajica123 | Admin HQ |
| Frances | francescruzph.pro@gmail.com | Imajica123 | Admin HQ |
| INACTIVE | lloydmichaelpatenia@gmail.com | Imajica123 | Admin HQ |
| INACTIVE | afundarvaneza@gmail.com | Imajica123 | Admin HQ |
| INACTIVE | nicoletexon@gmail.com | Imajica123 | Admin HQ |
| INACTIVE | sherlenejorda@gmail.com | Imajica123 | Admin HQ |
| INACTIVE | rozelynperocho@gmail.com | Imajica123 | Admin HQ |
| INACTIVE | melksto.domingo@gmail.com | Imajica123 | Admin HQ |
| Katrina | sweetkatrina143@yahoo.com | Imajica123 | Admin HQ |
| Marketing Frances | frances@moobdigital.com | Imajica123 | Admin HQ |
| Marketing Support | support@moobdigital.com | Imajica123 | Admin HQ |
| Zhai | zhairethchua81@gmail.com | Imajica123 | Admin HQ |

## Branch accounts (BRANCH_ADMIN)

| Full name | Email | Branch | Password |
|---|---|---|---|
| Annie Barba | annieba560@gmail.com | Pasig City | Imajica123 |
| BACOOR ADMIN | bacoor@gmail.com | Bacoor, Cavite | Imajica123 |
| Bacoor, Cavite | imajicabacoor@gmail.com | Bacoor, Cavite | Imajica123 |
| Chloe Francisco | chloe.francisco11@gmail.com | Cainta, Rizal | Imajica123 |
| Daisy A. Compañero | companerodhey@gmail.com | Dasmariñas, Cavite | Imajica123 |
| DASMA ADMIN | dasma@gmail.com | Dasmariñas, Cavite | Imajica123 |
| Dasmariñas, Cavite | imajicadasmarinas@gmail.com | Dasmariñas, Cavite | Imajica123 |
| Heidi Tiamzon Reyes | hydsreyes1220@gmail.com | Cainta, Rizal | Imajica123 |
| Hendra Sandigan | hendrasukol98@gmail.com | Pasig City | Imajica123 |
| Janice B. Aguirre | jadeaguirre47@gmail.com | San Mateo, Rizal | Imajica123 |
| Jonila Marie E. Barro | jaja29193@gmail.com | Bacoor, Cavite | Imajica123 |
| Mea Rose Salvador | mearose@gmail.com | Bacoor, Cavite | Imajica123 |
| Mellisa Gervacio | melissagervacio041@gmail.com | Cainta, Rizal | Imajica123 |
| Noraisa Unayan | esmaeldaisy12@gmail.com | San Mateo, Rizal | Imajica123 |
| Rei Rei | gomezreamie13@gmail.com | Bacoor, Cavite | Imajica123 |
| Rhas Monteclaro | rhasmonteclaro01@gmail.com | San Mateo, Rizal | Imajica123 |
| Rizielle M. De Dios | rizielle112388@gmail.com | Dasmariñas, Cavite | Imajica123 |
| Rosalie Manalo | jangmi2575@gmail.com | Pasig City | Imajica123 |
| Samerah Sandigan | samerahsandigan01@gmail.com | San Mateo, Rizal | Imajica123 |
| Shiene S. Lucero | 547vador.shiene@gmail.com | Bacoor, Cavite | Imajica123 |
| Sittie Hannah kasim | imajicagmsittie@gmail.com | San Mateo, Rizal | Imajica123 |
| Sunshine Manalo Feliciano | shine.feliciano@gmail.com | Bacoor, Cavite | Imajica123 |
| tablemanager001 | tablefr01@gmail.com | Dasmariñas, Cavite | Imajica123 |
| tablemanager002 | tablefr02@gmail.com | Bacoor, Cavite | Imajica123 |
| tablemanager01 | tablebr01@gmail.com | San Mateo, Rizal | Imajica123 |
| tablemanager02 | tablebr02@gmail.com | Cainta, Rizal | Imajica123 |
| tablemanager03 | tablebr03@gmail.com | Pasig City | Imajica123 |
| Veronica Mayo | veronnemay@gmail.com | Cainta, Rizal | Imajica123 |

## Branch UUID map

| Branch | UUID |
|---|---|
| Headquarters (No Branch roles) | 00000000-0000-0000-0000-000000000001 |
| San Mateo, Rizal | 22222222-2222-2222-2222-222222222201 |
| Cainta, Rizal | 22222222-2222-2222-2222-222222222202 |
| Pasig City | 22222222-2222-2222-2222-222222222203 |
| Dasmariñas, Cavite | 22222222-2222-2222-2222-222222222205 |
| Bacoor, Cavite | 22222222-2222-2222-2222-222222222206 |

> Change passwords in production after first login. Do not commit real production secrets.
