import type { Sale } from '@/types'
import {
  buildClientsFromSales,
  recomputeClientSalesProfile,
  syncClientsFromImportedSales,
} from '@/services/clientSalesProfileService'
import { getClientById, saveClient } from '@/services/clientService'

const EXTRA_KEY = 'imajica_analytics_sales'
const CHANGE = 'imajica:analytics-changed'

let importedSales: Sale[] = []
let loadPromise: Promise<void> | null = null
let loaded = false

function emitChange() {
  window.dispatchEvent(new Event(CHANGE))
}

function readExtraSales(): Sale[] {
  try {
    const raw = localStorage.getItem(EXTRA_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Sale[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function mergeSales(): Sale[] {
  const importIds = new Set(importedSales.map((s) => s.id))
  const extra = readExtraSales().filter((s) => !importIds.has(s.id))
  return [...extra, ...importedSales].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function applyImported(data: Sale[]) {
  importedSales = data
  const clients = buildClientsFromSales(importedSales)
  syncClientsFromImportedSales(clients)
}

/** Load XLSX-derived sales JSON once; sync customer list from sales. */
export async function preloadSalesData(): Promise<void> {
  if (loaded) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    try {
      const res = await fetch('/data/sales-transactions.json')
      if (res.ok) {
        const data = (await res.json()) as Sale[]
        if (Array.isArray(data)) applyImported(data)
      } else {
        console.error('[sales] failed to fetch sales-transactions.json', res.status)
      }
    } catch (err) {
      console.error('[sales] preload failed', err)
      importedSales = []
    } finally {
      loaded = true
      emitChange()
    }
  })()

  return loadPromise
}

export function isSalesDataLoaded(): boolean {
  return loaded
}

export function getImportedSales(): Sale[] {
  return importedSales
}

/** All sales: imported JSON + future manual/booking extras in localStorage */
export function getSales(): Sale[] {
  return mergeSales()
}

export function subscribeSalesData(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === EXTRA_KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}

/** Future: booking checkout appends here and recomputes client profile */
export function appendExtraSale(sale: Sale): void {
  const extra = readExtraSales()
  extra.unshift(sale)
  localStorage.setItem(EXTRA_KEY, JSON.stringify(extra.slice(0, 500)))
  emitChange()
}

export function deleteExtraSale(id: string): void {
  const next = readExtraSales().filter((s) => s.id !== id)
  localStorage.setItem(EXTRA_KEY, JSON.stringify(next))
  emitChange()
}

/** Remove a whole booking group (same invoice / bookingRef) from live extras. */
export function deleteExtraSalesByBooking(bookingKey: string): void {
  const next = readExtraSales().filter((s) => {
    const key = s.bookingRef || s.invoiceNumber || s.id
    return key !== bookingKey
  })
  localStorage.setItem(EXTRA_KEY, JSON.stringify(next))
  emitChange()
}

export function recordSaleFromBooking(saleInput: Omit<Sale, 'id'>): Sale {
  const sale: Sale = {
    ...saleInput,
    id: `sale-live-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  }
  appendExtraSale(sale)
  const all = mergeSales()
  const client = getClientById(sale.clientId)
  if (client) {
    const profile = recomputeClientSalesProfile(client.id, all)
    saveClient({
      ...client,
      totalSpent: profile.contractValue,
      lastPurchaseAt: sale.createdAt,
      lastSaleId: sale.id,
      totalVisits: Math.max(client.totalVisits ?? 0, 1),
    })
  } else {
    const built = buildClientsFromSales(all).find((c) => c.id === sale.clientId)
    if (built) syncClientsFromImportedSales([built])
  }
  return sale
}

export type TodayBookingRow = {
  bookingKey: string
  bookingId: string
  patientName: string
  clientId: string
  services: string
  products: string
  staffName: string
  dateIso: string
  status: string
  payment: number
  paymentType: string
  paymentMethod: string
  branchId: string
  branchName: string
  saleIds: string[]
  isLive: boolean
}

function shortBookingId(sale: Sale): string {
  const ref = sale.bookingRef || sale.invoiceNumber || sale.id
  const digits = ref.replace(/\D/g, '')
  if (digits.length >= 4) return digits.slice(-4)
  return ref.slice(-6).toUpperCase()
}

function paymentTypeShort(raw?: string): string {
  const p = (raw || 'Full Payment').toLowerCase()
  if (p.includes('split')) return 'Split'
  if (p.includes('installment')) return 'Installment'
  if (p.includes('partial')) return 'Partial'
  return 'Full'
}

function paymentMethodLabel(method: Sale['paymentMethod']): string {
  const map: Record<string, string> = {
    cash: 'CASH',
    credit_card: 'CREDIT CARD',
    debit_card: 'DEBIT CARD',
    qr_ph: 'QRPH',
    owners_account: 'OWNERS ACCOUNT',
    gcash: 'GCASH',
    paymaya: 'PAYMAYA',
    paymongo: 'QRPH',
    bank_transfer: 'BANK TRANSFER',
    other: 'OTHER',
  }
  return map[method] || method.toUpperCase().replace(/_/g, ' ')
}

function formatServiceLine(sale: Sale): string {
  const name = sale.treatmentOrPackage || 'Item'
  if (sale.itemType === 'package') return `Package: ${name}`
  if (sale.itemType === 'service') return `Service: ${name}`
  return name
}

function localDateKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Group sales into booking rows (invoice / bookingRef). Optional day filter YYYY-MM-DD. */
export function getBookingRows(opts?: {
  dateKey?: string
  branchId?: string
}): TodayBookingRow[] {
  const sales = getSales().filter((s) => {
    if (opts?.branchId && s.branchId !== opts.branchId) return false
    if (opts?.dateKey && localDateKey(s.createdAt) !== opts.dateKey) return false
    return true
  })

  const groups = new Map<string, Sale[]>()
  for (const s of sales) {
    const key = s.bookingRef || s.invoiceNumber || s.id
    const list = groups.get(key) ?? []
    list.push(s)
    groups.set(key, list)
  }

  const rows: TodayBookingRow[] = []
  for (const [bookingKey, lines] of groups) {
    const sorted = [...lines].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const head = sorted[0]!
    const services = sorted
      .filter((l) => l.itemType !== 'product')
      .map(formatServiceLine)
    const products = sorted
      .filter((l) => l.itemType === 'product')
      .map((l) => l.treatmentOrPackage)
    const payment = sorted.reduce((sum, l) => sum + (l.totalAmount || 0), 0)
    const paid = sorted.every((l) => l.status === 'paid')
    rows.push({
      bookingKey,
      bookingId: shortBookingId(head),
      patientName: head.clientName,
      clientId: head.clientId,
      services: services.length ? services.join(', ') : 'N/A',
      products: products.length ? products.join(', ') : 'N/A',
      staffName: head.staffName || '—',
      dateIso: head.createdAt,
      status: paid ? 'Paid' : head.status === 'pending' ? 'Pending' : head.status,
      payment,
      paymentType: paymentTypeShort(head.paymentType),
      paymentMethod: paymentMethodLabel(head.paymentMethod),
      branchId: head.branchId,
      branchName: head.branchName,
      saleIds: sorted.map((l) => l.id),
      isLive: sorted.some((l) => l.id.startsWith('sale-live-')),
    })
  }

  return rows.sort((a, b) => b.dateIso.localeCompare(a.dateIso))
}

/** Line items belonging to one booking (invoice / bookingRef). */
export function getSalesForBooking(bookingKey: string): Sale[] {
  return getSales()
    .filter((s) => (s.bookingRef || s.invoiceNumber || s.id) === bookingKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function todayDateKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
