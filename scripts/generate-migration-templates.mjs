import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import * as XLSX from 'xlsx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const require = createRequire(import.meta.url)

const DASH = '-'

const sales = require(path.join(root, 'public/data/sales-transactions.json'))
const seedMod = fs.readFileSync(path.join(root, 'src/constants/clientProfileSeed.ts'), 'utf8')

const seed = []
const blockRe =
  /fullName:\s*'([^']+)'[\s\S]*?email:\s*'([^']+)'[\s\S]*?phone:\s*'([^']+)'[\s\S]*?gender:\s*'([^']+)'[\s\S]*?dateOfBirth:\s*'([^']+)'[\s\S]*?sessionsCount:\s*(\d+)/g
let m
while ((m = blockRe.exec(seedMod))) {
  seed.push({
    fullName: m[1],
    email: m[2],
    phone: m[3],
    gender: m[4],
    dateOfBirth: m[5],
    sessionsCount: Number(m[6]),
  })
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '')
}

function csvEscape(v) {
  const s = String(v ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function titleCaseName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ')
}

/** Empty / missing → "-" so data entry staff always see a value */
function cell(v) {
  if (v == null) return DASH
  const s = String(v).trim()
  return s === '' ? DASH : s
}

function isInstallmentPayment(paymentType) {
  const p = String(paymentType || '').toLowerCase()
  return p.includes('installment') || p.includes('downpayment') || p.includes('down payment')
}

function shortBookingId(row) {
  const raw = String(row.bookingRef || row.invoiceNumber || row.id || '')
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 4) return digits.slice(-4)
  return raw.slice(-6) || DASH
}

const seedByName = new Map(seed.map((s) => [norm(s.fullName), s]))

const byClient = new Map()
for (const s of sales) {
  const id = s.clientId || `name:${norm(s.clientName)}`
  if (!byClient.has(id)) byClient.set(id, [])
  byClient.get(id).push(s)
}

