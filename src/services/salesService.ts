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

export function recordSaleFromBooking(saleInput: Omit<Sale, 'id'>): Sale {
  const sale: Sale = {
    ...saleInput,
    id: `sale-live-${Date.now()}`,
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
    })
  } else {
    const built = buildClientsFromSales(all).find((c) => c.id === sale.clientId)
    if (built) syncClientsFromImportedSales([built])
  }
  return sale
}
