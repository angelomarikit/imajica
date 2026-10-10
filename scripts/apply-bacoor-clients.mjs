/**
 * Import customers_bacoor.xlsx Customers sheet → Bacoor, Cavite (FR02).
 * Usage: node scripts/apply-bacoor-clients.mjs [path-to-xlsx]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BACOOR = '22222222-2222-2222-2222-222222222206'

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

function isBlank(v) {
  if (v == null) return true
  const s = String(v).trim()
  return !s || s === '-' || s.toLowerCase() === 'n/a'
}
function asText(v) {
  return isBlank(v) ? '' : String(v).trim()
}
/** Normalize PH mobiles: +6309… / 09… / 9… → 10-digit key starting with 9 */
function phoneKey(v) {
  let digits = String(v ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('630') && digits.length >= 12) digits = `63${digits.slice(3)}`
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1)
  if (digits.startsWith('63') && digits.length >= 12) digits = digits.slice(2)
  if (digits.length >= 10 && digits.startsWith('9')) return digits.slice(0, 10)
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
function numOrNull(v) {
  if (isBlank(v)) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function parseBirth(v) {
  const s = asText(v)
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  if (y < 1900 || y > 2100) return ''
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const xlsxPath =
  process.argv[2] ||
  path.join('C:/Users/Toptier/Desktop/Imajica Migration/output', 'customers_bacoor.xlsx')
if (!fs.existsSync(xlsxPath)) {
  console.error('File not found:', xlsxPath)
  process.exit(1)
}

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
  const phone = phoneE164(r.contact_number ?? r.phone)
  const email = emailKey(r.email)
  const nk = nameKey(fullName)
  const pk = phoneKey(phone || r.contact_number || r.phone)
  if ((pk && seenPhone.has(pk)) || (email && seenEmail.has(email)) || (nk && seenName.has(nk))) {
    continue
  }
  if (pk) seenPhone.add(pk)
  if (email) seenEmail.add(email)
  if (nk) seenName.add(nk)

  const birth = parseBirth(r.birthdate)
  const legacyId = asText(r.patient_id)
  rows.push({
    id: randomUUID(),
    full_name: fullName,
    phone: phone || null,
    email: email || null,
    gender: genderOf(r.gender) || null,
    birthdate: birth || null,
    address: asText(r.complete_address ?? r.address) || null,
    preferred_branch_id: BACOOR,
    admin_notes: legacyId ? `Legacy patient_id: ${legacyId}` : null,
    total_spent: numOrNull(r.total_spent),
    total_visits: numOrNull(r.total_visits),
    phone_key: pk || null,
    email_key: email || null,
    name_key: nk || null,
  })
}

console.log(
  JSON.stringify({
    file: xlsxPath,
    sourceRows: raw.length,
    prepared: rows.length,
    withPhone: rows.filter((r) => r.phone_key).length,
    birthParsed: rows.filter((r) => r.birthdate).length,
  }),
)

const BATCH = 40
let updated = 0
let inserted = 0
let skipped = 0
const errors = []

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
    data = { ok: false, error: text.slice(0, 400) }
  }
  if (!res.ok || data?.ok === false) {
    errors.push({
      batch: i / BATCH + 1,
      status: res.status,
      error: data?.error || text.slice(0, 400),
    })
    console.error('batch failed', i / BATCH + 1, res.status, data?.error || text.slice(0, 200))
    break
  }
  updated += Number(data.updated || 0)
  inserted += Number(data.inserted || 0)
  skipped += Number(data.skipped || 0)
  console.log(`progress ${Math.min(i + BATCH, rows.length)}/${rows.length}`, {
    updated,
    inserted,
    skipped,
  })
}

console.log(JSON.stringify({ updated, inserted, skipped, errorCount: errors.length, errors: errors.slice(0, 3) }, null, 2))
if (errors.length) process.exit(1)
