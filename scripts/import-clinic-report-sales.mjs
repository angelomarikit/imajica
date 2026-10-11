/**
 * Import a clinic "Sales Data" Excel report into Supabase as ops sales
 * (lead_source = Clinic Report). Migration rows are left untouched.
 *
 * Usage:
 *   node scripts/import-clinic-report-sales.mjs [path-to-xlsx]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import XLSX from 'xlsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_XLSX = path.join(
  process.env.USERPROFILE || '',
  'Downloads',
  'Bacoor__Cavite_Report_20261001_to_20261011.xlsx',
)

const BRANCH_IDS = {
  'San Mateo, Rizal': '22222222-2222-2222-2222-222222222201',
  'Cainta, Rizal': '22222222-2222-2222-2222-222222222202',
  'Pasig City': '22222222-2222-2222-2222-222222222203',
  'Lipa, Batangas': '22222222-2222-2222-2222-222222222204',
  'Dasmariñas, Cavite': '22222222-2222-2222-2222-222222222205',
  'Dasmarinas, Cavite': '22222222-2222-2222-2222-222222222205',
  'Bacoor, Cavite': '22222222-2222-2222-2222-222222222206',
}

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
}

function loadEnv() {
  const out = {}
  const envPath = path.join(ROOT, '.env')
  if (!fs.existsSync(envPath)) return out
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    let v = m[2] ?? ''
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

function parseDisplayDate(s) {
  const m = String(s).match(/^([A-Za-z]+)\s+(\d+),\s+(\d+)$/)
  if (!m) return null
  const mon = MONTHS[m[1].slice(0, 3)]
  if (mon === undefined) return null
  const y = Number(m[3])
  const d = Number(m[2])
  // Noon Manila → stable UTC day
  const iso = new Date(Date.UTC(y, mon, d, 4, 0, 0)).toISOString()
  return { dateKey: `${y}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, iso }
}

function nameKey(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function itemTypeOf(typeLabel, name) {
  const t = String(typeLabel || '').toLowerCase()
  if (t.includes('product') && !t.includes('service')) return 'product'
  if (t.includes('package')) return 'package'
  if (/\bpackage\b/i.test(name)) return 'package'
  return 'service'
}

function mapStatus(s) {
  return String(s || '').toLowerCase() === 'paid' ? 'paid' : 'pending'
}

function mapPaymentMethod(payment) {
  const p = String(payment || '').toLowerCase()
  if (p.includes('qr')) return 'qr_ph'
  if (p.includes('credit')) return 'credit_card'
  if (p.includes('debit')) return 'debit_card'
  if (p.includes('gcash')) return 'gcash'
  if (p.includes('maya') || p.includes('paymaya')) return 'paymaya'
  if (p.includes('transfer') || p.includes('bank')) return 'bank_transfer'
  if (p.includes('owner')) return 'owners_account'
  return 'cash'
}

function mapPaymentType(payment) {
  const p = String(payment || '').toLowerCase()
  if (p.includes('installment')) return 'Installment'
  if (p.includes('split')) return 'Split Payment'
  if (p.includes('partial')) return 'Partial'
  return 'Full Payment'
}

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const xlsxPath = process.argv[2] || DEFAULT_XLSX
if (!fs.existsSync(xlsxPath)) {
  console.error('File not found:', xlsxPath)
  process.exit(1)
}

const wb = XLSX.readFile(xlsxPath)
const sheetName = wb.SheetNames.includes('Sales Data') ? 'Sales Data' : wb.SheetNames[0]
const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })

const rows = []
let skipped = 0
let excelTotal = 0
const byBranch = {}

for (let i = 0; i < rawRows.length; i++) {
  const r = rawRows[i]
  const customer = String(r.Customer || '').trim()
  const branchName = String(r.Branch || '').trim()
  const itemName = String(r['Service / Product'] || '').trim()
  const amount = Math.round((Number(r.Amount) || 0) * 100) / 100
  const parsed = parseDisplayDate(r.Date)
  const branchId = BRANCH_IDS[branchName]
  if (!customer || !itemName || !parsed || !branchId || amount <= 0) {
    skipped++
    continue
  }
  excelTotal += amount
  byBranch[branchName] = (byBranch[branchName] || 0) + amount
  const prefix = branchName.toLowerCase().includes('bacoor')
    ? 'RPT-BAC'
    : branchName.toLowerCase().includes('dasma')
      ? 'RPT-DAS'
      : 'RPT'
  const invoice = `${prefix}-${parsed.dateKey.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`
  rows.push({
    phone_key: null,
    full_name: customer,
    branch_id: branchId,
    invoice_number: invoice,
    booking_ref: invoice,
    payment_type: mapPaymentType(r.Payment),
    status: mapStatus(r.Status),
    total_amount: amount,
    contract_amount: null,
    created_at: parsed.iso,
    item_name: itemName,
    item_type: itemTypeOf(r.Type, itemName),
    quantity: 1,
    unit_price: amount,
    line_total: amount,
    sessions_total: null,
    sessions_completed: null,
    payment_method: mapPaymentMethod(r.Payment),
    lead_source: 'Clinic Report',
    staff_name: String(r.Staff || '').trim() || null,
    name_key: nameKey(customer),
  })
}

console.log(
  JSON.stringify(
    {
      file: xlsxPath,
      excelRows: rawRows.length,
      prepared: rows.length,
      skipped,
      excelTotal: Math.round(excelTotal * 100) / 100,
      byBranch,
    },
    null,
    2,
  ),
)

// Ensure clients exist (name match within branch) then insert sales via RPC
async function rpc(fn, body) {
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { ok: false, error: text.slice(0, 400) }
  }
  return { ok: res.ok && data?.ok !== false, status: res.status, data, text }
}

// Upsert missing clients via apply_customer_migration_batch (authenticated-only) —
// use import_franchise_profile_sales which resolves by name within branch.
const BATCH = 40
let inserted = 0
let rpcSkipped = 0
const errors = []

for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  const { ok, status, data, text } = await rpc('import_clinic_report_sales', {
    p_rows: slice,
  })
  if (!ok) {
    errors.push({ batch: i / BATCH + 1, status, error: data?.error || text.slice(0, 300) })
    console.error('batch failed', i / BATCH + 1, status, data?.error || text.slice(0, 200))
    break
  }
  inserted += Number(data.inserted || 0)
  rpcSkipped += Number(data.skipped || 0)
  console.log(`progress ${Math.min(i + BATCH, rows.length)}/${rows.length}`, {
    inserted,
    rpcSkipped,
  })
}

console.log(JSON.stringify({ inserted, rpcSkipped, errorCount: errors.length, errors }, null, 2))
if (errors.length) process.exit(1)
