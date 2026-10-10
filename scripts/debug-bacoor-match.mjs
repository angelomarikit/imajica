import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import XLSX from 'xlsx'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACOOR = '22222222-2222-2222-2222-222222222206'

function loadEnv() {
  const out = {}
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
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

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY

const headers = { apikey: key, Authorization: `Bearer ${key}` }

const countRes = await fetch(
  `${url}/rest/v1/clients?preferred_branch_id=eq.${BACOOR}&select=id`,
  { headers: { ...headers, Prefer: 'count=exact', Range: '0-0' } },
)
console.log('bacoor clients content-range', countRes.headers.get('content-range'))
console.log('bacoor clients body sample', await countRes.text())

const allRes = await fetch(
  `${url}/rest/v1/clients?preferred_branch_id=eq.${BACOOR}&select=id,full_name,phone&limit=1000`,
  { headers },
)
const clients = await allRes.json()
console.log('fetched clients', Array.isArray(clients) ? clients.length : clients)

const salesCount = await fetch(`${url}/rest/v1/sales?branch_id=eq.${BACOOR}&select=id`, {
  headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
})
console.log('bacoor sales content-range', salesCount.headers.get('content-range'))

const xlsxPath = process.argv[2] || 'C:/Users/Toptier/Downloads/customers_bacoor (1).xlsx'
const wb = XLSX.readFile(xlsxPath)
const cust = XLSX.utils.sheet_to_json(wb.Sheets.Customers || {}, { defval: null })
const svc = XLSX.utils.sheet_to_json(wb.Sheets.Availed_Services || {}, { defval: null })

const dbPhones = new Set(
  (Array.isArray(clients) ? clients : []).map((c) => phoneKey(c.phone)).filter(Boolean),
)
const excelPhones = new Set(cust.map((c) => phoneKey(c.contact_number || c.phone)).filter(Boolean))
const svcPhones = new Set(svc.map((c) => phoneKey(c.phone)).filter(Boolean))

let phoneHits = 0
for (const p of svcPhones) if (dbPhones.has(p)) phoneHits++

console.log({
  excelCustomers: cust.length,
  excelServices: svc.length,
  dbClients: Array.isArray(clients) ? clients.length : 0,
  dbPhones: dbPhones.size,
  excelCustomerPhones: excelPhones.size,
  svcPhones: svcPhones.size,
  svcPhoneHitsInDb: phoneHits,
  sampleDb: (Array.isArray(clients) ? clients : []).slice(0, 3),
  sampleExcelCust: cust.slice(0, 3).map((c) => ({
    name: c.full_name,
    phone: c.contact_number || c.phone,
    key: phoneKey(c.contact_number || c.phone),
  })),
  sampleSvc: svc.slice(0, 3).map((c) => ({
    name: c.full_name,
    phone: c.phone,
    key: phoneKey(c.phone),
  })),
})
