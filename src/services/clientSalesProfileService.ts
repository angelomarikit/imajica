import { PACKAGE_CATALOG_SEED } from '@/constants/packageCatalogSeed'
import { PRODUCT_CATALOG_SEED } from '@/constants/productCatalogSeed'
import { SERVICE_CATALOG_SEED } from '@/constants/serviceCatalogSeed'
import { resolveClinicBranchId } from '@/services/branchService'
import { compareClientsByRecentAvail, upsertClientsFromSalesImport } from '@/services/clientService'
import type { Client, Sale } from '@/types'

const CLIENTS_SYNC_FLAG = 'imajica_sales_import_v2_clients'

const BRANCH_IDS: Record<string, string> = {
  'San Mateo, Rizal': '22222222-2222-2222-2222-222222222201',
  'Cainta, Rizal': '22222222-2222-2222-2222-222222222202',
  'Pasig City': '22222222-2222-2222-2222-222222222203',
  'Lipa, Batangas': '22222222-2222-2222-2222-222222222204',
  'Dasmariñas, Cavite': '22222222-2222-2222-2222-222222222205',
  'Dasmarinas, Cavite': '22222222-2222-2222-2222-222222222205',
  Dasma: '22222222-2222-2222-2222-222222222205',
  'Bacoor, Cavite': '22222222-2222-2222-2222-222222222206',
  Bacoor: '22222222-2222-2222-2222-222222222206',
}

export type CatalogMatch = {
  price: number
  sessions: number
  name: string
}

export type ClientAvailedLine = {
  id: string
  saleDate: string
  invoiceRef: string
  name: string
  type: 'Service' | 'Package'
  totalSessions: number
  completed: number
  remaining: number
  lastSession: string
  status: 'Active' | 'Paid'
  branchName: string
}

export type ClientProductPurchase = {
  id: string
  saleDate: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
  branchName: string
}

export type ClientInstallmentBalance = {
  id: string
  bookingId: string
  itemName: string
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  nextPayment: string
  status: 'pending' | 'paid'
  branchName: string
}

export type ClientSessionHistoryRow = {
  id: string
  dateLabel: string
  servicePackage: string
  sessionNumber: number
  staff: string
  statusLabel: string
  photos: string
}

function normKey(s: string) {
  return s
    .toUpperCase()
    .replace(/\s*\(X\d+\)\s*$/i, '')
    .replace(/[^A-Z0-9]/g, '')
}

function slugName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function clientIdFromName(name: string) {
  return `client-import-${slugName(name)}`
}