const patients = []
for (const [id, rows] of byClient) {
  const rawName = rows[0].clientName
  const key = norm(rawName)
  const profile = seedByName.get(key)
  const branchCounts = new Map()
  let totalSpent = 0
  const visitDates = new Set()
  for (const r of rows) {
    branchCounts.set(r.branchName, (branchCounts.get(r.branchName) || 0) + 1)
    totalSpent += Number(r.totalAmount) || 0
    visitDates.add(String(r.createdAt).slice(0, 10))
  }
  const branch = [...branchCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  patients.push({
    full_name: profile?.fullName || titleCaseName(rawName),
    phone: cell(profile?.phone),
    email: cell(profile?.email),
    gender: cell(profile?.gender),
    birthdate: cell(profile?.dateOfBirth),
    address: DASH,
    branch: cell(branch),
    total_spent: Math.round(totalSpent * 100) / 100,
    total_visits: visitDates.size,
    notes: profile ? 'profile from screenshot seed' : 'from sales import — fill missing fields',
    client_id: id,
  })
}

const patientKeys = new Set(patients.map((p) => norm(p.full_name)))
for (const profile of seed) {
  const key = norm(profile.fullName)
  if (patientKeys.has(key)) continue
  patients.push({
    full_name: profile.fullName,
    phone: cell(profile.phone),
    email: cell(profile.email),
    gender: cell(profile.gender),
    birthdate: cell(profile.dateOfBirth),
    address: DASH,
    branch: DASH,
    total_spent: DASH,
    total_visits: DASH,
    notes: 'profile from screenshot seed (not in sales import)',
    client_id: `client-seed-${key}`,
  })
  patientKeys.add(key)
}
patients.sort((a, b) => a.full_name.localeCompare(b.full_name))

const patientHeader = [
  'full_name',
  'phone',
  'email',
  'gender',
  'birthdate',
  'address',
  'branch',
  'total_spent',
  'total_visits',
  'notes',
  'client_id',
]

/** Availed Services — matches Services & Products tab */
const packages = []
/** Purchased Products */
const products = []
/** Installment Balances */
const installments = []

for (const [id, rows] of byClient) {
  const rawName = rows[0].clientName
  const key = norm(rawName)
  const profile = seedByName.get(key)
  const displayName = profile?.fullName || titleCaseName(rawName)
  const phone = cell(profile?.phone)

  // Availed services / packages
  const svcGroups = new Map()
  for (const r of rows) {
    if (r.itemType !== 'service' && r.itemType !== 'package') continue
    const gk = [r.bookingRef || '', r.treatmentOrPackage || '', r.itemType || ''].join('|')
    if (!svcGroups.has(gk)) svcGroups.set(gk, [])
    svcGroups.get(gk).push(r)
  }
  for (const [, g] of svcGroups) {
    const r = g[0]
    const qty = g.reduce((sum, x) => sum + (Number(x.quantity) || 1), 0)
    packages.push({
      full_name: displayName,
      phone,
      purchase_date: cell(String(r.createdAt).slice(0, 10)),
      invoice_number: cell(r.invoiceNumber),
      package_or_service: cell(r.treatmentOrPackage),
      type: r.itemType === 'package' ? 'Package' : 'Service',
      total_sessions: qty || DASH,
      completed_sessions: DASH,
      remaining_sessions: DASH,
      last_session: DASH,
      status: 'Active',
      branch: cell(r.branchName),
      notes: 'Fill completed/remaining from old system; use - if none',
      client_id: id,
    })
  }

  // Products
  for (const r of rows) {
    if (r.itemType !== 'product') continue
    const qty = Number(r.quantity) || 1
    const unit = Number(r.unitRetailPrice) || Number(r.totalAmount) / qty || 0
    products.push({
      full_name: displayName,
      phone,
      purchase_date: cell(String(r.createdAt).slice(0, 10)),
      product_name: cell(r.treatmentOrPackage),
      quantity: qty,
      unit_price: Math.round(unit * 100) / 100,
      total: Math.round((Number(r.totalAmount) || 0) * 100) / 100,
      branch: cell(r.branchName),
      invoice_number: cell(r.invoiceNumber),
      notes: DASH,
      client_id: id,
    })
  }

  // Installments
  const instRows = rows.filter((r) => isInstallmentPayment(r.paymentType))
  const instGroups = new Map()
  for (const r of instRows) {
    const gk = [
      r.bookingRef || r.invoiceNumber || '',
      r.treatmentOrPackage || '',
      r.branchName || '',
    ].join('|')
    if (!instGroups.has(gk)) instGroups.set(gk, [])
    instGroups.get(gk).push(r)
  }
  for (const [, group] of instGroups) {
    group.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
    const first = group[0]
    const paidAmount = Math.round(
      group.reduce((sum, g) => sum + (Number(g.totalAmount) || 0), 0) * 100,
    ) / 100
    installments.push({
      full_name: displayName,
      phone,
      booking_id: cell(shortBookingId(first)),
      service_or_package: cell(first.treatmentOrPackage),
      total_amount: DASH,
      paid_amount: paidAmount || DASH,
      remaining_amount: DASH,
      next_payment: DASH,
      status: 'pending',
      branch: cell(first.branchName),
      invoice_number: cell(first.invoiceNumber),
      notes: 'Confirm total / remaining / next payment on old system; use - if none',
      client_id: id,
    })
  }
}

packages.sort(
  (a, b) =>
    a.full_name.localeCompare(b.full_name) ||
    String(a.purchase_date).localeCompare(String(b.purchase_date)),
)
products.sort(
  (a, b) =>
    a.full_name.localeCompare(b.full_name) ||
    String(a.purchase_date).localeCompare(String(b.purchase_date)),
)
installments.sort((a, b) => a.full_name.localeCompare(b.full_name))

const pkgHeader = [
  'full_name',
  'phone',
  'purchase_date',
  'invoice_number',
  'package_or_service',
  'type',
  'total_sessions',
  'completed_sessions',
  'remaining_sessions',
  'last_session',
  'status',
  'branch',
  'notes',
  'client_id',
]
const productHeader = [
  'full_name',
  'phone',
  'purchase_date',
  'product_name',
  'quantity',
  'unit_price',
  'total',
  'branch',
  'invoice_number',
  'notes',
  'client_id',
]
const installmentHeader = [
  'full_name',
  'phone',
  'booking_id',
  'service_or_package',
  'total_amount',
  'paid_amount',
  'remaining_amount',
  'next_payment',
  'status',
  'branch',
  'invoice_number',
  'notes',
  'client_id',
]

function toCsv(rows, header) {
  return [header.join(',')]
    .concat(rows.map((p) => header.map((h) => csvEscape(p[h])).join(',')))
    .join('\n')
}

const outDir = path.join(root, 'public/templates')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'patients_import_prefilled.csv'), `\uFEFF${toCsv(patients, patientHeader)}`)
fs.writeFileSync(path.join(outDir, 'packages_import_prefilled.csv'), `\uFEFF${toCsv(packages, pkgHeader)}`)
fs.writeFileSync(path.join(outDir, 'products_import_prefilled.csv'), `\uFEFF${toCsv(products, productHeader)}`)
fs.writeFileSync(
  path.join(outDir, 'installments_import_prefilled.csv'),
  `\uFEFF${toCsv(installments, installmentHeader)}`,
)

