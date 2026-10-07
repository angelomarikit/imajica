/**
 * Convert customer_migration_completed.xlsx → public/templates/customer_migration_import.xlsx
 * - Excel serial birthdates → YYYY-MM-DD
 * - Phones → +63… E.164 (or "-" if blank)
 * - Gender → female | male | -
 * - Blanks → "-"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

/** Prefer completed; fall back to final (full website+excel merge ~2647). */
const SOURCE =
  process.argv[2] ||
  'C:/Users/Toptier/Desktop/Imajica Migration/output/customer_migration_completed.xlsx'
const OUT = path.join(ROOT, 'public/templates/customer_migration_import.xlsx')

function excelSerialToIso(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return ''
  const ms = (n - 25569) * 86400 * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  if (y < 1920 || y > 2035) return ''
  return `${y}-${m}-${day}`
}

function normPhone(v) {
  if (v == null) return ''
  let s = String(v).trim()
  if (!s || s === '-') return ''
  // Excel may store phone as number (loses leading 0)
  if (typeof v === 'number') s = String(Math.trunc(v))
  const digits = s.replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 10 && digits.startsWith('9')) return `+63${digits}`
  if (digits.length === 11 && digits.startsWith('09')) return `+63${digits.slice(1)}`
  if (digits.length === 12 && digits.startsWith('63')) return `+${digits}`
  if (digits.length === 13 && digits.startsWith('630')) return `+63${digits.slice(3)}`
  if (digits.length === 11 && digits.startsWith('63')) return `+${digits}`
  // 9xxxxxxxxx already without country (10 digits handled above)
  if (digits.length >= 10) {
    const last10 = digits.slice(-10)
    if (last10.startsWith('9')) return `+63${last10}`
  }
  return ''
}

function normGender(v) {
  const s = String(v || '')
    .trim()
    .toLowerCase()
  if (s === 'female' || s === 'f') return 'female'
  if (s === 'male' || s === 'm') return 'male'
  return ''
}

function dash(v) {
  if (v == null) return '-'
  const s = String(v).trim()
  return s || '-'
}

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE)
  process.exit(1)
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })

const wb = XLSX.readFile(SOURCE)
const sheet = wb.Sheets.Patients || wb.Sheets[wb.SheetNames[0]]
const patients = XLSX.utils.sheet_to_json(sheet, { defval: null })

const ready = patients
  .map((r, i) => {
    const phone = normPhone(r.phone)
    const emailRaw = String(r.email || '').trim()
    const email = !emailRaw || emailRaw === '-' ? '' : emailRaw.toLowerCase()
    let birth = ''
    if (typeof r.birthdate === 'number') birth = excelSerialToIso(r.birthdate)
    else if (r.birthdate != null) {
      const s = String(r.birthdate).trim()
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) birth = s
      else if (/^\d+(\.\d+)?$/.test(s)) birth = excelSerialToIso(Number(s))
    }
    return {
      full_name: String(r.full_name || '').trim(),
      phone: phone || '-',
      email: email || '-',
      gender: normGender(r.gender) || '-',
      birthdate: birth || '-',
      address: dash(r.address),
      branch: dash(r.branch),
      total_spent: r.total_spent == null || r.total_spent === '-' ? '-' : Number(r.total_spent) || 0,
      total_visits: r.total_visits == null || r.total_visits === '-' ? '-' : Number(r.total_visits) || 0,
      notes: dash(r.notes),
      source_client_id: dash(r.client_id),
      row_no: i + 1,
    }
  })
  .filter((r) => r.full_name)

const outWb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(outWb, XLSX.utils.json_to_sheet(ready), 'Customers')
XLSX.utils.book_append_sheet(
  outWb,
  XLSX.utils.json_to_sheet([
    {
      step: 1,
      instruction:
        'HQ Admin → Customers → Import migration. Uses this file (or upload the same columns).',
    },
    {
      step: 2,
      instruction:
        'MATCH (no duplicates): phone (normalized) → email → full name only if unique in registry.',
    },
    {
      step: 3,
      instruction:
        'Matched rows: fill ONLY blank profile fields from this file. Never overwrite existing values.',
    },
    {
      step: 4,
      instruction: 'Unmatched rows: INSERT new customer with these details.',
    },
    {
      step: 5,
      instruction: 'birthdate YYYY-MM-DD · phone +63… · blank cells use "-" · do not invent data.',
    },
    {
      step: 6,
      instruction: `Built from ${path.basename(SOURCE)} Patients sheet (${ready.length} customers).`,
    },
  ]),
  'Instructions',
)

XLSX.writeFile(outWb, OUT)

const phonesOk = ready.filter((r) => r.phone.startsWith('+63')).length
const dobsOk = ready.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.birthdate)).length
console.log(JSON.stringify({ out: OUT, rows: ready.length, phonesOk, dobsOk, sample: ready[0] }, null, 2))
