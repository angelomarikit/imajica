/**
 * Import sales from XLSX export → public/data/sales-transactions.json
 * Usage: node scripts/import-sales-from-xlsx.mjs [path-to-xlsx]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const defaultXlsx =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || '',
    'Downloads',
    'Sales_Transactions_all_20241201_20260930_2026-09-29 (1).xlsx',
  )

const BRANCH_IDS = {
  'San Mateo, Rizal': '22222222-2222-2222-2222-222222222201',
  'Cainta, Rizal': '22222222-2222-2222-2222-222222222202',
  'Pasig City': '22222222-2222-2222-2222-222222222203',
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

function parseDisplayDate(s) {
  const m = String(s).match(/^([A-Za-z]+)\s+(\d+),\s+(\d+)$/)
  if (!m) return '2026-01-01'
  const mon = MONTHS[m[1].slice(0, 3)]
  if (mon === undefined) return '2026-01-01'
  const d = new Date(Number(m[3]), mon, Number(m[2]))
  return d.toISOString().slice(0, 10)
}

function slugName(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function normalizeItemKey(name) {
  return String(name)
    .replace(/\s*\(x\d+\)\s*$/i, '')
    .trim()
    .toUpperCase()
}

function parseQty(name) {
  const m = String(name).match(/\(x(\d+)\)\s*$/i)
  return m ? Number(m[1]) : 1
}

function mapType(t) {
  const x = String(t).toLowerCase()
  if (x === 'product') return 'product'
  if (x === 'package') return 'package'
  return 'service'
}

function mapStatus(s) {
  return String(s).toLowerCase() === 'paid' ? 'paid' : 'pending'
}

function episodeKey(customer, itemName, branch, dateIso) {
  return `${slugName(customer)}|${normalizeItemKey(itemName)}|${branch}|${dateIso}`
}

if (!fs.existsSync(defaultXlsx)) {
  console.error('XLSX not found:', defaultXlsx)
  process.exit(1)
}

const wb = XLSX.readFile(defaultXlsx)
const sheetName = wb.SheetNames.includes('Sales Data') ? 'Sales Data' : wb.SheetNames[0]
const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' })

/** First pass: episode booking refs (customer + item + branch + first sale date) */
const episodeFirstDate = new Map()
for (const r of rawRows) {
  const customer = String(r.Customer || '').trim()
  const branch = String(r.Branch || '').trim()
  const product = String(r['Service / Product'] || '').trim()
  const dateIso = parseDisplayDate(r.Date)
  const ek = `${slugName(customer)}|${normalizeItemKey(product)}|${branch}`
  const prev = episodeFirstDate.get(ek)
  if (!prev || dateIso < prev) episodeFirstDate.set(ek, dateIso)
}

const sales = rawRows.map((r, i) => {
  const customer = String(r.Customer || '').trim()
  const branchName = String(r.Branch || '').trim()
  const rawProduct = String(r['Service / Product'] || '').trim()
  const baseName = rawProduct.replace(/\s*\(x\d+\)\s*$/i, '').trim()
  const qty = parseQty(rawProduct)
  const dateIso = parseDisplayDate(r.Date)
  const ek = `${slugName(customer)}|${normalizeItemKey(rawProduct)}|${branchName}`
  const episodeDate = episodeFirstDate.get(ek) || dateIso
  const bookingRef = `${episodeDate.replace(/-/g, '')}-${String(i % 10000).padStart(4, '0')}`

  const amount = Math.round((Number(r.Amount) || 0) * 100) / 100
  const clientId = `client-import-${slugName(customer)}`
  const branchId = BRANCH_IDS[branchName] || BRANCH_IDS['Pasig City']

  return {
    id: `sale-import-${String(i + 1).padStart(5, '0')}`,
    invoiceNumber: `IMP-${String(i + 1).padStart(6, '0')}`,
    clientId,
    clientName: customer,
    branchId,
    branchName,
    staffName: String(r.Staff || '').trim() === 'N/A' ? undefined : String(r.Staff || '').trim(),
    treatmentOrPackage: baseName,
    itemType: mapType(r.Type),
    paymentType: String(r.Payment || 'Full Payment').trim(),
    bookingRef,
    quantity: qty,
    unitRetailPrice: qty > 0 ? Math.round((amount / qty) * 100) / 100 : amount,
    totalAmount: amount,
    paymentMethod: 'cash',
    status: mapStatus(r.Status),
    createdAt: `${dateIso}T12:00:00.000Z`,
    episodeKey: `${slugName(customer)}|${normalizeItemKey(rawProduct)}|${branchName}|${episodeDate}`,
  }
})

sales.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

const dates = sales.map((s) => s.createdAt.slice(0, 10)).sort()
const meta = {
  generatedAt: new Date().toISOString(),
  sourceFile: path.basename(defaultXlsx),
  rowCount: sales.length,
  dateMin: dates[0] || null,
  dateMax: dates[dates.length - 1] || null,
  uniqueCustomers: new Set(sales.map((s) => s.clientName)).size,
}

const outDir = path.join(root, 'public', 'data')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'sales-transactions.json'), JSON.stringify(sales))
fs.writeFileSync(path.join(outDir, 'sales-import-meta.json'), JSON.stringify(meta, null, 2))

console.log('Imported', meta.rowCount, 'sales → public/data/sales-transactions.json')
console.log('Customers:', meta.uniqueCustomers, '|', meta.dateMin, '→', meta.dateMax)
