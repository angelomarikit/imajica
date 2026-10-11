/**
 * Sync Bacoor + Dasma clients / availed / installments / products from
 * Imajica Migration patient JSON cache → Supabase.
 *
 * Usage: node scripts/sync-franchise-from-migration.mjs [--branch=bacoor|dasma]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const MIGRATION =
  process.env.IMAJICA_MIGRATION_DIR ||
  path.join('C:/Users/Toptier/Desktop/Imajica Migration')

const BRANCHES = {
  bacoor: {
    slug: 'bacoor',
    id: '22222222-2222-2222-2222-222222222206',
    label: 'Bacoor, Cavite',
    prefix: 'BACOOR',
  },
  dasma: {
    slug: 'dasma',
    id: '22222222-2222-2222-2222-222222222205',
    label: 'Dasmariñas, Cavite',
    prefix: 'DASMA',
  },
}

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
  // scrape quirk: +6309… means +63 + 09…
  if (digits.startsWith('6309') && digits.length >= 13) digits = `63${digits.slice(3)}`
  else if (digits.startsWith('630') && digits.length >= 12) digits = `63${digits.slice(3)}`
  if (digits.startsWith('0') && digits.length >= 11) digits = digits.slice(1)
  if (digits.startsWith('63') && digits.length >= 12) digits = digits.slice(2)
  // mid-state 639XXXXXXXX (11) after bad 630 strip
  if (digits.startsWith('63') && digits.length === 11 && digits[2] === '9') digits = digits.slice(2)
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
function num(v, fallback = 0) {
  if (isBlank(v)) return fallback
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : fallback
}
function numOrNull(v) {
  if (isBlank(v)) return null
  const n = Number(String(v).replace(/[^\d.-]/g, ''))
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
  return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
function normKey(s) {
  return asText(s)
    .toUpperCase()
    .replace(/\s*\(X\d+\)\s*$/i, '')
    .replace(/[^A-Z0-9]/g, '')
}

function loadCatalogPrices() {
  const seedPath = path.join(ROOT, 'src/constants/productCatalogSeed.ts')
  const text = fs.readFileSync(seedPath, 'utf8')
  const prices = new Map()
  const re =
    /\{\s*name:\s*'((?:\\'|[^'])*)'[\s\S]*?retailPrice:\s*(\d+(?:\.\d+)?)/g
  let m
  while ((m = re.exec(text))) {
    prices.set(normKey(m[1].replace(/\\'/g, "'")), Number(m[2]))
  }
  // Common scrape aliases → catalog
  const aliases = [
    ['WHITENING SERUM', 'WHITENING SERUM'],
    ['WHITENING SERUM 15ML', 'WHITENING SERUM'],
    ['QUICK DRY', 'QUICK DRY TONER 60ML'],
    ['QUICK DRY TONER', 'QUICK DRY TONER 60ML'],
    ['TEA TREE LIQUID SOAP', 'TEA TREE LIQUID SOAP 60ML'],
    ['ANTI INFLAMMATORY', 'ANTI INFLAMMATORY HYDROCORTISONE'],
    ['NIA SERUM', 'MULTI VITAMIN SERUM'],
    ['NIACINAMIDE SERUM', 'MULTI VITAMIN SERUM'],
    ['NIA CLEANSER', 'ACNE CREAM 10G'],
    ['UNDERARM SERUM', 'UNDERARM CREAM 10G'],
    ['UNDERARM CARE SET', 'ACNE SET'],
    ['ACNE SET', 'ACNE SET'],
    ['VITAMIN C', 'MULTI VITAMIN SERUM'],
    ['GUAVA SERUM', 'GUAVA SERUM'],
    ['WHITENING SET', 'MELA SET'],
  ]
  for (const [from, to] of aliases) {
    const price = prices.get(normKey(to))
    if (price != null) prices.set(normKey(from), price)
  }
  return prices
}

function catalogUnit(prices, name, unit, total, qty) {
  if (unit > 0) return unit
  if (total > 0 && qty > 0) return total / qty
  const hit = prices.get(normKey(name))
  if (hit) return hit
  // fuzzy contains
  const key = normKey(name)
  for (const [k, p] of prices) {
    if (key.includes(k) || k.includes(key)) return p
  }
  return 0
}

function loadPatients(slug) {
  const dir = path.join(MIGRATION, 'data/branches', slug, 'patients')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      } catch {
        return null
      }
    })
    .filter((p) => p?.patientId && p?.profile)
    .sort((a, b) => Number(a.patientId) - Number(b.patientId))
}

async function rpc(url, key, fn, body) {
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

function buildClientRows(branch, patients) {
  const seenPhone = new Set()
  const seenEmail = new Set()
  const seenName = new Set()
  const rows = []
  for (const p of patients) {
    const fullName = asText(p.profile.fullName)
    if (!fullName) continue
    const phone = phoneE164(p.profile.contactNumber)
    const email = emailKey(p.profile.email)
    const nk = nameKey(fullName)
    const pk = phoneKey(phone || p.profile.contactNumber)
    if ((pk && seenPhone.has(pk)) || (email && seenEmail.has(email)) || (nk && seenName.has(nk))) {
      continue
    }
    if (pk) seenPhone.add(pk)
    if (email) seenEmail.add(email)
    if (nk) seenName.add(nk)
    rows.push({
      id: randomUUID(),
      full_name: fullName,
      phone: phone || null,
      email: email || null,
      gender: genderOf(p.profile.gender) || null,
      birthdate: parseBirth(p.profile.birthdate) || null,
      address: asText(p.profile.completeAddress) || null,
      preferred_branch_id: branch.id,
      admin_notes: `Legacy patient_id: ${p.patientId}`,
      total_spent: numOrNull(p.profile.totalAmountSpent),
      total_visits: null,
      phone_key: pk || null,
      email_key: email || null,
      name_key: nk || null,
    })
  }
  return rows
}

function buildSaleRows(branch, patients, prices) {
  const rows = []
  let pricedFromCatalog = 0
  let stillZero = 0

  for (const p of patients) {
    const fullName = asText(p.profile?.fullName)
    const pk = phoneKey(p.profile?.contactNumber)

    for (const a of p.availedServices || []) {
      const name = asText(a.packageOrService)
      if (!name) continue
      if (!pk && !fullName) continue
      const invoiceRaw = asText(a.invoiceNumber) || `AVAIL-${p.patientId || pk}`
      const invoice = `${branch.prefix}-SVC-${invoiceRaw}-${name.slice(0, 24).replace(/\s+/g, '')}`
      const totalSessions = Math.max(1, num(a.totalSessions, 1))
      const completed = Math.max(0, num(a.completedSessions, 0))
      rows.push({
        phone_key: pk || null,
        full_name: fullName || null,
        branch_id: branch.id,
        invoice_number: invoice.slice(0, 120),
        booking_ref: invoiceRaw,
        payment_type: 'Full Payment',
        status: 'paid',
        total_amount: 0,
        contract_amount: null,
        created_at: parseDate(a.purchaseDate),
        item_name: name,
        item_type: itemTypeOf(a.type, name),
        quantity: totalSessions,
        unit_price: 0,
        line_total: 0,
        sessions_total: totalSessions,
        sessions_completed: completed,
        payment_method: 'cash',
        lead_source: 'Migration',
      })
    }

    for (const r of p.installments || []) {
      const name = asText(r.servicePackage || r.service_or_package)
      if (!name) continue
      if (!pk && !fullName) continue
      const inv = asText(r.bookingId || r.invoiceNumber) || `INST-${pk || p.patientId}`
      const invoice = `${branch.prefix}-INST-${inv}`
      const totalAmount = num(r.totalAmount, 0)
      const paidAmount = num(r.paidAmount, 0)
      rows.push({
        phone_key: pk || null,
        full_name: fullName || null,
        branch_id: branch.id,
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

    for (const r of p.purchasedProducts || []) {
      const name = asText(r.productName || r.name)
      if (!name) continue
      if (!pk && !fullName) continue
      const qty = Math.max(1, num(r.quantity, 1))
      let total = num(r.total, 0)
      let unit = num(r.unitPrice, total / qty)
      if (unit <= 0 && total <= 0) {
        unit = catalogUnit(prices, name, 0, 0, qty)
        if (unit > 0) {
          total = unit * qty
          pricedFromCatalog++
        } else {
          stillZero++
        }
      }
      const invRaw = asText(r.invoiceNumber)
      const invoice = `${branch.prefix}-PRD-${invRaw || pk || p.patientId}-${asText(r.purchaseDate).replace(/\W+/g, '')}-${name.slice(0, 20).replace(/\s+/g, '')}`
      rows.push({
        phone_key: pk || null,
        full_name: fullName || null,
        branch_id: branch.id,
        invoice_number: invoice.slice(0, 120),
        booking_ref: invRaw || invoice,
        payment_type: 'Full Payment',
        status: 'paid',
        total_amount: total,
        contract_amount: null,
        created_at: parseDate(r.purchaseDate),
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
  }

  return { rows, pricedFromCatalog, stillZero }
}

async function syncBranch(url, key, branch, prices) {
  const patients = loadPatients(branch.slug)
  console.log(`\n=== ${branch.label} ===`)
  console.log(
    JSON.stringify({
      patients: patients.length,
      availed: patients.reduce((n, p) => n + (p.availedServices?.length || 0), 0),
      installments: patients.reduce((n, p) => n + (p.installments?.length || 0), 0),
      products: patients.reduce((n, p) => n + (p.purchasedProducts?.length || 0), 0),
    }),
  )

  const clientRows = buildClientRows(branch, patients)
  let cUpdated = 0
  let cInserted = 0
  let cSkipped = 0
  const BATCH = 40
  for (let i = 0; i < clientRows.length; i += BATCH) {
    const slice = clientRows.slice(i, i + BATCH)
    const { ok, status, data, text } = await rpc(url, key, 'apply_customer_migration_batch', {
      p_rows: slice,
    })
    if (!ok) {
      console.error('clients batch failed', i / BATCH + 1, status, data?.error || text.slice(0, 200))
      break
    }
    cUpdated += Number(data.updated || 0)
    cInserted += Number(data.inserted || 0)
    cSkipped += Number(data.skipped || 0)
    console.log(`clients ${Math.min(i + BATCH, clientRows.length)}/${clientRows.length}`, {
      cUpdated,
      cInserted,
      cSkipped,
    })
  }

  const { rows, pricedFromCatalog, stillZero } = buildSaleRows(branch, patients, prices)
  console.log(JSON.stringify({ saleRows: rows.length, pricedFromCatalog, stillZero }))

  let inserted = 0
  let skipped = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const { ok, status, data, text } = await rpc(url, key, 'import_franchise_profile_sales', {
      p_rows: slice,
    })
    if (!ok) {
      console.error('sales batch failed', i / BATCH + 1, status, data?.error || text.slice(0, 200))
      break
    }
    inserted += Number(data.inserted || 0)
    skipped += Number(data.skipped || 0)
    console.log(`sales ${Math.min(i + BATCH, rows.length)}/${rows.length}`, { inserted, skipped })
  }

  return {
    branch: branch.slug,
    patients: patients.length,
    clients: { prepared: clientRows.length, cUpdated, cInserted, cSkipped },
    sales: { prepared: rows.length, inserted, skipped, pricedFromCatalog, stillZero },
  }
}

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY || ''
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}
if (!fs.existsSync(path.join(MIGRATION, 'data/branches'))) {
  console.error('Migration data not found at', MIGRATION)
  process.exit(1)
}

const argBranch = process.argv.find((a) => a.startsWith('--branch='))?.slice('--branch='.length)
const selected = argBranch
  ? [BRANCHES[argBranch]].filter(Boolean)
  : [BRANCHES.bacoor, BRANCHES.dasma]
if (!selected.length) {
  console.error('Unknown branch. Use --branch=bacoor|dasma')
  process.exit(1)
}

const prices = loadCatalogPrices()
console.log('catalog prices loaded', prices.size)

const summaries = []
for (const branch of selected) {
  summaries.push(await syncBranch(url, key, branch, prices))
}
console.log('\nDONE')
console.log(JSON.stringify(summaries, null, 2))
