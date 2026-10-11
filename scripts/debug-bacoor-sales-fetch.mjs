import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

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

const env = loadEnv()
const base = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!base || !key) {
  console.error('Missing supabase env')
  process.exit(1)
}

async function tryLogin(email, password) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await res.json()
  return {
    status: res.status,
    access: j.access_token,
    err: j.error_description || j.msg || j.error || null,
  }
}

const emails = ['bacoor@imajica.com', 'imajicabacoor@gmail.com', 'bacoor@gmail.com']
const passwords = ['Imajica123', 'password123', 'Imajica@123']

let token = null
for (const email of emails) {
  for (const password of passwords) {
    const r = await tryLogin(email, password)
    console.log('login', email, password, r.status, r.err || 'ok')
    if (r.access) {
      token = r.access
      break
    }
  }
  if (token) break
}
if (!token) {
  console.error('NO LOGIN')
  process.exit(1)
}

const branch = '22222222-2222-2222-2222-222222222206'
const lean =
  'id,client_id,branch_id,total_amount,status,created_at,invoice_number,payment_type,contract_amount,' +
  'sale_items(id,name,quantity,unit_price,line_total,item_type,sku,sessions_total,sessions_completed),' +
  'payments(payment_method,payment_status)'
const rich = `${lean},clients!client_id(full_name),branches!branch_id(name)`

async function fetchSales(label, select) {
  const q = new URL(`${base}/rest/v1/sales`)
  q.searchParams.set('select', select)
  q.searchParams.set('branch_id', `eq.${branch}`)
  q.searchParams.set('order', 'created_at.desc')
  q.searchParams.set('limit', '5')
  const res = await fetch(q, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      Prefer: 'count=exact',
    },
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text.slice(0, 400)
  }
  console.log(
    label,
    res.status,
    'range',
    res.headers.get('content-range'),
    Array.isArray(data)
      ? {
          rows: data.length,
          firstAmount: data[0]?.total_amount,
          firstInvoice: data[0]?.invoice_number,
        }
      : data,
  )
}

await fetchSales('lean', lean)
await fetchSales('rich', rich)
await fetchSales(
  'bare',
  'id,branch_id,total_amount,status,created_at,invoice_number,payment_type',
)

// Simulate new header + batched items path
const headerSelect =
  'id,client_id,branch_id,staff_name,doctor_name,total_amount,status,created_at,invoice_number,payment_type,booking_ref,lead_source,referred_by_name,referred_by_client_id,contract_amount'
const hq = new URL(`${base}/rest/v1/sales`)
hq.searchParams.set('select', headerSelect)
hq.searchParams.set('branch_id', `eq.${branch}`)
hq.searchParams.set('order', 'created_at.desc')
hq.searchParams.set('limit', '1000')
const hRes = await fetch(hq, {
  headers: { apikey: key, Authorization: `Bearer ${token}`, Prefer: 'count=exact' },
})
const headers = await hRes.json()
console.log('headers', hRes.status, 'rows', Array.isArray(headers) ? headers.length : headers)
if (Array.isArray(headers) && headers.length) {
  const ids = headers.slice(0, 50).map((r) => r.id)
  const iq = new URL(`${base}/rest/v1/sale_items`)
  iq.searchParams.set(
    'select',
    'id,sale_id,name,quantity,unit_price,line_total,item_type,sku,sessions_total,sessions_completed',
  )
  iq.searchParams.set('sale_id', `in.(${ids.join(',')})`)
  const iRes = await fetch(iq, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  })
  const items = await iRes.json()
  console.log('items batch', iRes.status, Array.isArray(items) ? items.length : items)
  const sum = headers.reduce((n, r) => n + Number(r.total_amount || 0), 0)
  console.log('header page sum', sum)
}
