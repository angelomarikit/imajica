import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const d = JSON.parse(fs.readFileSync(path.join(root, 'data/catalog-2026.json'), 'utf8'))

function esc(s) {
  return String(s ?? '').replace(/'/g, "''")
}

const clinicIds = [
  '22222222-2222-2222-2222-222222222201',
  '22222222-2222-2222-2222-222222222202',
  '22222222-2222-2222-2222-222222222203',
  '22222222-2222-2222-2222-222222222204',
  '22222222-2222-2222-2222-222222222205',
  '22222222-2222-2222-2222-222222222206',
]

function svcUuid(i) {
  return `a2026000-0001-4000-8000-${String(i + 1).padStart(12, '0')}`
}
function pkgUuid(i) {
  return `a2026000-0002-4000-8000-${String(i + 1).padStart(12, '0')}`
}
function prodUuid(i) {
  return `a2026000-0003-4000-8000-${String(i + 1).padStart(12, '0')}`
}
function conUuid(i) {
  return `a2026000-0004-4000-8000-${String(i + 1).padStart(12, '0')}`
}

const lines = []
lines.push('-- Replace org catalog with IMAJICA PRODUCT & SERVICES LIST 2026 (all 6 clinics).')
lines.push('-- Soft-deactivate prior active rows, then upsert 2026 products/services/packages/consumables.')
lines.push('')
lines.push('alter table public.consumables add column if not exists category_name text;')
lines.push(
  "comment on column public.consumables.category_name is 'Spreadsheet group: Skin Care / Facial / Medical / Clinic Consumables';",
)
lines.push('')
lines.push(
  "update public.treatments set status = 'inactive', updated_at = now() where coalesce(status, 'active') = 'active';",
)
lines.push(
  "update public.packages set status = 'inactive', updated_at = now() where coalesce(status, 'active') = 'active';",
)
lines.push(
  "update public.inventory_items set status = 'inactive' where coalesce(is_retail_product, true) = true and coalesce(status, 'active') = 'active';",
)
lines.push('')
lines.push('-- Treatments (services) — available_globally for all clinics')
for (let i = 0; i < d.services.length; i++) {
  const s = d.services[i]
  const id = svcUuid(i)
  lines.push(`insert into public.treatments (
  id, name, description, duration_minutes, price, status, sessions,
  default_branch_id, available_globally, updated_at
) values (
  '${id}'::uuid, '${esc(s.name)}', '2026 catalog', ${Math.max(30, s.sessions * 30)}, ${s.price}, 'active', ${s.sessions},
  null, true, now()
)
on conflict (id) do update set
  name = excluded.name,
  price = excluded.price,
  sessions = excluded.sessions,
  status = 'active',
  description = excluded.description,
  available_globally = true,
  updated_at = now();`)
}
lines.push('')
lines.push('-- branch_treatments for all 6 clinics')
for (let i = 0; i < d.services.length; i++) {
  const id = svcUuid(i)
  for (const bid of clinicIds) {
    lines.push(`insert into public.branch_treatments (branch_id, treatment_id)
values ('${bid}'::uuid, '${id}'::uuid)
on conflict do nothing;`)
  }
}
lines.push('')
lines.push('-- Packages')
for (let i = 0; i < d.packages.length; i++) {
  const p = d.packages[i]
  const id = pkgUuid(i)
  lines.push(`insert into public.packages (
  id, name, type, description, regular_price, sessions, validity_months, status, free_items, default_branch_id, updated_at
) values (
  '${id}'::uuid, '${esc(p.name)}', 'package', '${esc(p.freeItems || '')}', ${p.price}, ${p.sessions}, 6, 'active', '${esc(p.freeItems || '')}', null, now()
)
on conflict (id) do update set
  name = excluded.name,
  regular_price = excluded.regular_price,
  sessions = excluded.sessions,
  free_items = excluded.free_items,
  description = excluded.description,
  status = 'active',
  updated_at = now();`)
}
lines.push('')
lines.push("delete from public.package_items where package_id::text like 'a2026000-0002-%';")
for (let i = 0; i < d.packages.length; i++) {
  const p = d.packages[i]
  const pid = pkgUuid(i)
  for (const si of p.matchedIndexes || []) {
    lines.push(`insert into public.package_items (package_id, treatment_id, quantity)
values ('${pid}'::uuid, '${svcUuid(si)}'::uuid, 1)
on conflict do nothing;`)
  }
}
lines.push('')
lines.push('-- Retail products (inventory_items)')
for (let i = 0; i < d.products.length; i++) {
  const p = d.products[i]
  const id = prodUuid(i)
  const sku =
    (p.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'PRD') +
    '-' +
    String(1000 + i + 1)
  lines.push(`insert into public.inventory_items (
  id, name, sku, category, unit_cost, selling_price, status, is_retail_product
) values (
  '${id}'::uuid, '${esc(p.name)}', '${esc(sku)}', 'N/A', ${p.retailPrice}, ${p.retailPrice}, 'active', true
)
on conflict (id) do update set
  name = excluded.name,
  sku = excluded.sku,
  unit_cost = excluded.unit_cost,
  selling_price = excluded.selling_price,
  status = 'active',
  is_retail_product = true;`)
}
lines.push('')
lines.push('-- Consumables')
for (let i = 0; i < d.consumables.length; i++) {
  const c = d.consumables[i]
  const id = conUuid(i)
  lines.push(`insert into public.consumables (
  id, name, stock, reorder_level, price, branch_id, branch_label, category_name, updated_at
) values (
  '${id}'::uuid, '${esc(c.name)}', 0, 4, 0, null, 'Global', '${esc(c.categoryName)}', now()
)
on conflict (id) do update set
  name = excluded.name,
  category_name = excluded.category_name,
  branch_label = 'Global',
  updated_at = now();`)
}

const out = path.join(root, 'supabase/migrations/20261111000104_catalog_2026_replace_all_clinics.sql')
fs.writeFileSync(out, lines.join('\n') + '\n')
console.log('wrote', out, 'lines', lines.length)
