import type { ProductBranchStock, ProductStockHistoryEntry } from '@/types'
import { getBranches } from '@/services/branchService'

const STOCKS_KEY = 'imajica_product_branch_stocks'
const HISTORY_KEY = 'imajica_product_stock_history'
const CHANGE = 'imajica:product-stock-changed'

type StockMap = Record<string, Array<{ branchId: string; stock: number; restockPoint: number }>>

function emit() {
  window.dispatchEvent(new Event(CHANGE))
}

function readStocks(): StockMap {
  try {
    const raw = localStorage.getItem(STOCKS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StockMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStocks(map: StockMap) {
  localStorage.setItem(STOCKS_KEY, JSON.stringify(map))
  emit()
}

function readHistory(): ProductStockHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProductStockHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeHistory(rows: ProductStockHistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows))
  emit()
}

/** Clinic branches shown on product stock UIs (exclude warehouse). */
export function getProductStockBranches() {
  return getBranches().filter((b) => b.status === 'active' && b.branchType !== 'warehouse')
}

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function defaultStockFor(productId: string, branchId: string, branchIndex: number): number {
  const h = hashSeed(`${productId}:${branchId}`)
  // Most branches start empty; occasionally seed a positive qty for demo realism
  if (branchIndex === 0 && h % 3 === 0) return (h % 70) + 10
  if (h % 11 === 0) return (h % 40) + 1
  return 0
}

function ensureProductStockRows(productId: string) {
  const map = readStocks()
  const branches = getProductStockBranches()
  const existing = map[productId] ?? []
  const byId = new Map(existing.map((r) => [r.branchId, r]))
  let changed = false
  const next = branches.map((b, i) => {
    const row = byId.get(b.id)
    if (row) return row
    changed = true
    return {
      branchId: b.id,
      stock: defaultStockFor(productId, b.id, i),
      restockPoint: 0,
    }
  })
  if (changed || !map[productId]) {
    map[productId] = next
    writeStocks(map)
  }
  return next
}

export function getProductBranchStocks(productId: string): ProductBranchStock[] {
  const rows = ensureProductStockRows(productId)
  const branches = getProductStockBranches()
  return branches.map((b) => {
    const row = rows.find((r) => r.branchId === b.id)
    return {
      branchId: b.id,
      branchName: b.name.replace(/ Branch$/, ''),
      stock: row?.stock ?? 0,
      restockPoint: row?.restockPoint ?? 0,
    }
  })
}

export function saveProductBranchStocks(
  productId: string,
  rows: Array<{ branchId: string; stock: number; restockPoint: number }>,
) {
  const map = readStocks()
  map[productId] = rows.map((r) => ({
    branchId: r.branchId,
    stock: Math.max(0, Math.floor(r.stock)),
    restockPoint: Math.max(0, Math.floor(r.restockPoint)),
  }))
  writeStocks(map)
}

function ensureDemoHistory(productId: string) {
  const all = readHistory()
  if (all.some((h) => h.productId === productId)) return
  const stocks = getProductBranchStocks(productId)
  const withStock = stocks.find((s) => s.stock > 0) ?? stocks[0]
  if (!withStock) return

  const now = Date.now()
  const seed: ProductStockHistoryEntry[] = []
  let qty = withStock.stock
  for (let i = 0; i < Math.min(8, Math.max(2, withStock.stock)); i++) {
    const prev = qty + 1
    const next = qty
    const bookingRef = String(8300 + (hashSeed(productId) % 200) - i)
    seed.push({
      id: `psh-${productId}-${i}`,
      productId,
      branchId: withStock.branchId,
      branchName: withStock.branchName,
      createdAt: new Date(now - i * 36e5 * 3 - (i % 3) * 12e5).toISOString(),
      previousQty: prev,
      newQty: next,
      adjustment: next - prev,
      movementType: 'booking deduction',
      reference: bookingRef,
      notes: `Product deducted from booking #${bookingRef} (Quantity: 1)`,
    })
    qty = prev
  }
  // Oldest zero-baseline rows like the screenshot
  seed.push({
    id: `psh-${productId}-base`,
    productId,
    branchId: withStock.branchId,
    branchName: withStock.branchName,
    createdAt: new Date(now - 30 * 864e5).toISOString(),
    previousQty: 0,
    newQty: 0,
    adjustment: 0,
    movementType: 'booking deduction',
    reference: String(8200 + (hashSeed(productId) % 50)),
    notes: `Product deducted from booking #${8200 + (hashSeed(productId) % 50)} (Quantity: 0)`,
  })
  writeHistory([...seed, ...all])
}

export function getProductStockHistory(
  productId: string,
  branchId?: string,
): ProductStockHistoryEntry[] {
  ensureDemoHistory(productId)
  return readHistory()
    .filter((h) => h.productId === productId && (!branchId || h.branchId === branchId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addProductStockHistory(entry: Omit<ProductStockHistoryEntry, 'id'>) {
  const row: ProductStockHistoryEntry = {
    ...entry,
    id: `psh-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  }
  writeHistory([row, ...readHistory()])
  return row
}

export function subscribeProductStock(listener: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === STOCKS_KEY || e.key === HISTORY_KEY) listener()
  }
  window.addEventListener(CHANGE, listener)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE, listener)
    window.removeEventListener('storage', onStorage)
  }
}