function normalizePersonName(value: string | undefined | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isInstallmentPayment(paymentType?: string) {
  const p = (paymentType || '').toLowerCase()
  return p.includes('installment') || p.includes('split') || p.includes('partial')
}

const catalogMatchCache = new Map<string, CatalogMatch | null>()

export function matchCatalog(name: string, itemType: Sale['itemType'], branchName: string): CatalogMatch | null {
  const cacheKey = `${itemType}|${branchName}|${name}`
  if (catalogMatchCache.has(cacheKey)) return catalogMatchCache.get(cacheKey) ?? null

  const key = normKey(name)
  const fuzzy = (a: string, b: string) => a.includes(b) || b.includes(a)
  let result: CatalogMatch | null = null
  if (itemType === 'package') {
    const row =
      PACKAGE_CATALOG_SEED.find(
        (p) =>
          (normKey(p.name) === key || fuzzy(normKey(p.name), key)) &&
          (!p.branch || p.branch === branchName),
      ) || PACKAGE_CATALOG_SEED.find((p) => normKey(p.name) === key || fuzzy(normKey(p.name), key))
    if (row) result = { price: row.price, sessions: row.sessions, name: row.name }
  } else if (itemType === 'service') {
    const row =
      SERVICE_CATALOG_SEED.find(
        (s) =>
          (normKey(s.name) === key || fuzzy(normKey(s.name), key)) &&
          (!s.branch || s.branch === branchName),
      ) ||
      SERVICE_CATALOG_SEED.find((s) => normKey(s.name) === key || fuzzy(normKey(s.name), key))
    if (row) result = { price: row.price, sessions: row.sessions, name: row.name }
  } else if (itemType === 'product') {
    const row = PRODUCT_CATALOG_SEED.find((p) => normKey(p.name) === key || normKey(p.sku) === key)
    if (row) result = { price: row.retailPrice, sessions: 1, name: row.name }
  }
  catalogMatchCache.set(cacheKey, result)
  return result
}

function entitlementKey(s: Sale) {
  return `${s.clientId}|${normKey(s.treatmentOrPackage)}|${s.branchName}|${s.itemType}`
}

function installmentGroupKey(s: Sale) {
  return `${s.clientId}|${s.bookingRef || s.invoiceNumber}|${normKey(s.treatmentOrPackage)}`
}

/** Sales for a client profile — match by id and/or display name (live checkout may remap ids). */
export function getClientSales(
  clientId: string,
  sales: Sale[],
  clientName?: string,
): Sale[] {
  const name = normalizePersonName(clientName)
  return sales.filter((s) => {
    if (clientId && s.clientId && s.clientId === clientId) return true
    if (name && normalizePersonName(s.clientName) === name) return true
    return false
  })
}

export function computeContractValue(clientId: string, sales: Sale[], clientName?: string): number {
  const rows = getClientSales(clientId, sales, clientName)
  const seen = new Map<string, number>()
  for (const s of rows) {
    const k = entitlementKey(s)
    if (seen.has(k)) continue
    const cat = matchCatalog(s.treatmentOrPackage, s.itemType, s.branchName)
    let contract = cat?.price ?? 0
    if (!contract) {
      const group = rows.filter((r) => entitlementKey(r) === k)
      contract = Math.max(...group.map((r) => r.totalAmount))
    }
    seen.set(k, contract)
  }
  return [...seen.values()].reduce((a, b) => a + b, 0)
}

export function buildClientsFromSales(sales: Sale[]): Client[] {
  const byClient = new Map<string, Sale[]>()
  for (const s of sales) {
    const id = s.clientId || clientIdFromName(s.clientName)
    if (!byClient.has(id)) byClient.set(id, [])
    byClient.get(id)!.push(s)
  }

  const clients: Client[] = []
  let codeSeq = 1
  for (const [id, rows] of byClient) {
    const name = rows[0]!.clientName
    const branchCounts = new Map<string, number>()
    for (const r of rows) {
      branchCounts.set(r.branchName, (branchCounts.get(r.branchName) || 0) + 1)
    }
    const preferredBranchName =
      [...branchCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'Pasig City'
    const dates = rows.map((r) => r.createdAt.slice(0, 10)).sort()
    const visitDates = new Set(dates)
    const serviceRows = rows.filter((r) => r.itemType === 'service' || r.itemType === 'package')
    const sortPool = serviceRows.length > 0 ? serviceRows : rows
    let latest = sortPool[0]!
    for (const r of sortPool) {
      if (r.createdAt > latest.createdAt) latest = r
      else if (r.createdAt === latest.createdAt && r.id > latest.id) latest = r
    }
    const lastPurchaseAt = latest.createdAt
    const lastSaleId = latest.id
    // Session slots from service/package lines (catalog sessions, one entitlement per item)
    const entitlementSessions = new Map<string, number>()
    for (const r of rows) {
      if (r.itemType !== 'service' && r.itemType !== 'package') continue
      const ek = entitlementKey(r)
      if (entitlementSessions.has(ek)) continue
      const cat = matchCatalog(r.treatmentOrPackage, r.itemType, r.branchName)
      entitlementSessions.set(ek, cat?.sessions ?? 1)
    }
    const sessionsCount = [...entitlementSessions.values()].reduce((a, b) => a + b, 0)

    clients.push({
      id,
      code: `MJ-${String(codeSeq++).padStart(6, '0')}`,
      fullName: name,
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: 'prefer_not_to_say',
      address: '',
      preferredBranchId:
        resolveClinicBranchId(preferredBranchName) ||
        BRANCH_IDS[preferredBranchName] ||
        BRANCH_IDS['Pasig City']!,
      preferredBranchName,
      status: 'active',
      isVip: false,
      registeredAt: dates[0] || new Date().toISOString().slice(0, 10),
      lastPurchaseAt,
      lastSaleId,
      sessionsCount,
      totalVisits: visitDates.size,
      totalSpent: computeContractValue(id, rows),
      membershipLabel: 'Member',
    })
  }
  // Most recent purchase / registration first (never A–Z)
  return clients.sort(compareClientsByRecentAvail)
}

export function syncClientsFromImportedSales(clients: Client[]): void {
  try {
    if (localStorage.getItem(CLIENTS_SYNC_FLAG) === 'done') {
      upsertClientsFromSalesImport(clients)
      return
    }
    upsertClientsFromSalesImport(clients)
    localStorage.setItem(CLIENTS_SYNC_FLAG, 'done')
  } catch {
    upsertClientsFromSalesImport(clients)
  }
}

export function getAvailedServices(
  clientId: string,
  sales: Sale[],
  clientName?: string,
): ClientAvailedLine[] {
  const rows = getClientSales(clientId, sales, clientName).filter(
    (s) => s.itemType === 'service' || s.itemType === 'package',
  )
  const groups = new Map<string, Sale[]>()
  for (const s of rows) {
    const k = entitlementKey(s)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }

  const out: ClientAvailedLine[] = []
  for (const [k, group] of groups) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const first = group[0]!
    const cat = matchCatalog(first.treatmentOrPackage, first.itemType, first.branchName)
    // Packages/services: catalog sessions × quantity from checkout line
    const qty = Math.max(1, first.quantity ?? 1)
    const totalSessions = Math.max(1, (cat?.sessions ?? 1) * qty)
    const hasPending = group.some((g) => g.status === 'pending' || isInstallmentPayment(g.paymentType))
    out.push({
      id: k,
      saleDate: first.createdAt.slice(0, 10),
      invoiceRef: first.bookingRef || first.invoiceNumber,
      name: first.treatmentOrPackage,
      type: first.itemType === 'package' ? 'Package' : 'Service',
      totalSessions,
      completed: 0,
      remaining: totalSessions,
      lastSession: 'N/A',
      status: hasPending ? 'Active' : 'Paid',
      branchName: first.branchName,
    })
  }
  return out.sort((a, b) => b.saleDate.localeCompare(a.saleDate))
}

export function getPurchasedProducts(
  clientId: string,
  sales: Sale[],
  clientName?: string,
): ClientProductPurchase[] {
  return getClientSales(clientId, sales, clientName)
    .filter((s) => s.itemType === 'product')
    .map((s) => ({
      id: s.id,
      saleDate: s.createdAt.slice(0, 10),
      productName: s.treatmentOrPackage,
      quantity: s.quantity ?? 1,
      unitPrice: s.unitRetailPrice ?? s.totalAmount / Math.max(1, s.quantity ?? 1),
      total: s.totalAmount,
      branchName: s.branchName,
    }))
    .sort((a, b) => b.saleDate.localeCompare(a.saleDate))
}

export function getInstallmentBalances(
  clientId: string,
  sales: Sale[],
  clientName?: string,
): ClientInstallmentBalance[] {
  const rows = getClientSales(clientId, sales, clientName).filter((s) =>
    isInstallmentPayment(s.paymentType),
  )
  const groups = new Map<string, Sale[]>()
  for (const s of rows) {
    const k = installmentGroupKey(s)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(s)
  }

  const out: ClientInstallmentBalance[] = []
  for (const [k, group] of groups) {
    group.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const first = group[0]!
    const cat = matchCatalog(first.treatmentOrPackage, first.itemType, first.branchName)
    const paidAmount = group
      .filter((g) => g.status === 'paid')
      .reduce((sum, g) => sum + g.totalAmount, 0)
    // Pending installment lines still count as paid-toward if status is pending but money was collected as downpayment
    const collectedAmount = group.reduce((sum, g) => sum + g.totalAmount, 0)
    const paymentSum = collectedAmount
    const totalAmount = cat?.price ?? Math.max(paymentSum, paidAmount)
    // For live checkout: first payment is the amount paid now; remaining = contract - collected
    const remainingAmount = Math.max(0, Math.round((totalAmount - paymentSum) * 100) / 100)
    const shortId = (first.bookingRef || first.invoiceNumber || first.id).replace(/\D/g, '')
    out.push({
      id: k,
      bookingId: shortId.length >= 4 ? shortId.slice(-4) : (first.bookingRef || first.invoiceNumber).slice(-6),
      itemName: first.treatmentOrPackage,
      totalAmount,
      paidAmount: paymentSum,
      remainingAmount,
      nextPayment: remainingAmount > 0 ? 'Pending' : '—',
      status: remainingAmount > 0 ? 'pending' : 'paid',
      branchName: first.branchName,
    })
  }
  return out.sort((a, b) => b.totalAmount - a.totalAmount)
}

export function getSessionHistory(
  clientId: string,
  sales: Sale[],
  clientName?: string,
): ClientSessionHistoryRow[] {
  const clientSales = getClientSales(clientId, sales, clientName)
  const availed = getAvailedServices(clientId, clientSales, clientName)
  return getSessionHistoryFromAvailed(clientSales, availed)
}

export function recomputeClientSalesProfile(
  clientId: string,
  sales: Sale[],
  clientName?: string,
) {
  // One pass over the full sales list, then derive all tabs from the client subset
  const rows = getClientSales(clientId, sales, clientName)
  const availed = getAvailedServices(clientId, rows, clientName)
  return {
    contractValue: computeContractValue(clientId, rows, clientName),
    availed,
    products: getPurchasedProducts(clientId, rows, clientName),
    installments: getInstallmentBalances(clientId, rows, clientName),
    sessions: getSessionHistoryFromAvailed(rows, availed),
    sessionsCount: availed.reduce((sum, a) => sum + a.totalSessions, 0),
  }
}

function getSessionHistoryFromAvailed(
  clientSales: Sale[],
  availed: ClientAvailedLine[],
): ClientSessionHistoryRow[] {
  const rows: ClientSessionHistoryRow[] = []
  for (const a of availed) {
    const related = clientSales
      .filter(
        (s) =>
          (s.itemType === 'service' || s.itemType === 'package') &&
          normKey(s.treatmentOrPackage) === normKey(a.name) &&
          s.branchName === a.branchName,
      )
      .sort((x, y) => x.createdAt.localeCompare(y.createdAt))
    const purchase = related[0]

    for (let n = 1; n <= a.totalSessions; n++) {
      rows.push({
        id: `${a.id}-sess-${n}`,
        dateLabel: 'Not Used',
        servicePackage: a.name,
        sessionNumber: n,
        staff: purchase?.staffName || purchase?.doctorName || '—',
        statusLabel: 'USE',
        photos: '—',
      })
    }
  }
  return rows
}

let enrichCacheKey = ''
let enrichCacheValue: Sale[] = []

/** Mark first sale per client for New Client Sales report */
export function enrichFirstClientFlags(sales: Sale[]): Sale[] {
  if (!sales.length) return sales
  const key = `${sales.length}:${sales[0]?.id}:${sales[sales.length - 1]?.id}:${sales[Math.floor(sales.length / 2)]?.id ?? ''}`
  if (key === enrichCacheKey && enrichCacheValue.length === sales.length) {
    return enrichCacheValue
  }

  // Single O(n) pass — avoid sorting a full copy of ~10k+ sales on every call
  const firstByClient = new Map<string, { id: string; at: string }>()
  for (const s of sales) {
    const prev = firstByClient.get(s.clientId)
    if (!prev || s.createdAt < prev.at || (s.createdAt === prev.at && s.id < prev.id)) {
      firstByClient.set(s.clientId, { id: s.id, at: s.createdAt })
    }
  }
  const firstIds = new Set([...firstByClient.values()].map((v) => v.id))
  const enriched = sales.map((s) => ({
    ...s,
    isFirstClientSale: firstIds.has(s.id),
    leadSource: s.leadSource || 'Walk-In',
  }))
  enrichCacheKey = key
  enrichCacheValue = enriched
  return enriched
}