const wb = XLSX.utils.book_new()

function addSheet(name, rows, header) {
  const sheet = XLSX.utils.json_to_sheet(rows, { header })
  sheet['!cols'] = header.map((h) => ({ wch: Math.min(40, Math.max(14, h.length + 2)) }))
  XLSX.utils.book_append_sheet(wb, sheet, name)
}

addSheet('Patients', patients, patientHeader)
addSheet('Availed_Services', packages, pkgHeader)
addSheet('Purchased_Products', products, productHeader)
addSheet('Installment_Balances', installments, installmentHeader)

const instructions = [
  {
    step: 1,
    instruction:
      'IMPORTANT: If a field has no data from the old system, type a single dash: -  Do not leave cells blank.',
  },
  {
    step: 2,
    instruction: 'Patients sheet = Patient Profile (name, phone, email, gender, birthdate, address, branch).',
  },
  {
    step: 3,
    instruction:
      'Availed_Services sheet = Services & Products → packages/services (total / completed / remaining sessions, last session, status).',
  },
  {
    step: 4,
    instruction: 'Purchased_Products sheet = retail products bought (quantity, price, total).',
  },
  {
    step: 5,
    instruction:
      'Installment_Balances sheet = booking id, service/package, TOTAL AMOUNT, PAID AMOUNT, REMAINING, NEXT PAYMENT, status. Some clients have installments — fill these so nothing is missing on import.',
  },
  {
    step: 6,
    instruction:
      'Prefilled values come from Imajica sales + screenshot profiles. Replace "-" only when you have real data from the old screens.',
  },
  {
    step: 7,
    instruction: 'Do not rename column headers. Keep client_id as-is.',
  },
  {
    step: 8,
    instruction: 'When finished, save this Excel file and send/upload for import into Imajica.',
  },
]
addSheet('Instructions', instructions, ['step', 'instruction'])

const xlsxPath = path.join(outDir, 'customer_migration_prefilled.xlsx')
XLSX.writeFile(wb, xlsxPath)

const readme = `# Customer migration templates

Prefilled from existing Imajica sales import + screenshot profile seed.

## Main file (Excel)

| File | Sheets |
|---|---|
| \`customer_migration_prefilled.xlsx\` | Patients, Availed_Services, Purchased_Products, Installment_Balances, Instructions |

## Rule for missing data

**If there is no value for a parameter, enter \`-\` (dash).** Do not leave cells empty.

## Sheets

1. **Patients** — Patient Profile tab  
2. **Availed_Services** — packages/services (sessions)  
3. **Purchased_Products** — products bought  
4. **Installment_Balances** — total amount, paid amount, remaining, next payment, status  
5. **Instructions** — full notes for data-entry staff  

## Already filled (where known)

- Customer names, branch, spend/visits from sales  
- Phone / email / gender / birthdate for screenshot-seeded profiles  
- Service/package/product lines + invoice/date from sales  
- Installment rows detected from installment/downpayment sales (paid_amount partial; confirm total/remaining/next payment)

## Usually still need checking on old system

- address  
- completed_sessions / remaining_sessions / last_session  
- installment total_amount, remaining_amount, next_payment  
`

fs.writeFileSync(path.join(outDir, 'README.md'), readme)

console.log(
  JSON.stringify(
    {
      patients: patients.length,
      availedServices: packages.length,
      products: products.length,
      installments: installments.length,
      seedProfiles: seed.length,
      xlsx: xlsxPath,
    },
    null,
    2,
  ),
)
