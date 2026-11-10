/**
 * One-shot: read IMAJICA PRODUCT & SERVICES LIST 2026.xlsx → replace seed TS files.
 */
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const xlsxPath = path.join(root, 'data', 'imajica-product-services-list-2026.xlsx')
const srcXlsx = 'C:/Users/Toptier/Downloads/IMAJICA PRODUCT & SERVICES LIST 2026.xlsx'

fs.mkdirSync(path.join(root, 'data'), { recursive: true })
if (fs.existsSync(srcXlsx)) {
  fs.copyFileSync(srcXlsx, xlsxPath)
}

const wb = XLSX.readFile(xlsxPath)

function esc(s) {
  return String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
}
function trimName(s) {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}
function skuFrom(name, i) {
  const prefix = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase() || 'PRD'
  return `${prefix}-${String(1000 + i).padStart(4, '0')}`
}
function norm(s) {
  return trimName(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

const prodRows = XLSX.utils
  .sheet_to_json(wb.Sheets.PRODUCTS, { defval: '' })
  .map((r) => ({
    name: trimName(r['PRODUCT NAME']),
    retailPrice: Number(r['RETAIL PRICE']),
  }))
  .filter((r) => r.name && !Number.isNaN(r.retailPrice))
const seenProd = new Set()
const products = []
for (const r of prodRows) {
  const k = norm(r.name)
  if (seenProd.has(k)) continue
  seenProd.add(k)
  products.push(r)
}

const svcSheet = XLSX.utils.sheet_to_json(wb.Sheets.SERVICES, { header: 1, defval: '' })
const services = []
const seenSvc = new Set()
for (const r of svcSheet.slice(2)) {
  const name = trimName(r[0])
  if (!name) continue
  const k = norm(name)
  if (seenSvc.has(k)) continue
  seenSvc.add(k)
  services.push({
    name,
    sessions: Math.max(1, Number(r[1]) || 1),
    price: Number(r[2]) || 0,
  })
}

const pkgSheet = XLSX.utils.sheet_to_json(wb.Sheets.PACKAGES, { header: 1, defval: '' })
const packages = []
const seenPkg = new Set()
for (const r of pkgSheet.slice(2)) {
  const name = trimName(r[0])
  if (!name) continue
  const k = norm(name)
  if (seenPkg.has(k)) continue
  seenPkg.add(k)
  packages.push({
    name,
    freeItems: trimName(r[1]),
    sessions: Math.max(1, Number(r[2]) || 1),
    price: Number(r[3]) || 0,
  })
}

const consSheet = XLSX.utils.sheet_to_json(wb.Sheets.CONSUMABLES, { header: 1, defval: '' })
const catMeta = [
  { col: 0, title: trimName(consSheet[0]?.[0]) || 'SKIN CARE' },
  { col: 2, title: trimName(consSheet[0]?.[2]) || 'FACIAL CONSUMABLES' },
  { col: 4, title: trimName(consSheet[0]?.[4]) || 'MEDICAL CONSUMABLES' },
  { col: 6, title: trimName(consSheet[0]?.[6]) || 'CLINIC CONSUMABLES' },
]
const consumables = []
const seenCons = new Set()
for (const r of consSheet.slice(2)) {
  for (const c of catMeta) {
    const name = trimName(r[c.col])
    if (!name) continue
    const k = `${norm(c.title)}::${norm(name)}`
    if (seenCons.has(k)) continue
    seenCons.add(k)
    consumables.push({ name, categoryName: c.title, stock: 0 })
  }
}

function parseParts(freeItems) {
  return freeItems
    .split('+')
    .map((p) => trimName(p))
    .filter(Boolean)
}
function matchServiceIndex(part) {
  const cleaned = part
    .replace(/^\d+\s*/, '')
    .replace(/\(\s*\d+\s*SESSIONS?\s*\)/gi, '')
    .replace(/\b\d+\s*SESSIONS?\b/gi, '')
    .replace(/\bSESSION\b/gi, '')
    .replace(/\bFREE\b/gi, '')
    .trim()
  const n = norm(cleaned)
  if (!n) return -1
  let idx = services.findIndex((s) => norm(s.name) === n)
  if (idx >= 0) return idx
  idx = services.findIndex((s) => {
    const sn = norm(s.name)
    return sn.includes(n) || n.includes(sn)
  })
  if (idx >= 0) return idx
  const tokens = n.split(' ').filter((t) => t.length > 2)
  let best = -1
  let bestScore = 0
  services.forEach((s, i) => {
    const sn = norm(s.name)
    const st = sn.split(' ')
    const score = tokens.filter((t) => st.includes(t) || sn.includes(t)).length
    if (score > bestScore && score >= Math.min(2, tokens.length)) {
      bestScore = score
      best = i
    }
  })
  return best
}

const packageMatched = packages.map((p) => {
  const parts = parseParts(p.freeItems)
  const matchedIndexes = []
  const unmatched = []
  for (const part of parts) {
    const i = matchServiceIndex(part)
    if (i >= 0) matchedIndexes.push(i)
    else unmatched.push(part)
  }
  return { ...p, matchedIndexes: [...new Set(matchedIndexes)], unmatched }
})

fs.writeFileSync(
  path.join(root, 'src/constants/productCatalogSeed.ts'),
  `/** Product catalog seed — IMAJICA PRODUCT & SERVICES LIST 2026 (replace). */

export type ProductSeedRow = {
  name: string
  sku: string
  retailPrice: number
  baseCost: number
  branchName?: string
  categoryName?: string
  status?: 'active' | 'inactive'
}

export const PRODUCT_CATALOG_SEED: ProductSeedRow[] = [
${products
  .map(
    (p, i) =>
      `  { name: '${esc(p.name)}', sku: '${skuFrom(p.name, i + 1)}', retailPrice: ${p.retailPrice}, baseCost: ${p.retailPrice}, branchName: 'Global', categoryName: 'N/A', status: 'active' },`,
  )
  .join('\n')}
]
`,
)

fs.writeFileSync(
  path.join(root, 'src/constants/serviceCatalogSeed.ts'),
  `/** Service catalog seed — IMAJICA PRODUCT & SERVICES LIST 2026 (replace, all clinics). */

export type ServiceSeedRow = {
  name: string
  sessions: number
  branch: 'San Mateo, Rizal' | 'Cainta, Rizal' | 'Pasig City' | 'Warehouse' | 'Lipa, Batangas' | 'Dasmariñas, Cavite' | 'Bacoor, Cavite' | ''
  status: 'active' | 'inactive'
  price: number
}

export const SERVICE_CATALOG_SEED: ServiceSeedRow[] = [
${services
  .map(
    (s) =>
      `  { name: '${esc(s.name)}', sessions: ${s.sessions}, branch: '', status: 'active', price: ${s.price} },`,
  )
  .join('\n')}
]
`,
)

fs.writeFileSync(
  path.join(root, 'src/constants/bacoorServiceCatalogSeed.ts'),
  `/**
 * Bacoor franchise menu — aligned with org 2026 list (all clinics share one catalog).
 * Empty dedicated seed; booking uses globally available SERVICE_CATALOG_SEED.
 */
import type { ServiceSeedRow } from '@/constants/serviceCatalogSeed'

export const BACOOR_SERVICE_CATALOG_SEED: ServiceSeedRow[] = []
`,
)

fs.writeFileSync(
  path.join(root, 'src/constants/packageCatalogSeed.ts'),
  `/** Package catalog seed — IMAJICA PRODUCT & SERVICES LIST 2026 (replace, all clinics). */

export type PackageSeedRow = {
  name: string
  sessions: number
  branch: 'San Mateo, Rizal' | 'Cainta, Rizal' | 'Pasig City' | 'Warehouse' | 'Lipa, Batangas' | 'Dasmariñas, Cavite' | 'Bacoor, Cavite' | ''
  status: 'active' | 'inactive'
  price: number
  /** Spreadsheet FREE ITEMS / SERVICE INCLUDED text */
  freeItems?: string
  /** Matched SERVICE_CATALOG_SEED indexes (0-based) for includedTreatmentIds */
  includedServiceIndexes?: number[]
}

export const PACKAGE_CATALOG_SEED: PackageSeedRow[] = [
${packageMatched
  .map((p) => {
    const idxs = p.matchedIndexes.length ? `[${p.matchedIndexes.join(', ')}]` : '[]'
    return `  { name: '${esc(p.name)}', sessions: ${p.sessions}, branch: '', status: 'active', price: ${p.price}, freeItems: '${esc(p.freeItems)}', includedServiceIndexes: ${idxs} },`
  })
  .join('\n')}
]
`,
)

fs.writeFileSync(
  path.join(root, 'src/constants/consumableCatalogSeed.ts'),
  `/** Consumables catalog seed — IMAJICA PRODUCT & SERVICES LIST 2026 (replace). */

export type ConsumableSeedRow = {
  name: string
  stock: number
  price?: number
  branchName?: string
  /** Spreadsheet column title: Skin Care / Facial / Medical / Clinic */
  categoryName?: string
  /** ISO date yyyy-mm-dd */
  createdAt?: string
  reorderLevel?: number
}

export const CONSUMABLE_CATALOG_SEED: ConsumableSeedRow[] = [
${consumables
  .map(
    (c) =>
      `  { name: '${esc(c.name)}', stock: ${c.stock}, price: 0, branchName: 'Global', categoryName: '${esc(c.categoryName)}', createdAt: '2026-01-01', reorderLevel: 4 },`,
  )
  .join('\n')}
]
`,
)

fs.writeFileSync(
  path.join(root, 'data/catalog-2026.json'),
  JSON.stringify({ products, services, packages: packageMatched, consumables }, null, 2),
)

console.log(
  JSON.stringify(
    {
      products: products.length,
      services: services.length,
      packages: packages.length,
      consumables: consumables.length,
      cats: catMeta.map((c) => c.title),
      matchSample: packageMatched.slice(0, 5).map((p) => ({
        name: p.name,
        matched: p.matchedIndexes.map((i) => services[i].name),
        unmatched: p.unmatched,
      })),
    },
    null,
    2,
  ),
)
