import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
function loadEnv() {
  const out = {}
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
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
const base = env.VITE_SUPABASE_URL.replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY

const login = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'bacoor@imajica.com', password: 'Imajica123' }),
})
const { access_token: token, error } = await login.json()
if (!token) {
  console.error('login failed', error)
  process.exit(1)
}

const res = await fetch(`${base}/rest/v1/rpc/branch_dashboard_sales_summary`, {
  method: 'POST',
  headers: {
    apikey: key,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    p_branch_id: '22222222-2222-2222-2222-222222222206',
    p_from: '2026-10-01',
    p_to: '2026-10-11',
    p_today: '2026-10-11',
  }),
})
console.log(res.status, await res.text())
