/**
 * Apply customer migration via SECURITY DEFINER RPC (merge-safe).
 * Usage: node scripts/run-apply-customer-migration.mjs [path-to-xlsx]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnv() {
  const envPath = path.join(ROOT, '.env')
  const out = {}
  if (!fs.existsSync(envPath)) return out
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2] ?? ''
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

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
function genderOf(v) {
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

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const xlsxPath =
  process.argv[2] || path.join(ROOT, 'public/templates/customer_migration_import.xlsx')
const wb = XLSX.readFile(xlsxPath)
const sheet = wb.Sheets.Customers || wb.Sheets.Patients || wb.Sheets[wb.SheetNames[0]]
const raw = XLSX.utils.sheet_to_json(sheet, { defval: null })

const seenPhone = new Set()
const seenEmail = new Set()
const seenName = new Set()
const rows = []

for (const r of raw) {
  const fullName = asText(r.full_name ?? r.fullName)
  if (!fullName) continue
  const phone = phoneE164(r.phone)
  const email = emailKey(r.email)
  const nk = nameKey(fullName)
  const pk = phoneKey(phone)
  const ek = email
  if ((pk && seenPhone.has(pk)) || (ek && seenEmail.has(ek)) || (nk && seenName.has(nk))) continue
  if (pk) seenPhone.add(pk)
  if (ek) seenEmail.add(ek)
  if (nk) seenName.add(nk)

  const birth = asText(r.birthdate)
  const birthOk = /^\d{4}-\d{2}-\d{2}$/.test(birth) ? birth : ''
  rows.push({
    id: randomUUID(),
    full_name: fullName,
    phone: phone || null,
    email: email || null,
    gender: genderOf(r.gender) || null,
    birthdate: birthOk || null,
    address: asText(r.address) || null,
    preferred_branch_id: resolveBranch(r.branch),
    admin_notes: asText(r.notes ?? r.admin_notes) || null,
    total_spent: numOrNull(r.total_spent),
    total_visits: numOrNull(r.total_visits),
    phone_key: pk || null,
    email_key: ek || null,
    name_key: nk || null,
  })
}

const BATCH = 50
let updated = 0
let inserted = 0
let skipped = 0
const errors = []

console.log(JSON.stringify({ totalRows: rows.length, batches: Math.ceil(rows.length / BATCH) }))

for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  const res = await fetch(`${url}/rest/v1/rpc/apply_customer_migration_batch`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ p_rows: slice }),
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { ok: false, error: text.slice(0, 300) }
  }
  if (!res.ok || data?.ok === false) {
    errors.push({ batch: i / BATCH + 1, status: res.status, error: data?.error || text.slice(0, 300) })
    console.error('batch failed', i / BATCH + 1, res.status)
    break
  }
  updated += Number(data.updated || 0)
  inserted += Number(data.inserted || 0)
  skipped += Number(data.skipped || 0)
  if ((i / BATCH) % 5 === 0) {
    console.log(`progress ${Math.min(i + BATCH, rows.length)}/${rows.length}`)
  }
}

console.log(
  JSON.stringify(
    {
      updated,
      inserted,
      skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 3),
    },
    null,
    2,
  ),
)

if (errors.length) process.exit(1)
