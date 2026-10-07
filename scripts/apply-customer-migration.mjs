/**
 * Apply customer_migration_import.xlsx → public.clients (merge-safe).
 * Writes SQL batch files under scripts/.tmp-mig/ (gitignored) for MCP/psql apply.
 *
 * Rules: match phone → email → unique name; fill blanks only; insert unmatched.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT_DIR = path.join(__dirname, '.tmp-mig')
const XLSX_PATH =
  process.argv[2] || path.join(ROOT, 'public/templates/customer_migration_import.xlsx')

const BRANCH_MAP = {
  pasig: '22222222-2222-2222-2222-222222222203',
  cainta: '22222222-2222-2222-2222-222222222202',
  'san mateo': '22222222-2222-2222-2222-222222222201',
  bacoor: '22222222-2222-2222-2222-222222222206',
  dasma: '22222222-2222-2222-2222-222222222205',
  'dasmariñas': '22222222-2222-2222-2222-222222222205',
  dasmarinas: '22222222-2222-2222-2222-222222222205',
  lipa: '22222222-2222-2222-2222-222222222204',
}

function sqlStr(v) {
  if (v == null || v === '') return 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

function isBlank(v) {
  if (v == null) return true
  const s = String(v).trim()
  return !s || s === '-' || s.toLowerCase() === 'n/a'
}

function asText(v) {
  return isBlank(v) ? '' : String(v).trim()
}

function phoneKey(v) {
  const digits = String(v ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length >= 10) {
    const last10 = digits.slice(-10)
    if (last10.startsWith('9')) return last10
  }
  return digits
}

function phoneE164(v) {
  const key = phoneKey(v)
  if (!key) return ''
  if (key.length === 10 && key.startsWith('9')) return `+63${key}`
  return key.startsWith('63') ? `+${key}` : `+${key}`
}

function emailKey(v) {
  const s = asText(v).toLowerCase()
  if (!s || s.endsWith('@imajica.local')) return ''
  return s
}

function nameKey(v) {
  return asText(v)
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, '')
}

function genderSql(v) {
  const s = asText(v).toLowerCase()
  if (s === 'female' || s === 'f') return 'female'
  if (s === 'male' || s === 'm') return 'male'
  return ''
}

function resolveBranch(label) {
  const s = asText(label).toLowerCase()
  if (!s) return null
  for (const [needle, id] of Object.entries(BRANCH_MAP)) {
    if (s.includes(needle)) return id
  }
  return null
}

function numOrNull(v) {
  if (isBlank(v)) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

if (!fs.existsSync(XLSX_PATH)) {
  console.error('Missing workbook:', XLSX_PATH)
  process.exit(1)
}

fs.rmSync(OUT_DIR, { recursive: true, force: true })
fs.mkdirSync(OUT_DIR, { recursive: true })

const wb = XLSX.readFile(XLSX_PATH)
const sheet = wb.Sheets.Customers || wb.Sheets.Patients || wb.Sheets[wb.SheetNames[0]]
const raw = XLSX.utils.sheet_to_json(sheet, { defval: null })

const rows = []
const seenPhone = new Set()
const seenEmail = new Set()
const seenName = new Set()

for (const r of raw) {
  const fullName = asText(r.full_name ?? r.fullName)
  if (!fullName) continue
  const phone = phoneE164(r.phone)
  const email = emailKey(r.email)
  const nk = nameKey(fullName)
  const pk = phoneKey(phone)
  const ek = email

  // de-dupe within file
  if ((pk && seenPhone.has(pk)) || (ek && seenEmail.has(ek)) || (nk && seenName.has(nk))) {
    continue
  }
  if (pk) seenPhone.add(pk)
  if (ek) seenEmail.add(ek)
  if (nk) seenName.add(nk)

  const gender = genderSql(r.gender)
  const birth = asText(r.birthdate)
  const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : ''
  const address = asText(r.address)
  const branchId = resolveBranch(r.branch)
  const notes = asText(r.notes ?? r.admin_notes)
  const totalSpent = numOrNull(r.total_spent)
  const totalVisits = numOrNull(r.total_visits)

  rows.push({
    id: randomUUID(),
    fullName,
    phone,
    email,
    gender,
    birth: birthOk,
    address,
    branchId,
    notes,
    totalSpent,
    totalVisits,
    phoneKey: pk,
    emailKey: ek,
    nameKey: nk,
  })
}

const setupSql = `
CREATE TABLE IF NOT EXISTS public._mig_customers_staging (
  id uuid PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  email text,
  gender text,
  birthdate date,
  address text,
  preferred_branch_id uuid,
  admin_notes text,
  total_spent numeric,
  total_visits integer,
  phone_key text,
  email_key text,
  name_key text
);
TRUNCATE public._mig_customers_staging;
`.trim()

fs.writeFileSync(path.join(OUT_DIR, '00_setup.sql'), setupSql)

const BATCH = 80
let batchIdx = 0
for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  const values = slice
    .map((r) => {
      return `(${[
        sqlStr(r.id),
        sqlStr(r.fullName),
        r.phone ? sqlStr(r.phone) : 'NULL',
        r.email ? sqlStr(r.email) : 'NULL',
        r.gender ? sqlStr(r.gender) : 'NULL',
        r.birth ? sqlStr(r.birth) + '::date' : 'NULL',
        r.address ? sqlStr(r.address) : 'NULL',
        r.branchId ? sqlStr(r.branchId) + '::uuid' : 'NULL',
        r.notes ? sqlStr(r.notes) : 'NULL',
        r.totalSpent != null ? String(r.totalSpent) : 'NULL',
        r.totalVisits != null ? String(Math.trunc(r.totalVisits)) : 'NULL',
        r.phoneKey ? sqlStr(r.phoneKey) : 'NULL',
        r.emailKey ? sqlStr(r.emailKey) : 'NULL',
        r.nameKey ? sqlStr(r.nameKey) : 'NULL',
      ].join(',')})`
    })
    .join(',\n')

  const sql = `INSERT INTO public._mig_customers_staging (
  id, full_name, phone, email, gender, birthdate, address, preferred_branch_id,
  admin_notes, total_spent, total_visits, phone_key, email_key, name_key
) VALUES
${values};`
  batchIdx += 1
  fs.writeFileSync(path.join(OUT_DIR, `01_insert_${String(batchIdx).padStart(3, '0')}.sql`), sql)
}

const mergeSql = `
-- 1) Match by phone_key (unique)
WITH phone_match AS (
  SELECT c.id AS client_id, s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN public.clients c
    ON s.phone_key IS NOT NULL
   AND length(s.phone_key) >= 10
   AND right(regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g'), 10) = s.phone_key
),
-- 2) Match by email when phone unmatched
email_match AS (
  SELECT c.id AS client_id, s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN public.clients c
    ON s.email_key IS NOT NULL
   AND lower(coalesce(c.email, '')) = s.email_key
  WHERE s.id NOT IN (SELECT staging_id FROM phone_match)
),
-- 3) Match by unique name when phone+email unmatched
name_counts AS (
  SELECT
    regexp_replace(lower(regexp_replace(coalesce(full_name, ''), '[^a-zA-Z0-9]+', '', 'g')), '\\s', '', 'g') AS name_key,
    count(*)::int AS n
  FROM public.clients
  GROUP BY 1
),
name_match AS (
  SELECT c.id AS client_id, s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN public.clients c
    ON s.name_key IS NOT NULL
   AND regexp_replace(lower(regexp_replace(coalesce(c.full_name, ''), '[^a-zA-Z0-9]+', '', 'g')), '\\s', '', 'g') = s.name_key
  JOIN name_counts nc ON nc.name_key = s.name_key AND nc.n = 1
  WHERE s.id NOT IN (SELECT staging_id FROM phone_match)
    AND s.id NOT IN (SELECT staging_id FROM email_match)
),
all_matches AS (
  SELECT * FROM phone_match
  UNION ALL
  SELECT * FROM email_match
  UNION ALL
  SELECT * FROM name_match
),
upd AS (
  UPDATE public.clients c SET
    email = CASE
      WHEN nullif(trim(coalesce(c.email, '')), '') IS NULL THEN nullif(s.email, '')
      ELSE c.email
    END,
    phone = CASE
      WHEN nullif(trim(coalesce(c.phone, '')), '') IS NULL THEN nullif(s.phone, '')
      ELSE c.phone
    END,
    date_of_birth = CASE
      WHEN c.date_of_birth IS NULL THEN s.birthdate
      ELSE c.date_of_birth
    END,
    gender = CASE
      WHEN coalesce(c.gender, 'prefer_not_to_say') IN ('prefer_not_to_say', '')
        AND s.gender IN ('female', 'male') THEN s.gender
      ELSE c.gender
    END,
    address = CASE
      WHEN nullif(trim(coalesce(c.address, '')), '') IS NULL THEN nullif(s.address, '')
      ELSE c.address
    END,
    preferred_branch_id = CASE
      WHEN c.preferred_branch_id IS NULL THEN s.preferred_branch_id
      ELSE c.preferred_branch_id
    END,
    admin_notes = CASE
      WHEN nullif(trim(coalesce(c.admin_notes, '')), '') IS NULL THEN nullif(s.admin_notes, '')
      ELSE c.admin_notes
    END,
    total_spent = GREATEST(coalesce(c.total_spent, 0), coalesce(s.total_spent, 0)),
    total_visits = GREATEST(coalesce(c.total_visits, 0), coalesce(s.total_visits, 0)),
    updated_at = now()
  FROM public._mig_customers_staging s
  JOIN all_matches m ON m.staging_id = s.id AND m.client_id = c.id
  RETURNING c.id
)
SELECT 'updated' AS action, count(*)::int AS n FROM upd;

-- Insert unmatched staging rows
WITH phone_match AS (
  SELECT s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN public.clients c
    ON s.phone_key IS NOT NULL
   AND length(s.phone_key) >= 10
   AND right(regexp_replace(coalesce(c.phone, ''), '\\D', '', 'g'), 10) = s.phone_key
),
email_match AS (
  SELECT s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN public.clients c
    ON s.email_key IS NOT NULL
   AND lower(coalesce(c.email, '')) = s.email_key
),
name_counts AS (
  SELECT
    regexp_replace(lower(regexp_replace(coalesce(full_name, ''), '[^a-zA-Z0-9]+', '', 'g')), '\\s', '', 'g') AS name_key,
    count(*)::int AS n
  FROM public.clients
  GROUP BY 1
),
name_match AS (
  SELECT s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN public.clients c
    ON s.name_key IS NOT NULL
   AND regexp_replace(lower(regexp_replace(coalesce(c.full_name, ''), '[^a-zA-Z0-9]+', '', 'g')), '\\s', '', 'g') = s.name_key
  JOIN name_counts nc ON nc.name_key = s.name_key AND nc.n = 1
),
ambiguous_names AS (
  SELECT s.id AS staging_id
  FROM public._mig_customers_staging s
  JOIN name_counts nc ON nc.name_key = s.name_key AND nc.n > 1
),
to_insert AS (
  SELECT s.*
  FROM public._mig_customers_staging s
  WHERE s.id NOT IN (SELECT staging_id FROM phone_match)
    AND s.id NOT IN (SELECT staging_id FROM email_match)
    AND s.id NOT IN (SELECT staging_id FROM name_match)
    AND s.id NOT IN (SELECT staging_id FROM ambiguous_names)
),
ins AS (
  INSERT INTO public.clients (
    id, code, full_name, email, phone, date_of_birth, gender, address,
    preferred_branch_id, status, is_vip, registered_at, total_visits, total_spent, admin_notes
  )
  SELECT
    s.id,
    'MJ-' || to_char(now(), 'YYMMDD') || lpad((row_number() OVER (ORDER BY s.full_name))::text, 4, '0'),
    s.full_name,
    s.email,
    s.phone,
    s.birthdate,
    coalesce(s.gender, 'prefer_not_to_say'),
    s.address,
    s.preferred_branch_id,
    'active',
    false,
    now(),
    coalesce(s.total_visits, 0),
    coalesce(s.total_spent, 0),
    s.admin_notes
  FROM to_insert s
  RETURNING id
)
SELECT 'inserted' AS action, count(*)::int AS n FROM ins;
`.trim()

fs.writeFileSync(path.join(OUT_DIR, '02_merge.sql'), mergeSql)

const cleanupSql = `
DROP TABLE IF EXISTS public._mig_customers_staging;
SELECT count(*)::int AS clients_total FROM public.clients;
SELECT
  count(*) FILTER (WHERE phone IS NOT NULL AND trim(phone) <> '')::int AS with_phone,
  count(*) FILTER (WHERE email IS NOT NULL AND trim(email) <> '')::int AS with_email,
  count(*) FILTER (WHERE date_of_birth IS NOT NULL)::int AS with_dob
FROM public.clients;
`.trim()

fs.writeFileSync(path.join(OUT_DIR, '03_cleanup.sql'), cleanupSql)

fs.writeFileSync(
  path.join(OUT_DIR, 'manifest.json'),
  JSON.stringify(
    {
      source: XLSX_PATH,
      stagingRows: rows.length,
      insertBatches: batchIdx,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log(
  JSON.stringify(
    {
      outDir: OUT_DIR,
      stagingRows: rows.length,
      insertBatches: batchIdx,
      files: fs.readdirSync(OUT_DIR),
    },
    null,
    2,
  ),
)
