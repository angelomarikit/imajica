/**
 * Import Availed_Services, Installment_Balances, Purchased_Products from
 * customers_bacoor.xlsx into sales linked to Bacoor clients.
 *
 * Usage: node scripts/apply-bacoor-profile-sales.mjs [path-to-xlsx]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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
  return !s || s === '-' || s.toLowerCase() === 'n/a' || s.toLowerCase() === 'null'
}
function asText(v) {
  return isBlank(v) ? '' : String(v).trim()
}
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
function num(v, fallback = 0) {
  if (isBlank(v)) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}
function parseDate(v) {
  const s = asText(v)
  if (!s) return new Date().toISOString()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return new Date(s).toISOString()
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}
function itemTypeOf(typeLabel, name) {
  const t = asText(typeLabel).toLowerCase()
  if (t.includes('product')) return 'product'
  if (t.includes('package') || /\bpackage\b/i.test(name)) return 'package'
  return 'service'
}

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
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
const availed = XLSX.utils.sheet_to_json(wb.Sheets.Availed_Services || {}, { defval: null })
const installments = XLSX.utils.sheet_to_json(wb.Sheets.Installment_Balances || {}, {
  defval: null,
})
const products = XLSX.utils.sheet_to_json(wb.Sheets.Purchased_Products || {}, { defval: null })

const rows = []
let missingPhone = 0

for (const r of availed) {
  const name = asText(r.package_or_service)
  if (!name) continue
  const pk = phoneKey(r.phone)
  if (!pk && !asText(r.full_name)) {
    missingPhone++
    continue
  }
  const invoiceRaw = asText(r.invoice_number) || `AVAIL-${asText(r.client_id) || pk}`
  const invoice = `BACOOR-SVC-${invoiceRaw}-${name.slice(0, 24).replace(/\s+/g, '')}`
  const totalSessions = Math.max(1, num(r.total_sessions, 1))
  const completed = Math.max(0, num(r.completed_sessions, 0))
  rows.push({
    phone_key: pk || null,
    full_name: asText(r.full_name) || null,
    branch_id: BACOOR,
    invoice_number: invoice.slice(0, 120),
    booking_ref: invoiceRaw,
    payment_type: 'Full Payment',
    status: 'paid',
    total_amount: 0,
    contract_amount: null,
    created_at: parseDate(r.purchase_date),
    item_name: name,
    item_type: itemTypeOf(r.type, name),
    quantity: totalSessions,
    unit_price: 0,
    line_total: 0,
    sessions_total: totalSessions,
    sessions_completed: completed,
    payment_method: 'cash',
    lead_source: 'Migration',
  })
}

for (const r of installments) {
  const name = asText(r.service_or_package)
  if (!name) continue
  const pk = phoneKey(r.phone)
  if (!pk && !asText(r.full_name)) {
    missingPhone++
    continue
  }
  const inv = asText(r.invoice_number) || asText(r.booking_id) || `INST-${pk}`
  const invoice = `BACOOR-INST-${inv}`
  const totalAmount = num(r.total_amount, 0)
  const paidAmount = num(r.paid_amount, 0)
  rows.push({
    phone_key: pk || null,
    full_name: asText(r.full_name) || null,
    branch_id: BACOOR,
    invoice_number: invoice.slice(0, 120),
    booking_ref: inv,
    payment_type: 'Installment',
    status: 'paid',
    total_amount: paidAmount,
    contract_amount: totalAmount > 0 ? totalAmount : paidAmount,
    created_at: new Date().toISOString(),
    item_name: name,
    item_type: itemTypeOf('', name),
    quantity: 1,
    unit_price: paidAmount,
    line_total: paidAmount,
    sessions_total: null,
    sessions_completed: null,
    payment_method: 'cash',
    lead_source: 'Migration',
  })
}

for (const r of products) {
  const name = asText(r.product_name)
  if (!name) continue
  const pk = phoneKey(r.phone)
  if (!pk && !asText(r.full_name)) {
    missingPhone++
    continue
  }
  const invRaw = asText(r.invoice_number)
  const invoice = `BACOOR-PRD-${invRaw || pk}-${asText(r.purchase_date).replace(/\W+/g, '')}-${name.slice(0, 20).replace(/\s+/g, '')}`
  const qty = Math.max(1, num(r.quantity, 1))
  const total = num(r.total, 0)
  const unit = num(r.unit_price, total / qty)
  rows.push({
    phone_key: pk || null,
    full_name: asText(r.full_name) || null,
    branch_id: BACOOR,
    invoice_number: invoice.slice(0, 120),
    booking_ref: invRaw || invoice,
    payment_type: 'Full Payment',
    status: 'paid',
    total_amount: total,
    contract_amount: null,
    created_at: parseDate(r.purchase_date),
    item_name: name,
    item_type: 'product',
    quantity: qty,
    unit_price: unit,
    line_total: total,
    sessions_total: null,
    sessions_completed: null,
    payment_method: 'cash',
    lead_source: 'Migration',
  })
}

console.log(
  JSON.stringify({
    availed: availed.length,
    installments: installments.length,
    products: products.length,
    prepared: rows.length,
    missingPhone,
  }),
)

const BATCH = 40
let inserted = 0
let skipped = 0
const errors = []

for (let i = 0; i < rows.length; i += BATCH) {
  const slice = rows.slice(i, i + BATCH)
  const res = await fetch(`${url}/rest/v1/rpc/import_franchise_profile_sales`, {
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
  inserted += Number(data.inserted || 0)
  skipped += Number(data.skipped || 0)
  console.log(`progress ${Math.min(i + BATCH, rows.length)}/${rows.length}`, {
    inserted,
    skipped,
  })
}

console.log(JSON.stringify({ inserted, skipped, errorCount: errors.length, errors: errors.slice(0, 2) }, null, 2))
if (errors.length) process.exit(1)
