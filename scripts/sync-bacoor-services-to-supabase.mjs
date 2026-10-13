/**
 * Upsert Bacoor franchise service menu into public.treatments + branch_treatments.
 * Source: src/constants/bacoorServiceCatalogSeed.ts (compiled list from franchise screenshots).
 *
 * Usage: node scripts/sync-bacoor-services-to-supabase.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BACOOR_ID = '22222222-2222-2222-2222-222222222206'

function loadEnv() {
  const out = {}
  const envPath = path.join(ROOT, '.env')
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

/** Minimal parse of BACOOR_SERVICE_CATALOG_SEED object literals */
function loadBacoorSeed() {
  const src = fs.readFileSync(
    path.join(ROOT, 'src/constants/bacoorServiceCatalogSeed.ts'),
    'utf8',
  )
  const block = src.match(
    /export const BACOOR_SERVICE_CATALOG_SEED: ServiceSeedRow\[\] = \[([\s\S]*?)\]\s*$/m,
  )
  if (!block) throw new Error('Could not find BACOOR_SERVICE_CATALOG_SEED')
  const rows = []
  const re =
    /\{\s*name:\s*'((?:\\'|[^'])*)'\s*,\s*sessions:\s*(\d+)\s*,\s*branch:\s*BACOOR_BRANCH\s*,\s*status:\s*'(active|inactive)'\s*,\s*price:\s*(\d+)\s*\}/g
  let m
  while ((m = re.exec(block[1]))) {
    rows.push({
      name: m[1].replace(/\\'/g, "'"),
      sessions: Number(m[2]),
      status: m[3],
      price: Number(m[4]),
    })
  }
  // Multiline name entries
  const reMulti =
    /\{\s*name:\s*'((?:\\'|[^'])*)'\s*,\s*sessions:\s*(\d+)\s*,\s*branch:\s*BACOOR_BRANCH\s*,\s*status:\s*'(active|inactive)'\s*,\s*price:\s*(\d+)\s*,?\s*\}/gs
  // Already covered. Also handle template-ish multiline:
  const reLong =
    /name:\s*'((?:\\'|[^'])*)'\s*,\s*sessions:\s*(\d+)\s*,\s*branch:\s*BACOOR_BRANCH\s*,\s*status:\s*'(active|inactive)'\s*,\s*price:\s*(\d+)/g
  const seen = new Set(rows.map((r) => `${r.name}|${r.sessions}|${r.price}|${r.status}`))
  while ((m = reLong.exec(block[1]))) {
    const row = {
      name: m[1].replace(/\\'/g, "'"),
      sessions: Number(m[2]),
      status: m[3],
      price: Number(m[4]),
    }
    const k = `${row.name}|${row.sessions}|${row.price}|${row.status}`
    if (!seen.has(k)) {
      seen.add(k)
      rows.push(row)
    }
  }
  return rows
}

const env = loadEnv()
const url = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const key = env.VITE_SUPABASE_ANON_KEY || ''
if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const rows = loadBacoorSeed()
console.log(JSON.stringify({ prepared: rows.length }, null, 2))

async function rest(pathname, { method = 'GET', body, prefer } = {}) {
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
  if (prefer) headers.Prefer = prefer
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { ok: res.ok, status: res.status, data }
}

// Fetch existing Bacoor-scoped treatments
const existing = await rest(
  `treatments?or=(default_branch_id.eq.${BACOOR_ID})&select=id,name,sessions,price,status`,
)
if (!existing.ok) {
  console.error('Failed to list treatments', existing.status, existing.data)
  process.exit(1)
}

function nameKey(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

const byKey = new Map()
for (const t of existing.data || []) {
  byKey.set(`${nameKey(t.name)}|${t.sessions}`, t)
}

let updated = 0
let inserted = 0
let linked = 0
const errors = []

for (const row of rows) {
  const key = `${nameKey(row.name)}|${row.sessions}`
  const found = byKey.get(key)
  if (found) {
    const patch = await rest(`treatments?id=eq.${found.id}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        price: row.price,
        status: row.status,
        sessions: row.sessions,
        default_branch_id: BACOOR_ID,
        available_globally: false,
        updated_at: new Date().toISOString(),
      },
    })
    if (!patch.ok) {
      errors.push({ action: 'update', name: row.name, err: patch.data })
      continue
    }
    updated++
    const link = await rest('branch_treatments', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: { branch_id: BACOOR_ID, treatment_id: found.id },
    })
    if (link.ok || link.status === 409) linked++
  } else {
    const create = await rest('treatments', {
      method: 'POST',
      prefer: 'return=representation',
      body: {
        name: row.name,
        description: 'Bacoor franchise menu',
        duration_minutes: Math.max(30, row.sessions * 30),
        price: row.price,
        status: row.status,
        sessions: row.sessions,
        default_branch_id: BACOOR_ID,
        available_globally: false,
      },
    })
    if (!create.ok || !Array.isArray(create.data) || !create.data[0]) {
      errors.push({ action: 'insert', name: row.name, err: create.data })
      continue
    }
    const id = create.data[0].id
    inserted++
    byKey.set(key, { id, name: row.name, sessions: row.sessions })
    const link = await rest('branch_treatments', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: { branch_id: BACOOR_ID, treatment_id: id },
    })
    if (link.ok || link.status === 409) linked++
  }
}

console.log(JSON.stringify({ updated, inserted, linked, errorCount: errors.length, errors: errors.slice(0, 10) }, null, 2))
if (errors.length) process.exit(1)
